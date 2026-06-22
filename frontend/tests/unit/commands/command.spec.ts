/**
 * Unit Tests: Generic Command Class
 * 
 * Tests the Command pattern implementation (R017):
 * - Command is concrete (no subclass needed)
 * - addAndExecute() returns OperationResult with outputs
 * - Multi-operation command execution
 * - Operation chaining (use outputs from op1 in op2)
 * - commit(), rollback(), undo(), redo()
 * - ID stability across undo/redo
 * - Status transitions: Building → Committed → Undone
 * 
 * Reference: specs/001-dihedral-learning-mvp/tasks.md - R017
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Command, CommandStatus } from '@/commands/Command';
import type { IOperation, OperationResult } from '@/commands/operations/IOperation';
import type { OperationContext } from '@/commands/operations/OperationContext';
import type { World } from '@/domain/world/World';
import { Vector3 } from 'three';
import { AddFreePoint2DOp } from '@/commands/operations/world/AddFreePointOp';
import { createTestWorld } from '../../helpers/worldHelpers';
import { RuntimeChangePublisher } from '@/application/appShell/RuntimeChangePublisher';

// Mock operation for testing
class MockOperation implements IOperation {
  readonly type = 'MockOperation';
  parameters = {};
  outputs: Record<string, any> = {};
  
  applyCalled = false;
  undoCalled = false;
  shouldFail = false;
  shouldThrowOnUndo = false;
  outputValue: string;

  constructor(outputValue: string = 'test') {
    this.outputValue = outputValue;
  }

  apply(_context: OperationContext): OperationResult {
    this.applyCalled = true;
    
    if (this.shouldFail) {
      return {
        success: false,
        outputs: {},
        error: 'Mock operation failed'
      };
    }
    
    this.outputs = { mockData: this.outputValue };
    return {
      success: true,
      outputs: this.outputs
    };
  }

  undo(_context: OperationContext): void {
    this.undoCalled = true;
    if (this.shouldThrowOnUndo) {
      throw new Error(`Rollback failed for ${this.outputValue}`);
    }
  }

  serialize() {
    return { opType: this.type, outputValue: this.outputValue, outputs: this.outputs };
  }
}

// Mock operation that uses input from another operation's output
class DependentMockOperation implements IOperation {
  readonly type = 'DependentMockOperation';
  parameters: Record<string, any>;
  outputs: Record<string, any> = {};
  
  applyCalled = false;
  undoCalled = false;
  inputId: string;

  constructor(inputId: string) {
    this.inputId = inputId;
    this.parameters = { inputId };
  }

  apply(_context: OperationContext): OperationResult {
    this.applyCalled = true;
    
    this.outputs = { 
      resultId: `result_from_${this.inputId}`,
      processedInput: this.inputId 
    };
    return {
      success: true,
      outputs: this.outputs
    };
  }

  undo(_context: OperationContext): void {
    this.undoCalled = true;
  }
}

describe('Generic Command Class (R017)', () => {
  let world: World;
  let visibilityModel: VisibilityModel;
  let command: Command;
  let notifier: RuntimeChangePublisher;
  let operationContext: OperationContext;

  beforeEach(() => {
    const { world: w, visibilityModel: vm, operationContext: oc } = createTestWorld();
    world = w;
    visibilityModel = vm;
    operationContext = oc;
    notifier = new RuntimeChangePublisher();
    command = new Command('Test Command', operationContext, notifier);
  });

  describe('Concrete Command (no subclass needed)', () => {
    it('should be instantiable without subclassing', () => {
      const cmd = new Command('Direct instantiation', operationContext);
      expect(cmd).toBeInstanceOf(Command);
      expect(cmd.description).toBe('Direct instantiation');
    });

    it('should not require execute() method', () => {
      const cmd = new Command('No execute needed', operationContext);
      // Command is concrete - no execute() method required
      expect(cmd).not.toHaveProperty('execute');
    });
  });

  describe('Initialization', () => {
    it('should initialize with Building status', () => {
      expect(command.status).toBe(CommandStatus.Building);
    });

    it('should have unique ID', () => {
      const command2 = new Command('Another Command', operationContext);
      expect(command.id).not.toBe(command2.id);
    });

    it('should have timestamp', () => {
      expect(command.timestamp).toBeInstanceOf(Date);
    });

    it('should have description', () => {
      expect(command.description).toBe('Test Command');
    });
  });

  describe('addAndExecute - Returns OperationResult with outputs', () => {
    it('should return OperationResult with outputs', () => {
      const operation = new MockOperation('test_value');
      
      const result = command.addAndExecute(operation);
      
      expect(result.success).toBe(true);
      expect(result.outputs).toEqual({ mockData: 'test_value' });
    });

    it('should execute operation immediately', () => {
      const operation = new MockOperation();
      
      const result = command.addAndExecute(operation);
      
      expect(result.success).toBe(true);
      expect(operation.applyCalled).toBe(true);
    });

    it('should store operation for undo', () => {
      const op1 = new MockOperation();
      const op2 = new MockOperation();
      
      command.addAndExecute(op1);
      command.addAndExecute(op2);
      
      // Both operations should be stored
      expect(command['operations']).toHaveLength(2);
      expect(command['operations'][0]).toBe(op1);
      expect(command['operations'][1]).toBe(op2);
    });

    it('should rollback on operation failure', () => {
      const op1 = new MockOperation();
      const op2 = new MockOperation();
      op2.shouldFail = true;
      
      command.addAndExecute(op1);
      
      // Second operation fails
      expect(() => {
        command.addAndExecute(op2);
      }).toThrow('Mock operation failed');
      
      // First operation should be rolled back
      expect(op1.undoCalled).toBe(true);
      
      // Command should have no operations after rollback
      expect(command['operations']).toHaveLength(0);
      expect(command.status).toBe(CommandStatus.Building);
    });

    it('should notify subscribers when rollback undoes applied operations', () => {
      const listener = vi.fn();
      notifier.subscribeToChanges(listener);
      const op1 = new MockOperation();
      const op2 = new MockOperation();
      op2.shouldFail = true;

      command.addAndExecute(op1);
      expect(listener).toHaveBeenCalledTimes(1);

      expect(() => command.addAndExecute(op2)).toThrow('Mock operation failed');

      expect(op1.undoCalled).toBe(true);
      expect(listener).toHaveBeenCalledTimes(2);
    });

    it('should not notify subscribers when rollback has nothing to undo', () => {
      const listener = vi.fn();
      notifier.subscribeToChanges(listener);

      command.rollback();

      expect(listener).not.toHaveBeenCalled();
    });

    it('should not allow adding operations after commit', () => {
      const operation = new MockOperation();
      command.addAndExecute(operation);
      command.commit();
      
      const operation2 = new MockOperation();
      
      expect(() => {
        command.addAndExecute(operation2);
      }).toThrow('Cannot add operations to non-building command');
    });
  });

  describe('Multi-operation command execution', () => {
    it('should execute multiple operations in sequence', () => {
      const op1 = new MockOperation('value1');
      const op2 = new MockOperation('value2');
      const op3 = new MockOperation('value3');
      
      const result1 = command.addAndExecute(op1);
      const result2 = command.addAndExecute(op2);
      const result3 = command.addAndExecute(op3);
      
      expect(result1.outputs.mockData).toBe('value1');
      expect(result2.outputs.mockData).toBe('value2');
      expect(result3.outputs.mockData).toBe('value3');
      
      expect(command['operations']).toHaveLength(3);
    });

    it('should commit all operations as single atomic command', () => {
      const op1 = new MockOperation();
      const op2 = new MockOperation();
      
      command.addAndExecute(op1);
      command.addAndExecute(op2);
      command.commit();
      
      expect(command.status).toBe(CommandStatus.Committed);
      expect(command['operations']).toHaveLength(2);
    });

    it('should undo all operations when undoing multi-op command', () => {
      const op1 = new MockOperation();
      const op2 = new MockOperation();
      const op3 = new MockOperation();
      
      command.addAndExecute(op1);
      command.addAndExecute(op2);
      command.addAndExecute(op3);
      command.commit();
      
      command.undo();
      
      expect(op1.undoCalled).toBe(true);
      expect(op2.undoCalled).toBe(true);
      expect(op3.undoCalled).toBe(true);
    });
  });

  describe('Operation chaining (use outputs from op1 in op2)', () => {
    it('should chain operations using outputs', () => {
      // First operation produces an ID
      const op1 = new MockOperation('first_id');
      const result1 = command.addAndExecute(op1);
      const generatedId = result1.outputs.mockData;
      
      // Second operation uses that ID as input
      const op2 = new DependentMockOperation(generatedId);
      const result2 = command.addAndExecute(op2);
      
      expect(result2.outputs.resultId).toBe('result_from_first_id');
      expect(result2.outputs.processedInput).toBe('first_id');
    });

    it('should demonstrate real-world chaining pattern', () => {
      // Simulates: Create 2 points, then create segment using those point IDs
      const createPoint1 = new MockOperation('point_1');
      const createPoint2 = new MockOperation('point_2');
      
      const r1 = command.addAndExecute(createPoint1);
      const r2 = command.addAndExecute(createPoint2);
      
      const pointId1 = r1.outputs.mockData;
      const pointId2 = r2.outputs.mockData;
      
      // Create segment using the two point IDs
      const createSegment = new DependentMockOperation(`${pointId1},${pointId2}`);
      const r3 = command.addAndExecute(createSegment);
      
      expect(r3.outputs.processedInput).toBe('point_1,point_2');
      expect(command['operations']).toHaveLength(3);
    });
  });

  describe('ID stability across undo/redo', () => {
    it('should preserve IDs when undoing and redoing', () => {
      const op = new MockOperation('stable_id');
      
      // Initial execution
      const result1 = command.addAndExecute(op);
      const originalId = result1.outputs.mockData;
      command.commit();
      
      // Undo
      command.undo();
      
      // Redo - ID should be preserved in outputs
      command.redo();
      
      // Operation's outputs should still contain the original ID
      expect(op.outputs.mockData).toBe(originalId);
      expect(op.outputs.mockData).toBe('stable_id');
    });

    it('should maintain outputs across multiple undo/redo cycles', () => {
      const op1 = new MockOperation('id_1');
      const op2 = new MockOperation('id_2');
      
      command.addAndExecute(op1);
      command.addAndExecute(op2);
      command.commit();
      
      // Cycle 1
      command.undo();
      command.redo();
      expect(op1.outputs.mockData).toBe('id_1');
      expect(op2.outputs.mockData).toBe('id_2');
      
      // Cycle 2
      command.undo();
      command.redo();
      expect(op1.outputs.mockData).toBe('id_1');
      expect(op2.outputs.mockData).toBe('id_2');
    });
  });

  describe('Status Transitions', () => {
    it('should transition from Building to Committed', () => {
      const operation = new MockOperation();
      command.addAndExecute(operation);
      
      expect(command.status).toBe(CommandStatus.Building);
      
      command.commit();
      
      expect(command.status).toBe(CommandStatus.Committed);
    });

    it('should transition from Committed to Undone', () => {
      const operation = new MockOperation();
      command.addAndExecute(operation);
      command.commit();
      
      command.undo();
      
      expect(command.status).toBe(CommandStatus.Undone);
    });

    it('should transition from Undone back to Committed', () => {
      const operation = new MockOperation();
      command.addAndExecute(operation);
      command.commit();
      command.undo();
      
      command.redo();
      
      expect(command.status).toBe(CommandStatus.Committed);
    });

    it('should not allow commit without operations', () => {
      expect(() => {
        command.commit();
      }).toThrow('Cannot commit empty command');
    });

    it('should not allow undo on non-committed command', () => {
      expect(() => {
        command.undo();
      }).toThrow('Can only undo committed commands');
    });

    it('should not allow redo on non-undone command', () => {
      const operation = new MockOperation();
      command.addAndExecute(operation);
      command.commit();
      
      expect(() => {
        command.redo();
      }).toThrow('Can only redo undone commands');
    });
  });

  describe('commit()', () => {
    it('should finalize command with operations', () => {
      const op = new MockOperation();
      command.addAndExecute(op);
      
      command.commit();
      
      expect(command.status).toBe(CommandStatus.Committed);
    });

    it('should allow idempotent commit (no error on double commit)', () => {
      const op = new MockOperation();
      command.addAndExecute(op);
      command.commit();
      
      // Second commit should be no-op (idempotent)
      command.commit();
      expect(command.status).toBe(CommandStatus.Committed);
    });
  });

  describe('Rollback', () => {
    it('should undo all operations in reverse order', () => {
      const op1 = new MockOperation();
      const op2 = new MockOperation();
      const op3 = new MockOperation();
      
      command.addAndExecute(op1);
      command.addAndExecute(op2);
      command.addAndExecute(op3);
      
      command.rollback();
      
      // All should be undone
      expect(op1.undoCalled).toBe(true);
      expect(op2.undoCalled).toBe(true);
      expect(op3.undoCalled).toBe(true);
      
      // Operations cleared
      expect(command['operations']).toHaveLength(0);
      
      // Status reset to Building
      expect(command.status).toBe(CommandStatus.Building);
    });

    it('should allow adding new operations after rollback', () => {
      const op1 = new MockOperation();
      command.addAndExecute(op1);
      command.rollback();
      
      const op2 = new MockOperation();
      const result = command.addAndExecute(op2);
      
      expect(result.success).toBe(true);
      expect(command['operations']).toHaveLength(1);
    });

    it('throws AggregateError when operation failure rollback also fails', () => {
      const op1 = new MockOperation('first');
      op1.shouldThrowOnUndo = true;
      const op2 = new MockOperation('second');
      op2.shouldFail = true;

      command.addAndExecute(op1);

      try {
        command.addAndExecute(op2);
        throw new Error('Expected command failure');
      } catch (error) {
        expect(error).toBeInstanceOf(AggregateError);
        expect((error as AggregateError).errors[0]).toMatchObject({ message: 'Mock operation failed' });
        expect((error as AggregateError).errors[1]).toMatchObject({ message: 'Rollback failed for first' });
      }
      expect(op1.undoCalled).toBe(true);
    });

    it('preserves the original operation error when rollback succeeds', () => {
      const op1 = new MockOperation('first');
      const op2 = new MockOperation('second');
      op2.shouldFail = true;

      command.addAndExecute(op1);

      expect(() => command.addAndExecute(op2)).toThrow('Mock operation failed');
      expect(op1.undoCalled).toBe(true);
    });

    it('resets rollback tracking after successful rollback and new operations', () => {
      const op1 = new MockOperation('first');
      command.addAndExecute(op1);
      command.rollback();

      const op2 = new MockOperation('second');
      op2.shouldThrowOnUndo = true;
      const op3 = new MockOperation('third');
      op3.shouldFail = true;
      command.addAndExecute(op2);

      expect(() => command.addAndExecute(op3)).toThrow(AggregateError);
      expect(op1.undoCalled).toBe(true);
      expect(op2.undoCalled).toBe(true);
    });
  });

  describe('Undo', () => {
    it('should undo operations in reverse order', () => {
      const undoOrder: number[] = [];
      
      class OrderedMockOp extends MockOperation {
        constructor(private order: number, outputValue: string) {
          super(outputValue);
        }
        
        undo(context: OperationContext): void {
          undoOrder.push(this.order);
          super.undo({ world });
        }
      }
      
      const op1 = new OrderedMockOp(1, 'val1');
      const op2 = new OrderedMockOp(2, 'val2');
      const op3 = new OrderedMockOp(3, 'val3');
      
      command.addAndExecute(op1);
      command.addAndExecute(op2);
      command.addAndExecute(op3);
      command.commit();
      
      command.undo();
      
      // Should undo in reverse order: 3, 2, 1
      expect(undoOrder).toEqual([3, 2, 1]);
    });

    it('should mark command as undone', () => {
      const operation = new MockOperation();
      command.addAndExecute(operation);
      command.commit();
      
      command.undo();
      
      expect(command.status).toBe(CommandStatus.Undone);
      expect(operation.undoCalled).toBe(true);
    });
  });

  describe('Redo', () => {
    it('should reapply operations in original order', () => {
      const applyOrder: number[] = [];
      
      class OrderedMockOp extends MockOperation {
        constructor(private order: number, outputValue: string) {
          super(outputValue);
        }
        
        apply(context: OperationContext): OperationResult {
          applyOrder.push(this.order);
          return super.apply({ world });
        }
      }
      
      const op1 = new OrderedMockOp(1, 'val1');
      const op2 = new OrderedMockOp(2, 'val2');
      const op3 = new OrderedMockOp(3, 'val3');
      
      command.addAndExecute(op1);
      command.addAndExecute(op2);
      command.addAndExecute(op3);
      command.commit();
      command.undo();
      
      applyOrder.length = 0;  // Clear after initial execution
      
      command.redo();
      
      // Should reapply in original order: 1, 2, 3
      expect(applyOrder).toEqual([1, 2, 3]);
    });

    it('should restore command to committed status', () => {
      const operation = new MockOperation();
      command.addAndExecute(operation);
      command.commit();
      command.undo();
      
      command.redo();
      
      expect(command.status).toBe(CommandStatus.Committed);
    });

    it('should throw if redo fails', () => {
      const operation = new MockOperation();
      command.addAndExecute(operation);
      command.commit();
      command.undo();
      
      // Make operation fail on redo
      operation.shouldFail = true;
      
      expect(() => {
        command.redo();
      }).toThrow('Redo failed');
    });
  });

  describe('Command.restore()', () => {
    it('restores command metadata and operation order without using normal generated identity', () => {
      const op1 = new MockOperation('one');
      const op2 = new MockOperation('two');
      const restored = Command.restore({
        id: 'cmd-restored',
        timestamp: '2024-02-03T04:05:06.000Z',
        description: 'Restored command',
        operations: [op1, op2]
      }, world);

      expect(restored.id).toBe('cmd-restored');
      expect(restored.timestamp.toISOString()).toBe('2024-02-03T04:05:06.000Z');
      expect(restored.description).toBe('Restored command');
      expect(restored.status).toBe(CommandStatus.Committed);
      expect(restored.getOperations()).toEqual([op1, op2]);
    });

    it('snapshots committed commands through typed operation descriptors', () => {
      const op = new AddFreePoint2DOp('projPlaneH', new Vector3(1, 2, 1));
      op.outputs = { pointId: 'projPlaneH/point2d10' };
      const restored = Command.restore({
        id: 'cmd-snapshot',
        timestamp: '2024-01-01T00:00:00.000Z',
        description: 'Test Command',
        operations: [op]
      }, world);

      expect(restored.toSnapshot()).toMatchObject({
        id: 'cmd-snapshot',
        timestamp: '2024-01-01T00:00:00.000Z',
        description: 'Test Command',
        status: CommandStatus.Committed,
        operations: [{ opType: 'AddFreePoint2D', pointId: 'projPlaneH/point2d10' }]
      });
    });
  });

});

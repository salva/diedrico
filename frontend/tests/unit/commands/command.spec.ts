/**
 * Unit Tests: Command Base Class
 * 
 * Tests the Command pattern implementation:
 * - Incremental execution (operations execute immediately when added)
 * - Rollback on failure
 * - Status transitions: Building → Committed → Undone
 * - Undo/redo reverses operations in correct order
 * 
 * Reference: specs/001-dihedral-learning-mvp/tasks.md - T073a
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Command, CommandStatus } from '@/commands/Command';
import type { IOperation, OperationResult } from '@/commands/operations/IOperation';
import { World } from '@/domain/world/World';

// Mock operation for testing
class MockOperation implements IOperation {
  readonly type = 'MockOperation';
  parameters = {};
  outputs = {};
  
  applyCalled = false;
  undoCalled = false;
  shouldFail = false;

  apply(_world: World): OperationResult {
    this.applyCalled = true;
    
    if (this.shouldFail) {
      return {
        success: false,
        error: 'Mock operation failed'
      };
    }
    
    return {
      success: true,
      outputs: { mockData: 'test' }
    };
  }

  undo(_world: World): OperationResult {
    this.undoCalled = true;
    return { success: true };
  }
}

// Concrete command for testing
class TestCommand extends Command {
  executed = false;

  execute(): void {
    this.executed = true;
    // Subclasses would call addAndExecute() here
  }
}

describe('Command Base Class', () => {
  let world: World;
  let command: TestCommand;

  beforeEach(() => {
    world = new World();
    world.initializeFixedElements();
    command = new TestCommand('Test Command', world);
  });

  describe('Initialization', () => {
    it('should initialize with Building status', () => {
      expect(command.status).toBe(CommandStatus.Building);
    });

    it('should have unique ID', () => {
      const command2 = new TestCommand('Another Command', world);
      expect(command.id).not.toBe(command2.id);
    });

    it('should have timestamp', () => {
      expect(command.timestamp).toBeInstanceOf(Date);
    });

    it('should have description', () => {
      expect(command.description).toBe('Test Command');
    });
  });

  describe('addAndExecute - Incremental Execution', () => {
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
  });

  describe('Undo', () => {
    it('should undo operations in reverse order', () => {
      const undoOrder: number[] = [];
      
      class OrderedMockOp extends MockOperation {
        constructor(private order: number) {
          super();
        }
        
        undo(world: World): OperationResult {
          undoOrder.push(this.order);
          return super.undo(world);
        }
      }
      
      const op1 = new OrderedMockOp(1);
      const op2 = new OrderedMockOp(2);
      const op3 = new OrderedMockOp(3);
      
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
        constructor(private order: number) {
          super();
        }
        
        apply(world: World): OperationResult {
          applyOrder.push(this.order);
          return super.apply(world);
        }
      }
      
      const op1 = new OrderedMockOp(1);
      const op2 = new OrderedMockOp(2);
      const op3 = new OrderedMockOp(3);
      
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

  describe('Abstract execute method', () => {
    it('should be implemented by subclasses', () => {
      command.execute();
      expect(command.executed).toBe(true);
    });
  });
});

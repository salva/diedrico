import { describe, it, expect, beforeEach } from 'vitest';
import { Command } from '../../src/commands/Command';
import type { IOperation } from '../../src/commands/operations/IOperation';
import type { OperationResult } from '../../src/commands/operations/IOperation';
import type { World } from '../../src/domain/world/World';
import { World as WorldClass } from '../../src/domain/world/World';

// Mock operation for testing
class MockOperation implements IOperation {
  type: string;
  parameters: Record<string, any>;
  outputs: Record<string, any> = {};
  executed = false;
  undone = false;
  shouldFail = false;
  operationId: string;

  constructor(operationId: string, shouldFail = false) {
    this.operationId = operationId;
    this.type = 'MockOp';
    this.parameters = { operationId };
    this.shouldFail = shouldFail;
  }

  apply(_world: World): OperationResult {
    if (this.shouldFail) {
      return {
        success: false,
        outputs: {},
        error: 'Mock operation failed'
      };
    }
    this.executed = true;
    this.outputs = { operationId: this.operationId };
    return {
      success: true,
      outputs: this.outputs
    };
  }

  undo(_world: World): void {
    this.undone = true;
    this.executed = false;
  }
}

describe('Command', () => {
  let command: Command;
  let world: World;

  beforeEach(() => {
    world = new WorldClass();
    command = new Command('Test command', world);
  });

  describe('incremental execution', () => {
    it('should execute operation immediately when added', () => {
      const op = new MockOperation('op-1');
      
      const result = command.addAndExecute(op);
      
      expect(result.success).toBe(true);
      expect(op.executed).toBe(true);
    });

    it('should return operation outputs for dependency resolution', () => {
      const op = new MockOperation('op-1');
      
      const result = command.addAndExecute(op);
      
      expect(result.outputs.operationId).toBe('op-1');
    });

    it('should execute multiple operations in sequence', () => {
      const op1 = new MockOperation('op-1');
      const op2 = new MockOperation('op-2');
      const op3 = new MockOperation('op-3');
      
      command.addAndExecute(op1);
      command.addAndExecute(op2);
      command.addAndExecute(op3);
      
      expect(op1.executed).toBe(true);
      expect(op2.executed).toBe(true);
      expect(op3.executed).toBe(true);
    });

    it('should rollback all operations if one fails', () => {
      const op1 = new MockOperation('op-1');
      const op2 = new MockOperation('op-2');
      const op3 = new MockOperation('op-3', true); // This one fails
      
      command.addAndExecute(op1);
      command.addAndExecute(op2);
      
      expect(() => command.addAndExecute(op3)).toThrow();
      
      expect(op1.undone).toBe(true);
      expect(op2.undone).toBe(true);
    });

    it('should not allow adding operations to committed command', () => {
      const op1 = new MockOperation('op-1');
      command.addAndExecute(op1);
      command.commit();
      
      const op2 = new MockOperation('op-2');
      expect(() => command.addAndExecute(op2)).toThrow('Cannot add operations to non-building command');
    });
  });

  describe('commit', () => {
    it('should commit command with operations', () => {
      const op = new MockOperation('op-1');
      command.addAndExecute(op);
      
      command.commit();
      
      expect(command.status).toBe('committed');
    });

    it('should not allow committing empty command', () => {
      expect(() => command.commit()).toThrow('Cannot commit empty command');
    });
  });

  describe('undo/redo', () => {
    it('should undo committed command', () => {
      const op1 = new MockOperation('op-1');
      const op2 = new MockOperation('op-2');
      
      command.addAndExecute(op1);
      command.addAndExecute(op2);
      command.commit();
      
      command.undo();
      
      expect(command.status).toBe('undone');
      expect(op1.undone).toBe(true);
      expect(op2.undone).toBe(true);
    });

    it('should redo undone command', () => {
      const op1 = new MockOperation('op-1');
      const op2 = new MockOperation('op-2');
      
      command.addAndExecute(op1);
      command.addAndExecute(op2);
      command.commit();
      command.undo();
      
      // Reset flags for redo test
      op1.undone = false;
      
      command.redo();
      
      expect(command.status).toBe('committed');
      expect(op1.executed).toBe(true);
      expect(op2.executed).toBe(true);
    });

    it('should not allow undoing non-committed command', () => {
      const op = new MockOperation('op-1');
      command.addAndExecute(op);
      
      expect(() => command.undo()).toThrow('Can only undo committed commands');
    });

    it('should not allow redoing non-undone command', () => {
      const op = new MockOperation('op-1');
      command.addAndExecute(op);
      command.commit();
      
      expect(() => command.redo()).toThrow('Can only redo undone commands');
    });
  });

  describe('rollback', () => {
    it('should rollback all operations in reverse order', () => {
      const operations: MockOperation[] = [];
      const rollbackOrder: string[] = [];
      
      for (let i = 0; i < 3; i++) {
        const op = new MockOperation(`op-${i}`);
        // Track rollback order
        const originalUndo = op.undo.bind(op);
        op.undo = (world: World) => {
          rollbackOrder.push(op.operationId);
          originalUndo(world);
        };
        operations.push(op);
        command.addAndExecute(op);
      }
      
      command.rollback();
      
      expect(rollbackOrder).toEqual(['op-2', 'op-1', 'op-0']);
      expect(command.status).toBe('building');
    });
  });
});

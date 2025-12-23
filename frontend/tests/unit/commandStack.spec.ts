import { describe, it, expect, beforeEach } from 'vitest';
import { CommandStack } from '../../src/commands/CommandStack';
import { Command } from '../../src/commands/Command';
import type { Operation } from '../../src/commands/Command';
import type { OperationResult } from '../../src/types/CommandTypes';

// Mock operation for testing
class MockOperation implements Operation {
  id: string;
  type = 'MockOp';
  args: Record<string, any> = {};
  value: number;

  constructor(id: string, value: number) {
    this.id = id;
    this.value = value;
  }

  execute(): OperationResult {
    return {
      success: true,
      outputs: { value: this.value }
    };
  }

  rollback(): void {
    // Mock rollback
  }
}

describe('CommandStack', () => {
  let stack: CommandStack;

  beforeEach(() => {
    stack = new CommandStack(5); // Small size for testing
  });

  describe('commit', () => {
    it('should commit command to stack', () => {
      const cmd = new Command('cmd-1', 'Command 1');
      cmd.addAndExecute(new MockOperation('op-1', 1));
      
      stack.commit(cmd);
      
      expect(stack.canUndo()).toBe(true);
      expect(stack.getUndoDescription()).toBe('Command 1');
    });

    it('should not commit non-building commands', () => {
      const cmd = new Command('cmd-1', 'Command 1');
      cmd.addAndExecute(new MockOperation('op-1', 1));
      cmd.commit(); // Already committed
      
      expect(() => stack.commit(cmd)).toThrow('Can only commit building commands');
    });

    it('should clear redo history when new command committed', () => {
      const cmd1 = new Command('cmd-1', 'Command 1');
      cmd1.addAndExecute(new MockOperation('op-1', 1));
      stack.commit(cmd1);
      
      const cmd2 = new Command('cmd-2', 'Command 2');
      cmd2.addAndExecute(new MockOperation('op-2', 2));
      stack.commit(cmd2);
      
      stack.undo(); // Now can redo cmd2
      expect(stack.canRedo()).toBe(true);
      
      const cmd3 = new Command('cmd-3', 'Command 3');
      cmd3.addAndExecute(new MockOperation('op-3', 3));
      stack.commit(cmd3); // Should clear redo
      
      expect(stack.canRedo()).toBe(false);
    });

    it('should enforce max stack size', () => {
      // Commit 6 commands (max is 5)
      for (let i = 0; i < 6; i++) {
        const cmd = new Command(`cmd-${i}`, `Command ${i}`);
        cmd.addAndExecute(new MockOperation(`op-${i}`, i));
        stack.commit(cmd);
      }
      
      const state = stack.getState();
      expect(state.totalCommands).toBe(5);
      expect(state.currentIndex).toBe(4);
    });
  });

  describe('undo/redo', () => {
    it('should undo last command', () => {
      const cmd = new Command('cmd-1', 'Command 1');
      cmd.addAndExecute(new MockOperation('op-1', 1));
      stack.commit(cmd);
      
      const result = stack.undo();
      
      expect(result).toBe(true);
      expect(stack.canUndo()).toBe(false);
      expect(stack.canRedo()).toBe(true);
    });

    it('should redo undone command', () => {
      const cmd = new Command('cmd-1', 'Command 1');
      cmd.addAndExecute(new MockOperation('op-1', 1));
      stack.commit(cmd);
      stack.undo();
      
      const result = stack.redo();
      
      expect(result).toBe(true);
      expect(stack.canUndo()).toBe(true);
      expect(stack.canRedo()).toBe(false);
    });

    it('should handle multiple undo operations', () => {
      const cmd1 = new Command('cmd-1', 'Command 1');
      cmd1.addAndExecute(new MockOperation('op-1', 1));
      stack.commit(cmd1);
      
      const cmd2 = new Command('cmd-2', 'Command 2');
      cmd2.addAndExecute(new MockOperation('op-2', 2));
      stack.commit(cmd2);
      
      const cmd3 = new Command('cmd-3', 'Command 3');
      cmd3.addAndExecute(new MockOperation('op-3', 3));
      stack.commit(cmd3);
      
      stack.undo(); // Undo cmd3
      expect(stack.getUndoDescription()).toBe('Command 2');
      
      stack.undo(); // Undo cmd2
      expect(stack.getUndoDescription()).toBe('Command 1');
      
      stack.undo(); // Undo cmd1
      expect(stack.canUndo()).toBe(false);
    });

    it('should handle multiple redo operations', () => {
      const cmd1 = new Command('cmd-1', 'Command 1');
      cmd1.addAndExecute(new MockOperation('op-1', 1));
      stack.commit(cmd1);
      
      const cmd2 = new Command('cmd-2', 'Command 2');
      cmd2.addAndExecute(new MockOperation('op-2', 2));
      stack.commit(cmd2);
      
      stack.undo();
      stack.undo();
      
      stack.redo(); // Redo cmd1
      expect(stack.getRedoDescription()).toBe('Command 2');
      
      stack.redo(); // Redo cmd2
      expect(stack.canRedo()).toBe(false);
    });

    it('should return false when nothing to undo', () => {
      const result = stack.undo();
      expect(result).toBe(false);
    });

    it('should return false when nothing to redo', () => {
      const result = stack.redo();
      expect(result).toBe(false);
    });
  });

  describe('canUndo/canRedo', () => {
    it('should return false when stack is empty', () => {
      expect(stack.canUndo()).toBe(false);
      expect(stack.canRedo()).toBe(false);
    });

    it('should return true for undo after commit', () => {
      const cmd = new Command('cmd-1', 'Command 1');
      cmd.addAndExecute(new MockOperation('op-1', 1));
      stack.commit(cmd);
      
      expect(stack.canUndo()).toBe(true);
      expect(stack.canRedo()).toBe(false);
    });

    it('should return true for redo after undo', () => {
      const cmd = new Command('cmd-1', 'Command 1');
      cmd.addAndExecute(new MockOperation('op-1', 1));
      stack.commit(cmd);
      stack.undo();
      
      expect(stack.canUndo()).toBe(false);
      expect(stack.canRedo()).toBe(true);
    });
  });

  describe('getUndoDescription/getRedoDescription', () => {
    it('should return null when no undo available', () => {
      expect(stack.getUndoDescription()).toBeNull();
    });

    it('should return null when no redo available', () => {
      expect(stack.getRedoDescription()).toBeNull();
    });

    it('should return correct descriptions', () => {
      const cmd1 = new Command('cmd-1', 'Create segment');
      cmd1.addAndExecute(new MockOperation('op-1', 1));
      stack.commit(cmd1);
      
      const cmd2 = new Command('cmd-2', 'Move point');
      cmd2.addAndExecute(new MockOperation('op-2', 2));
      stack.commit(cmd2);
      
      expect(stack.getUndoDescription()).toBe('Move point');
      
      stack.undo();
      expect(stack.getUndoDescription()).toBe('Create segment');
      expect(stack.getRedoDescription()).toBe('Move point');
    });
  });

  describe('clear', () => {
    it('should clear all commands', () => {
      const cmd1 = new Command('cmd-1', 'Command 1');
      cmd1.addAndExecute(new MockOperation('op-1', 1));
      stack.commit(cmd1);
      
      const cmd2 = new Command('cmd-2', 'Command 2');
      cmd2.addAndExecute(new MockOperation('op-2', 2));
      stack.commit(cmd2);
      
      stack.clear();
      
      expect(stack.canUndo()).toBe(false);
      expect(stack.canRedo()).toBe(false);
      expect(stack.getState().totalCommands).toBe(0);
    });
  });

  describe('getState', () => {
    it('should return current stack state', () => {
      const cmd1 = new Command('cmd-1', 'Command 1');
      cmd1.addAndExecute(new MockOperation('op-1', 1));
      stack.commit(cmd1);
      
      const cmd2 = new Command('cmd-2', 'Command 2');
      cmd2.addAndExecute(new MockOperation('op-2', 2));
      stack.commit(cmd2);
      
      const state = stack.getState();
      
      expect(state.totalCommands).toBe(2);
      expect(state.currentIndex).toBe(1);
      expect(state.canUndo).toBe(true);
      expect(state.canRedo).toBe(false);
      expect(state.commands).toHaveLength(2);
      expect(state.commands[0].description).toBe('Command 1');
      expect(state.commands[1].description).toBe('Command 2');
    });
  });
});

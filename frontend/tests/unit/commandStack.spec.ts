import { describe, it, expect, beforeEach } from 'vitest';
import { CommandStack } from '../../src/commands/CommandStack';
import { Command } from '../../src/commands/Command';
import type { IOperation } from '../../src/commands/operations/IOperation';
import type { OperationResult } from '../../src/commands/operations/IOperation';
import type { OperationContext } from '../../src/commands/operations/OperationContext';
import type { World } from '../../src/domain/world/World';
import { World as WorldClass } from '../../src/domain/world/World';

// Mock operation for testing
class MockOperation implements IOperation {
  type = 'MockOp';
  parameters: Record<string, any> = {};
  outputs: Record<string, any> = {};
  value: number;

  constructor(value: number) {
    this.value = value;
    this.parameters = { value };
  }

  apply(_context: OperationContext): OperationResult {
    this.outputs = { value: this.value };
    return {
      success: true,
      outputs: this.outputs
    };
  }

  undo(_context: OperationContext): void {
    // Mock undo
  }
}

describe('CommandStack', () => {
  let stack: CommandStack;
  let world: World;

  beforeEach(() => {
    world = new WorldClass();
    stack = new CommandStack(5); // Small size for testing
  });

  describe('push', () => {
    it('should push committed command to stack', () => {
      const cmd = new Command('Command 1', { world });
      cmd.addAndExecute(new MockOperation(1));
      cmd.commit();
      
      stack.push(cmd);
      
      expect(stack.canUndo()).toBe(true);
      expect(stack.getUndoCount()).toBe(1);
    });

    it('should not push non-committed commands', () => {
      const cmd = new Command('Command 1', { world });
      cmd.addAndExecute(new MockOperation(1));
      // Not committed
      
      expect(() => stack.push(cmd)).toThrow('Can only push committed commands');
    });

    it('should clear redo history when new command pushed', () => {
      const cmd1 = new Command('Command 1', { world });
      cmd1.addAndExecute(new MockOperation(1));
      cmd1.commit();
      stack.push(cmd1);
      
      const cmd2 = new Command('Command 2', { world });
      cmd2.addAndExecute(new MockOperation(2));
      cmd2.commit();
      stack.push(cmd2);
      
      stack.undo(); // Now can redo cmd2
      expect(stack.canRedo()).toBe(true);
      
      const cmd3 = new Command('Command 3', { world });
      cmd3.addAndExecute(new MockOperation(3));
      cmd3.commit();
      stack.push(cmd3); // Should clear redo
      
      expect(stack.canRedo()).toBe(false);
    });

    it('should not push non-undoable commands', () => {
      // Create a command and mark it as non-undoable
      const cmd = new Command('Non-undoable', { world });
      cmd.addAndExecute(new MockOperation(1));
      cmd.commit();
      // Make it non-undoable by overriding canUndo
      (cmd as any).canUndo = () => false;
      
      stack.push(cmd);
      
      expect(stack.canUndo()).toBe(false);
      expect(stack.getUndoCount()).toBe(0);
    });
  });

  describe('undo/redo', () => {
    it('should undo last command', () => {
      const cmd = new Command('Command 1', { world });
      cmd.addAndExecute(new MockOperation(1));
      cmd.commit();
      stack.push(cmd);
      
      stack.undo();
      
      expect(stack.canUndo()).toBe(false);
      expect(stack.canRedo()).toBe(true);
    });

    it('should redo undone command', () => {
      const cmd = new Command('Command 1', { world });
      cmd.addAndExecute(new MockOperation(1));
      cmd.commit();
      stack.push(cmd);
      stack.undo();
      
      stack.redo();
      
      expect(stack.canUndo()).toBe(true);
      expect(stack.canRedo()).toBe(false);
    });

    it('should handle multiple undo operations', () => {
      const cmd1 = new Command('Command 1', { world });
      cmd1.addAndExecute(new MockOperation(1));
      cmd1.commit();
      stack.push(cmd1);
      
      const cmd2 = new Command('Command 2', { world });
      cmd2.addAndExecute(new MockOperation(2));
      cmd2.commit();
      stack.push(cmd2);
      
      const cmd3 = new Command('Command 3', { world });
      cmd3.addAndExecute(new MockOperation(3));
      cmd3.commit();
      stack.push(cmd3);
      
      stack.undo(); // Undo cmd3
      expect(stack.getUndoCount()).toBe(2);
      
      stack.undo(); // Undo cmd2
      expect(stack.getUndoCount()).toBe(1);
      
      stack.undo(); // Undo cmd1
      expect(stack.canUndo()).toBe(false);
    });

    it('should handle multiple redo operations', () => {
      const cmd1 = new Command('Command 1', { world });
      cmd1.addAndExecute(new MockOperation(1));
      cmd1.commit();
      stack.push(cmd1);
      
      const cmd2 = new Command('Command 2', { world });
      cmd2.addAndExecute(new MockOperation(2));
      cmd2.commit();
      stack.push(cmd2);
      
      stack.undo();
      stack.undo();
      
      stack.redo(); // Redo cmd1
      expect(stack.getRedoCount()).toBe(1);
      
      stack.redo(); // Redo cmd2
      expect(stack.canRedo()).toBe(false);
    });

    it('should throw when nothing to undo', () => {
      expect(() => stack.undo()).toThrow('Nothing to undo');
    });

    it('should throw when nothing to redo', () => {
      expect(() => stack.redo()).toThrow('Nothing to redo');
    });
  });

  describe('canUndo/canRedo', () => {
    it('should return false when stack is empty', () => {
      expect(stack.canUndo()).toBe(false);
      expect(stack.canRedo()).toBe(false);
    });

    it('should return true for undo after push', () => {
      const cmd = new Command('Command 1', { world });
      cmd.addAndExecute(new MockOperation(1));
      cmd.commit();
      stack.push(cmd);
      
      expect(stack.canUndo()).toBe(true);
      expect(stack.canRedo()).toBe(false);
    });

    it('should return true for redo after undo', () => {
      const cmd = new Command('Command 1', { world });
      cmd.addAndExecute(new MockOperation(1));
      cmd.commit();
      stack.push(cmd);
      stack.undo();
      
      expect(stack.canUndo()).toBe(false);
      expect(stack.canRedo()).toBe(true);
    });
  });

  describe('clear', () => {
    it('should clear all commands', () => {
      const cmd1 = new Command('Command 1', { world });
      cmd1.addAndExecute(new MockOperation(1));
      cmd1.commit();
      stack.push(cmd1);
      
      const cmd2 = new Command('Command 2', { world });
      cmd2.addAndExecute(new MockOperation(2));
      cmd2.commit();
      stack.push(cmd2);
      
      stack.clear();
      
      expect(stack.canUndo()).toBe(false);
      expect(stack.canRedo()).toBe(false);
      expect(stack.getUndoCount()).toBe(0);
    });
  });

  describe('getCommands', () => {
    it('should return all commands in undo stack', () => {
      const cmd1 = new Command('Command 1', { world });
      cmd1.addAndExecute(new MockOperation(1));
      cmd1.commit();
      stack.push(cmd1);
      
      const cmd2 = new Command('Command 2', { world });
      cmd2.addAndExecute(new MockOperation(2));
      cmd2.commit();
      stack.push(cmd2);
      
      const commands = stack.getCommands();
      
      expect(commands).toHaveLength(2);
      expect(commands[0].description).toBe('Command 1');
      expect(commands[1].description).toBe('Command 2');
    });
  });
});

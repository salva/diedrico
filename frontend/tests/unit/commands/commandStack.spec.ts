/**
 * Unit Tests: CommandStack
 * 
 * Tests the command history management:
 * - execute() adds to undo stack and clears redo stack
 * - undo() moves command from undo to redo stack
 * - redo() moves command from redo back to undo stack
 * - canUndo/canRedo return correct booleans
 * 
 * Reference: specs/001-dihedral-learning-mvp/tasks.md - T074a
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CommandStack } from '@/commands/CommandStack';
import { Command, CommandStatus } from '@/commands/Command';
import { World } from '@/domain/world/World';
import type { OperationResult } from '@/commands/operations/IOperation';

// Mock command for testing
class MockCommand extends Command {
  executeCalled = false;
  undoCalled = false;
  redoCalled = false;

  execute(): void {
    this.executeCalled = true;
  }

  undo(): void {
    this.undoCalled = true;
    super.undo();
  }

  redo(): void {
    this.redoCalled = true;
    super.redo();
  }
}

describe('CommandStack', () => {
  let commandStack: CommandStack;
  let world: World;

  beforeEach(() => {
    commandStack = new CommandStack();
    world = new World();
    world.initializeFixedElements();
  });

  describe('Initialization', () => {
    it('should start with empty stacks', () => {
      expect(commandStack.canUndo()).toBe(false);
      expect(commandStack.canRedo()).toBe(false);
      expect(commandStack.getUndoCount()).toBe(0);
      expect(commandStack.getRedoCount()).toBe(0);
    });
  });

  describe('execute()', () => {
    it('should execute command', () => {
      const command = new MockCommand('Test Command', world);
      
      commandStack.execute(command);
      
      expect(command.executeCalled).toBe(true);
    });

    it('should add command to undo stack', () => {
      const command = new MockCommand('Test Command', world);
      
      commandStack.execute(command);
      
      expect(commandStack.canUndo()).toBe(true);
      expect(commandStack.getUndoCount()).toBe(1);
    });

    it('should commit command after execution', () => {
      const command = new MockCommand('Test Command', world);
      
      commandStack.execute(command);
      
      expect(command.status).toBe(CommandStatus.Committed);
    });

    it('should clear redo stack on new execution', () => {
      const command1 = new MockCommand('Command 1', world);
      const command2 = new MockCommand('Command 2', world);
      const command3 = new MockCommand('Command 3', world);
      
      // Execute two commands
      commandStack.execute(command1);
      commandStack.execute(command2);
      
      // Undo one
      commandStack.undo();
      
      // Redo stack should have one item
      expect(commandStack.getRedoCount()).toBe(1);
      
      // Execute new command
      commandStack.execute(command3);
      
      // Redo stack should be cleared
      expect(commandStack.getRedoCount()).toBe(0);
      expect(commandStack.canRedo()).toBe(false);
    });

    it('should handle multiple commands', () => {
      const command1 = new MockCommand('Command 1', world);
      const command2 = new MockCommand('Command 2', world);
      const command3 = new MockCommand('Command 3', world);
      
      commandStack.execute(command1);
      commandStack.execute(command2);
      commandStack.execute(command3);
      
      expect(commandStack.getUndoCount()).toBe(3);
    });
  });

  describe('undo()', () => {
    it('should undo the most recent command', () => {
      const command = new MockCommand('Test Command', world);
      commandStack.execute(command);
      
      commandStack.undo();
      
      expect(command.undoCalled).toBe(true);
      expect(command.status).toBe(CommandStatus.Undone);
    });

    it('should move command from undo to redo stack', () => {
      const command = new MockCommand('Test Command', world);
      commandStack.execute(command);
      
      expect(commandStack.getUndoCount()).toBe(1);
      expect(commandStack.getRedoCount()).toBe(0);
      
      commandStack.undo();
      
      expect(commandStack.getUndoCount()).toBe(0);
      expect(commandStack.getRedoCount()).toBe(1);
    });

    it('should undo commands in LIFO order', () => {
      const undoOrder: string[] = [];
      
      class OrderedMockCommand extends MockCommand {
        undo(): void {
          undoOrder.push(this.description);
          super.undo();
        }
      }
      
      const command1 = new OrderedMockCommand('Command 1', world);
      const command2 = new OrderedMockCommand('Command 2', world);
      const command3 = new OrderedMockCommand('Command 3', world);
      
      commandStack.execute(command1);
      commandStack.execute(command2);
      commandStack.execute(command3);
      
      commandStack.undo();
      commandStack.undo();
      
      // Should undo in reverse order: 3, then 2
      expect(undoOrder).toEqual(['Command 3', 'Command 2']);
    });

    it('should throw error when undo stack is empty', () => {
      expect(() => {
        commandStack.undo();
      }).toThrow('Nothing to undo');
    });
  });

  describe('redo()', () => {
    it('should redo the most recently undone command', () => {
      const command = new MockCommand('Test Command', world);
      commandStack.execute(command);
      commandStack.undo();
      
      commandStack.redo();
      
      expect(command.redoCalled).toBe(true);
      expect(command.status).toBe(CommandStatus.Committed);
    });

    it('should move command from redo to undo stack', () => {
      const command = new MockCommand('Test Command', world);
      commandStack.execute(command);
      commandStack.undo();
      
      expect(commandStack.getUndoCount()).toBe(0);
      expect(commandStack.getRedoCount()).toBe(1);
      
      commandStack.redo();
      
      expect(commandStack.getUndoCount()).toBe(1);
      expect(commandStack.getRedoCount()).toBe(0);
    });

    it('should redo commands in LIFO order', () => {
      const redoOrder: string[] = [];
      
      class OrderedMockCommand extends MockCommand {
        redo(): void {
          redoOrder.push(this.description);
          super.redo();
        }
      }
      
      const command1 = new OrderedMockCommand('Command 1', world);
      const command2 = new OrderedMockCommand('Command 2', world);
      
      commandStack.execute(command1);
      commandStack.execute(command2);
      commandStack.undo();
      commandStack.undo();
      
      commandStack.redo();
      commandStack.redo();
      
      // Should redo in order they were undone: 2, then 1
      expect(redoOrder).toEqual(['Command 2', 'Command 1']);
    });

    it('should throw error when redo stack is empty', () => {
      expect(() => {
        commandStack.redo();
      }).toThrow('Nothing to redo');
    });
  });

  describe('canUndo()', () => {
    it('should return false when undo stack is empty', () => {
      expect(commandStack.canUndo()).toBe(false);
    });

    it('should return true when undo stack has commands', () => {
      const command = new MockCommand('Test Command', world);
      commandStack.execute(command);
      
      expect(commandStack.canUndo()).toBe(true);
    });

    it('should return false after undoing all commands', () => {
      const command = new MockCommand('Test Command', world);
      commandStack.execute(command);
      commandStack.undo();
      
      expect(commandStack.canUndo()).toBe(false);
    });
  });

  describe('canRedo()', () => {
    it('should return false when redo stack is empty', () => {
      expect(commandStack.canRedo()).toBe(false);
    });

    it('should return true after undoing a command', () => {
      const command = new MockCommand('Test Command', world);
      commandStack.execute(command);
      commandStack.undo();
      
      expect(commandStack.canRedo()).toBe(true);
    });

    it('should return false after redoing all commands', () => {
      const command = new MockCommand('Test Command', world);
      commandStack.execute(command);
      commandStack.undo();
      commandStack.redo();
      
      expect(commandStack.canRedo()).toBe(false);
    });

    it('should return false after new command execution', () => {
      const command1 = new MockCommand('Command 1', world);
      const command2 = new MockCommand('Command 2', world);
      
      commandStack.execute(command1);
      commandStack.undo();
      
      expect(commandStack.canRedo()).toBe(true);
      
      commandStack.execute(command2);
      
      expect(commandStack.canRedo()).toBe(false);
    });
  });

  describe('Stack Counts', () => {
    it('should track undo stack size correctly', () => {
      expect(commandStack.getUndoCount()).toBe(0);
      
      commandStack.execute(new MockCommand('Command 1', world));
      expect(commandStack.getUndoCount()).toBe(1);
      
      commandStack.execute(new MockCommand('Command 2', world));
      expect(commandStack.getUndoCount()).toBe(2);
      
      commandStack.undo();
      expect(commandStack.getUndoCount()).toBe(1);
    });

    it('should track redo stack size correctly', () => {
      expect(commandStack.getRedoCount()).toBe(0);
      
      commandStack.execute(new MockCommand('Command 1', world));
      commandStack.undo();
      expect(commandStack.getRedoCount()).toBe(1);
      
      commandStack.execute(new MockCommand('Command 2', world));
      expect(commandStack.getRedoCount()).toBe(0);
    });
  });

  describe('clear()', () => {
    it('should clear both stacks', () => {
      commandStack.execute(new MockCommand('Command 1', world));
      commandStack.execute(new MockCommand('Command 2', world));
      commandStack.undo();
      
      expect(commandStack.getUndoCount()).toBe(1);
      expect(commandStack.getRedoCount()).toBe(1);
      
      commandStack.clear();
      
      expect(commandStack.getUndoCount()).toBe(0);
      expect(commandStack.getRedoCount()).toBe(0);
      expect(commandStack.canUndo()).toBe(false);
      expect(commandStack.canRedo()).toBe(false);
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle undo/redo cycles', () => {
      const command = new MockCommand('Test Command', world);
      
      // Execute
      commandStack.execute(command);
      expect(command.status).toBe(CommandStatus.Committed);
      expect(commandStack.getUndoCount()).toBe(1);
      
      // Undo
      commandStack.undo();
      expect(command.status).toBe(CommandStatus.Undone);
      expect(commandStack.getRedoCount()).toBe(1);
      
      // Redo
      commandStack.redo();
      expect(command.status).toBe(CommandStatus.Committed);
      expect(commandStack.getUndoCount()).toBe(1);
      
      // Undo again
      commandStack.undo();
      expect(command.status).toBe(CommandStatus.Undone);
    });

    it('should handle multiple undo/redo operations', () => {
      const commands = [
        new MockCommand('Command 1', world),
        new MockCommand('Command 2', world),
        new MockCommand('Command 3', world)
      ];
      
      // Execute all
      commands.forEach(cmd => commandStack.execute(cmd));
      expect(commandStack.getUndoCount()).toBe(3);
      
      // Undo all
      commandStack.undo();
      commandStack.undo();
      commandStack.undo();
      expect(commandStack.getUndoCount()).toBe(0);
      expect(commandStack.getRedoCount()).toBe(3);
      
      // Redo all
      commandStack.redo();
      commandStack.redo();
      commandStack.redo();
      expect(commandStack.getUndoCount()).toBe(3);
      expect(commandStack.getRedoCount()).toBe(0);
    });
  });
});

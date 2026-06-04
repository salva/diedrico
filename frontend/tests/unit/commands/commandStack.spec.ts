/**
 * Unit Tests: CommandStack
 * 
 * Tests the command history management (R018):
 * - push() adds pre-built, committed commands to undo stack
 *  * - undo() moves command from undo to redo stack
 * - redo() moves command from redo back to undo stack
 * - canUndo/canRedo return correct booleans
 * - clear() empties both stacks
 * 
 * Reference: specs/001-dihedral-learning-mvp/tasks.md - R018
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CommandStack } from '@/commands/CommandStack';
import { Command, CommandStatus } from '@/commands/Command';
import { World } from '@/domain/world/World';
import type { IOperation } from '@/commands/operations/IOperation';

// Simple mock operation for building commands
const createMockOperation = (name: string = 'mock'): IOperation => ({
  type: `Mock_${name}`,
  parameters: {},
  outputs: { mockData: name },
  apply: () => ({ success: true, outputs: { mockData: name } }),
  undo: () => {},
  serialize: () => ({ opType: `Mock_${name}`, mockData: name })
});

describe('CommandStack (R018)', () => {
  let commandStack: CommandStack;
  let world: World;

  beforeEach(() => {
    // Create fresh World and CommandStack without initialization
    // This ensures empty command stacks for testing command stack behavior
    world = new World();
    commandStack = new CommandStack();
  });

  describe('Initialization', () => {
    it('should start with empty stacks', () => {
      expect(commandStack.canUndo()).toBe(false);
      expect(commandStack.canRedo()).toBe(false);
      expect(commandStack.getUndoCount()).toBe(0);
      expect(commandStack.getRedoCount()).toBe(0);
    });
  });

  describe('push() - Primary API for new Command pattern', () => {
    it('should accept pre-built, committed command', () => {
      const command = new Command('Test Command', { world });
      command.addAndExecute(createMockOperation('test'));
      command.commit();
      
      commandStack.push(command);
      
      expect(commandStack.canUndo()).toBe(true);
      expect(commandStack.getUndoCount()).toBe(1);
    });

    it('should add command to undo stack', () => {
      const cmd1 = new Command('Command 1', { world });
      cmd1.addAndExecute(createMockOperation('1'));
      cmd1.commit();
      
      const cmd2 = new Command('Command 2', { world });
      cmd2.addAndExecute(createMockOperation('2'));
      cmd2.commit();
      
      commandStack.push(cmd1);
      commandStack.push(cmd2);
      
      expect(commandStack.getUndoCount()).toBe(2);
    });

    it('should clear redo stack on push', () => {
      const cmd1 = new Command('Command 1', { world });
      cmd1.addAndExecute(createMockOperation('1'));
      cmd1.commit();
      commandStack.push(cmd1);
      
      // Undo to create redo stack
      commandStack.undo();
      expect(commandStack.getRedoCount()).toBe(1);
      
      // Push new command
      const cmd2 = new Command('Command 2', { world });
      cmd2.addAndExecute(createMockOperation('2'));
      cmd2.commit();
      commandStack.push(cmd2);
      
      // Redo stack should be cleared
      expect(commandStack.getRedoCount()).toBe(0);
      expect(commandStack.canRedo()).toBe(false);
    });

    it('should require command to be committed', () => {
      const command = new Command('Uncommitted', { world });
      command.addAndExecute(createMockOperation('test'));
      // Not committed
      
      expect(() => {
        commandStack.push(command);
      }).toThrow('Can only push committed commands');
    });

    it('should handle multi-operation commands', () => {
      const command = new Command('Multi-op Command', { world });
      command.addAndExecute(createMockOperation('op1'));
      command.addAndExecute(createMockOperation('op2'));
      command.addAndExecute(createMockOperation('op3'));
      command.commit();
      
      commandStack.push(command);
      
      expect(commandStack.getUndoCount()).toBe(1);
      expect(commandStack.canUndo()).toBe(true);
    });
  });

  describe('undo()', () => {
    it('should undo the most recent command', () => {
      const command = new Command('Test Command', { world });
      command.addAndExecute(createMockOperation('test'));
      command.commit();
      commandStack.push(command);
      
      commandStack.undo();
      
      expect(command.status).toBe(CommandStatus.Undone);
    });

    it('should move command from undo to redo stack', () => {
      const command = new Command('Test Command', { world });
      command.addAndExecute(createMockOperation('test'));
      command.commit();
      commandStack.push(command);
      
      expect(commandStack.getUndoCount()).toBe(1);
      expect(commandStack.getRedoCount()).toBe(0);
      
      commandStack.undo();
      
      expect(commandStack.getUndoCount()).toBe(0);
      expect(commandStack.getRedoCount()).toBe(1);
    });

    it('should undo commands in LIFO order', () => {
      const undoOrder: string[] = [];
      
      const cmd1 = new Command('Command 1', { world });
      const cmd2 = new Command('Command 2', { world });
      const cmd3 = new Command('Command 3', { world });
      
      [cmd1, cmd2, cmd3].forEach(cmd => {
        const op = createMockOperation(cmd.description);
        const originalUndo = op.undo;
        op.undo = () => {
          undoOrder.push(cmd.description);
          originalUndo();
        };
        cmd.addAndExecute(op);
        cmd.commit();
        commandStack.push(cmd);
      });
      
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
      const command = new Command('Test Command', { world });
      command.addAndExecute(createMockOperation('test'));
      command.commit();
      commandStack.push(command);
      commandStack.undo();
      
      commandStack.redo();
      
      expect(command.status).toBe(CommandStatus.Committed);
    });

    it('should move command from redo to undo stack', () => {
      const command = new Command('Test Command', { world });
      command.addAndExecute(createMockOperation('test'));
      command.commit();
      commandStack.push(command);
      commandStack.undo();
      
      expect(commandStack.getUndoCount()).toBe(0);
      expect(commandStack.getRedoCount()).toBe(1);
      
      commandStack.redo();
      
      expect(commandStack.getUndoCount()).toBe(1);
      expect(commandStack.getRedoCount()).toBe(0);
    });

    it('should redo commands in LIFO order', () => {
      const redoOrder: string[] = [];
      
      const cmd1 = new Command('Command 1', { world });
      const cmd2 = new Command('Command 2', { world });
      
      [cmd1, cmd2].forEach(cmd => {
        const op = createMockOperation(cmd.description);
        const originalApply = op.apply;
        let firstApply = true;
        op.apply = () => {
          if (!firstApply) {
            redoOrder.push(cmd.description);
          }
          firstApply = false;
          return originalApply();
        };
        cmd.addAndExecute(op);
        cmd.commit();
        commandStack.push(cmd);
      });
      
      commandStack.undo();
      commandStack.undo();
      
      commandStack.redo();
      commandStack.redo();
      
      // After undoing [1, 2], redo stack is [2, 1]
      // Redoing pops from redo stack, so we get 1 first, then 2
      expect(redoOrder).toEqual(['Command 1', 'Command 2']);
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
      const command = new Command('Test Command', { world });
      command.addAndExecute(createMockOperation('test'));
      command.commit();
      commandStack.push(command);
      
      expect(commandStack.canUndo()).toBe(true);
    });

    it('should return false after undoing all commands', () => {
      const command = new Command('Test Command', { world });
      command.addAndExecute(createMockOperation('test'));
      command.commit();
      commandStack.push(command);
      commandStack.undo();
      
      expect(commandStack.canUndo()).toBe(false);
    });
  });

  describe('canRedo()', () => {
    it('should return false when redo stack is empty', () => {
      expect(commandStack.canRedo()).toBe(false);
    });

    it('should return true after undoing a command', () => {
      const command = new Command('Test Command', { world });
      command.addAndExecute(createMockOperation('test'));
      command.commit();
      commandStack.push(command);
      commandStack.undo();
      
      expect(commandStack.canRedo()).toBe(true);
    });

    it('should return false after redoing all commands', () => {
      const command = new Command('Test Command', { world });
      command.addAndExecute(createMockOperation('test'));
      command.commit();
      commandStack.push(command);
      commandStack.undo();
      commandStack.redo();
      
      expect(commandStack.canRedo()).toBe(false);
    });

    it('should return false after new command execution', () => {
      const cmd1 = new Command('Command 1', { world });
      cmd1.addAndExecute(createMockOperation('1'));
      cmd1.commit();
      commandStack.push(cmd1);
      commandStack.undo();
      
      expect(commandStack.canRedo()).toBe(true);
      
      const cmd2 = new Command('Command 2', { world });
      cmd2.addAndExecute(createMockOperation('2'));
      cmd2.commit();
      commandStack.push(cmd2);
      
      expect(commandStack.canRedo()).toBe(false);
    });
  });

  describe('Stack Counts', () => {
    it('should track undo stack size correctly', () => {
      expect(commandStack.getUndoCount()).toBe(0);
      
      const cmd1 = new Command('Command 1', { world });
      cmd1.addAndExecute(createMockOperation('1'));
      cmd1.commit();
      commandStack.push(cmd1);
      expect(commandStack.getUndoCount()).toBe(1);
      
      const cmd2 = new Command('Command 2', { world });
      cmd2.addAndExecute(createMockOperation('2'));
      cmd2.commit();
      commandStack.push(cmd2);
      expect(commandStack.getUndoCount()).toBe(2);
      
      commandStack.undo();
      expect(commandStack.getUndoCount()).toBe(1);
    });

    it('should track redo stack size correctly', () => {
      expect(commandStack.getRedoCount()).toBe(0);
      
      const cmd1 = new Command('Command 1', { world });
      cmd1.addAndExecute(createMockOperation('1'));
      cmd1.commit();
      commandStack.push(cmd1);
      commandStack.undo();
      expect(commandStack.getRedoCount()).toBe(1);
      
      const cmd2 = new Command('Command 2', { world });
      cmd2.addAndExecute(createMockOperation('2'));
      cmd2.commit();
      commandStack.push(cmd2);
      expect(commandStack.getRedoCount()).toBe(0);
    });
  });

  describe('clear()', () => {
    it('should clear both stacks', () => {
      const cmd1 = new Command('Command 1', { world });
      cmd1.addAndExecute(createMockOperation('1'));
      cmd1.commit();
      commandStack.push(cmd1);
      
      const cmd2 = new Command('Command 2', { world });
      cmd2.addAndExecute(createMockOperation('2'));
      cmd2.commit();
      commandStack.push(cmd2);
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
      const command = new Command('Test Command', { world });
      command.addAndExecute(createMockOperation('test'));
      command.commit();
      
      // Push
      commandStack.push(command);
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
      const commands = [1, 2, 3].map(i => {
        const cmd = new Command(`Command ${i}`, { world });
        cmd.addAndExecute(createMockOperation(`${i}`));
        cmd.commit();
        return cmd;
      });
      
      // Execute all
      commands.forEach(cmd => commandStack.push(cmd));
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

  describe('restoreCommittedCommands()', () => {
    it('restores committed history and clears redo state', () => {
      const cmd1 = Command.restore({ id: 'cmd-1', timestamp: '2024-01-01T00:00:00.000Z', description: 'Restored 1', operations: [createMockOperation('1')] }, world);
      const cmd2 = Command.restore({ id: 'cmd-2', timestamp: '2024-01-02T00:00:00.000Z', description: 'Restored 2', operations: [createMockOperation('2')] }, world);

      commandStack.restoreCommittedCommands([cmd1, cmd2]);

      expect(commandStack.getCommittedCommands()).toEqual([cmd1, cmd2]);
      expect(commandStack.getUndoCount()).toBe(2);
      expect(commandStack.getRedoCount()).toBe(0);
      expect(commandStack.canUndo()).toBe(true);
      expect(commandStack.canRedo()).toBe(false);
    });

    it('rejects non-committed command history', () => {
      const cmd = new Command('Building', { world });
      cmd.addAndExecute(createMockOperation('building'));

      expect(() => commandStack.restoreCommittedCommands([cmd])).toThrow('Can only restore committed commands');
    });
  });

});

/**
 * CommandStack - Manages undo/redo history
 * 
 * Maintains two stacks:
 * - undoStack: Commands that can be undone
 * - redoStack: Commands that have been undone and can be redone
 * 
 * Behavior:
 * - push(): records committed commands and clears redo stack
 * - undo(): Pops from undo stack, pushes to redo stack
 * - redo(): Pops from redo stack, pushes back to undo stack
 */

import { Command, CommandStatus } from './Command';

type Unsubscribe = () => void;
type ChangeListener = () => void;

export class CommandStack {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private listeners: ChangeListener[] = [];

  /**
   * Subscribe to changes in the stack
   * @param callback Function to call when stack changes (push, undo, redo)
   * @returns Unsubscribe function
   */
  subscribe(callback: ChangeListener): Unsubscribe {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notify(): void {
    this.listeners.forEach(cb => cb());
  }

  /**
   * Push a pre-built and committed command to the undo stack
   * Clears the redo stack (can't redo after new action)
   * 
   * Non-undoable commands (canUndo() === false) are not added to the stack.
   * This allows world initialization and other non-undoable commands to execute
   * without appearing in undo history.
   * 
   * Note: Commands should be built, executed, and committed by application use cases before pushing.
   */
  push(command: Command): void {
    // Verify command is committed (not building)
    if (command.status !== 'committed') {
      throw new Error('Can only push committed commands to stack');
    }
    
    // Skip non-undoable commands
    if (!command.canUndo()) {
      return;
    }
    
    // Add to undo stack
    this.undoStack.push(command);
    
    // Clear redo stack (new action invalidates redo history)
    this.redoStack = [];
    
    this.notify();
  }

  /**
   * Undo the most recent command
   * Moves command from undo stack to redo stack
   */
  undo(): void {
    if (this.undoStack.length === 0) {
      throw new Error('Nothing to undo');
    }
    
    const command = this.undoStack.pop()!;
    command.undo();
    this.redoStack.push(command);
    
    this.notify();
  }

  /**
   * Redo the most recently undone command
   * Moves command from redo stack back to undo stack
   */
  redo(): void {
    if (this.redoStack.length === 0) {
      throw new Error('Nothing to redo');
    }
    
    const command = this.redoStack.pop()!;
    command.redo();
    this.undoStack.push(command);
    
    this.notify();
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * Get number of commands in undo stack
   */
  getUndoCount(): number {
    return this.undoStack.length;
  }

  /**
   * Get number of commands in redo stack
   */
  getRedoCount(): number {
    return this.redoStack.length;
  }

  /**
   * Get commands from undo stack for serialization
   */
  getCommands(): readonly Command[] {
    return [...this.undoStack];
  }

  getCommittedCommands(): readonly Command[] {
    return this.getCommands();
  }

  restoreCommittedCommands(commands: readonly Command[]): void {
    for (const command of commands) {
      if (command.status !== CommandStatus.Committed) {
        throw new Error('Can only restore committed commands');
      }
    }
    this.undoStack = [...commands];
    this.redoStack = [];
    this.notify();
  }

  /**
   * Clear all history
   */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.notify();
  }
}

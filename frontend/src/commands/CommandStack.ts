/**
 * CommandStack - Manages undo/redo history
 * 
 * Maintains two stacks:
 * - undoStack: Commands that can be undone
 * - redoStack: Commands that have been undone and can be redone
 * 
 * Reference: specs/001-dihedral-learning-mvp/data-model.md §Command Pattern
 * 
 * Behavior:
 * - execute(): Adds command to undo stack, clears redo stack
 * - undo(): Pops from undo stack, pushes to redo stack
 * - redo(): Pops from redo stack, pushes back to undo stack
 */

import { Command } from './Command';

export class CommandStack {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];

  /**
   * Execute a command and add it to the undo stack
   * Clears the redo stack (can't redo after new action)
   */
  execute(command: Command): void {
    // Execute the command
    command.execute();
    
    // Commit it
    command.commit();
    
    // Add to undo stack
    this.undoStack.push(command);
    
    // Clear redo stack (new action invalidates redo history)
    this.redoStack = [];
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
   * Clear all history
   */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
}

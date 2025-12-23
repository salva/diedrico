/**
 * CommandStack - manages command history for undo/redo
 */

import { Command } from './Command';
import { CommandStatus } from '../types/CommandTypes';

export class CommandStack {
  private commands: Command[] = [];
  private currentIndex: number = -1;
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  /**
   * Commit a built command to the stack
   */
  commit(command: Command): void {
    if (command.status !== CommandStatus.Building) {
      throw new Error('Can only commit building commands');
    }

    // Finalize command
    command.commit();

    // Remove any commands after current index (redo history)
    this.commands = this.commands.slice(0, this.currentIndex + 1);

    // Add new command
    this.commands.push(command);
    this.currentIndex++;

    // Enforce max size
    if (this.commands.length > this.maxSize) {
      this.commands.shift();
      this.currentIndex--;
    }
  }

  /**
   * Undo the last committed command
   */
  undo(): boolean {
    if (!this.canUndo()) {
      return false;
    }

    const command = this.commands[this.currentIndex];
    command.undo();
    this.currentIndex--;

    return true;
  }

  /**
   * Redo the next undone command
   */
  redo(): boolean {
    if (!this.canRedo()) {
      return false;
    }

    this.currentIndex++;
    const command = this.commands[this.currentIndex];
    command.redo();

    return true;
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.currentIndex >= 0;
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.currentIndex < this.commands.length - 1;
  }

  /**
   * Get description of command that would be undone
   */
  getUndoDescription(): string | null {
    if (!this.canUndo()) {
      return null;
    }
    return this.commands[this.currentIndex].description;
  }

  /**
   * Get description of command that would be redone
   */
  getRedoDescription(): string | null {
    if (!this.canRedo()) {
      return null;
    }
    return this.commands[this.currentIndex + 1].description;
  }

  /**
   * Clear all command history
   */
  clear(): void {
    this.commands = [];
    this.currentIndex = -1;
  }

  /**
   * Get stack state for debugging/UI
   */
  getState() {
    return {
      totalCommands: this.commands.length,
      currentIndex: this.currentIndex,
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      commands: this.commands.map(cmd => ({
        id: cmd.id,
        description: cmd.description,
        operationCount: cmd.operations.length,
        status: cmd.status
      }))
    };
  }
}

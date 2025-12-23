/**
 * Command class - groups multiple operations together
 * Implements incremental execution pattern: operations execute as they're added
 */

import type { OperationResult, CommandStatus } from '../types/CommandTypes';
import { CommandStatus as Status } from '../types/CommandTypes';

export interface Operation {
  id: string;
  type: string;
  args: Record<string, any>;
  execute(): OperationResult;
  rollback(): void;
}

export class Command {
  id: string;
  description: string;
  operations: Operation[] = [];
  status: CommandStatus = Status.Building;
  timestamp: Date;

  constructor(id: string, description: string) {
    this.id = id;
    this.description = description;
    this.timestamp = new Date();
  }

  /**
   * Add and immediately execute an operation
   * Returns operation result for dependency resolution
   */
  addAndExecute(operation: Operation): OperationResult {
    if (this.status !== Status.Building) {
      throw new Error('Cannot add operations to non-building command');
    }

    try {
      const result = operation.execute();
      
      if (!result.success) {
        // Operation failed, rollback entire command
        this.rollback();
        throw new Error(`Operation failed: ${result.error}`);
      }

      this.operations.push(operation);
      return result;
    } catch (error) {
      // Execution threw, rollback what we've done so far
      this.rollback();
      throw error;
    }
  }

  /**
   * Commit the command (finalize and add to stack)
   */
  commit(): void {
    if (this.operations.length === 0) {
      throw new Error('Cannot commit empty command');
    }
    this.status = Status.Committed;
  }

  /**
   * Rollback all executed operations (for failed commands)
   */
  rollback(): void {
    // Rollback in reverse order
    for (let i = this.operations.length - 1; i >= 0; i--) {
      try {
        this.operations[i].rollback();
      } catch (error) {
        console.error(`Failed to rollback operation ${i}:`, error);
      }
    }
    this.operations = [];
    this.status = Status.Building;
  }

  /**
   * Undo a committed command
   */
  undo(): void {
    if (this.status !== Status.Committed) {
      throw new Error('Can only undo committed commands');
    }

    for (let i = this.operations.length - 1; i >= 0; i--) {
      this.operations[i].rollback();
    }

    this.status = Status.Undone;
  }

  /**
   * Redo an undone command
   */
  redo(): void {
    if (this.status !== Status.Undone) {
      throw new Error('Can only redo undone commands');
    }

    for (const operation of this.operations) {
      const result = operation.execute();
      if (!result.success) {
        throw new Error(`Redo failed: ${result.error}`);
      }
    }

    this.status = Status.Committed;
  }

  /**
   * Get command summary for UI display
   */
  getSummary(): string {
    return `${this.description} (${this.operations.length} operations)`;
  }
}

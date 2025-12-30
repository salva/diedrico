/**
 * Command - Base class for user actions composed from operations
 * 
 * Commands represent complete user actions that can be executed and undone.
 * They are composed from one or more Operations that execute incrementally.
 * 
 * Reference: specs/001-dihedral-learning-mvp/data-model.md §Command Pattern
 * 
 * Key Principles:
 * - Operations execute immediately when added (incremental execution)
 * - Later operations can use outputs from earlier operations
 * - If any operation fails, entire command is rolled back
 * - Commands maintain status: Building → Committed → Undone
 */

import type { IOperation, OperationResult } from './operations/IOperation';
import type { World } from '@/domain/world/World';

export enum CommandStatus {
  Building = 'building',      // Operations being added/executed
  Committed = 'committed',    // Command complete, in undo stack
  Undone = 'undone'           // Command has been undone
}

export abstract class Command {
  readonly id: string;
  readonly timestamp: Date;
  readonly description: string;
  protected operations: IOperation[] = [];
  protected _status: CommandStatus = CommandStatus.Building;
  protected world: World;

  constructor(description: string, world: World) {
    this.id = this.generateId();
    this.timestamp = new Date();
    this.description = description;
    this.world = world;
  }

  /**
   * Get current command status
   */
  get status(): CommandStatus {
    return this._status;
  }

  /**
   * Add and immediately execute an operation
   * This is the core of incremental execution
   */
  addAndExecute(operation: IOperation): OperationResult {
    if (this._status !== CommandStatus.Building) {
      throw new Error('Cannot add operations to non-building command');
    }

    try {
      // Execute operation immediately
      const result = operation.apply(this.world);
      
      if (!result.success) {
        // Operation failed, rollback everything
        this.rollback();
        throw new Error(result.error || 'Operation failed');
      }
      
      // Store operation for undo
      this.operations.push(operation);
      
      return result;
    } catch (error) {
      // Operation failed, rollback entire command
      this.rollback();
      throw error;
    }
  }

  /**
   * Finalize command and prepare for adding to undo stack
   */
  commit(): void {
    if (this.operations.length === 0) {
      throw new Error('Cannot commit empty command');
    }
    this._status = CommandStatus.Committed;
  }

  /**
   * Rollback all executed operations (for failed commands)
   * Returns command to building state with no operations
   */
  rollback(): void {
    // Undo in reverse order
    for (let i = this.operations.length - 1; i >= 0; i--) {
      this.operations[i].undo(this.world);
    }
    this.operations = [];
    this._status = CommandStatus.Building;
  }

  /**
   * Undo a committed command
   * Reverses all operations in reverse order
   */
  undo(): void {
    if (this._status !== CommandStatus.Committed) {
      throw new Error('Can only undo committed commands');
    }
    
    // Undo in reverse order
    for (let i = this.operations.length - 1; i >= 0; i--) {
      this.operations[i].undo(this.world);
    }
    
    this._status = CommandStatus.Undone;
  }

  /**
   * Redo an undone command
   * Reapplies all operations in original order
   */
  redo(): void {
    if (this._status !== CommandStatus.Undone) {
      throw new Error('Can only redo undone commands');
    }
    
    // Reapply in original order
    for (const operation of this.operations) {
      const result = operation.apply(this.world);
      if (!result.success) {
        throw new Error(`Redo failed: ${result.error}`);
      }
    }
    
    this._status = CommandStatus.Committed;
  }

  /**
   * Abstract method: subclasses implement to build and execute operations
   */
  abstract execute(): void;

  /**
   * Generate unique command ID
   */
  private generateId(): string {
    return `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

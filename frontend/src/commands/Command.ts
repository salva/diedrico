/**
 * Command - Base class for user actions composed from operations
 *
 * Commands represent complete user actions that can be executed and undone.
 * They are composed from one or more Operations that execute incrementally.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ARCHITECTURAL PRINCIPLE: Command MUST NOT be subclassed
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Command is a generic container for Operations. The command owns undo/redo
 * infrastructure and incremental rollback, while domain mutation logic belongs
 * in Operation implementations.
 *
 * Key principles:
 *
 * 1. **Generic Container Pattern**: Command is a generic container for Operations.
 *    It provides undo/redo infrastructure but contains NO domain logic.
 *
 * 2. **All Logic in Operations**: Domain logic (create point, add line, update style)
 *    belongs in Operation classes (AddFreePoint2DOp, AddLine2DOp, UpdateElementStyleOp).
 *    Operations implement the IOperation interface with apply() and undo() methods.
 *
 * 3. **Operation Chaining**: Commands enable incremental execution where later operations
 *    can use outputs from earlier operations. Example:
 *    ```typescript
   *    const cmd = new Command("Create segment", context);
 *    const p1Result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, pos1));
 *    const p2Result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, pos2));
 *    cmd.addAndExecute(new AddSegment2DOp(planeId, p1Result.outputs.pointId, p2Result.outputs.pointId));
 *    cmd.commit();
 *    ```
 *
 * 4. **Architectural Consistency**: Having Command subclasses encourages violating
 *    the Operation pattern and leads to inconsistent architecture.
 *
 * 5. **Testability**: The generic Command + Operations pattern is easier to test
 *    because each Operation can be tested independently.
 *
 * CORRECT USAGE:
 * - Application use cases and sequence factories create operations
 * - Commands add operations with `cmd.addAndExecute(operation)`
 * - Commands are committed and pushed through the application command boundary
 *
 * INCORRECT USAGE (DO NOT DO THIS):
 * - ❌ class CreatePointCommand extends Command { ... }
 * - ❌ class UpdateStyleCommand extends Command { ... }
 * - ❌ Overriding execute(), undo(), or redo() methods
 *
 * See UpdateElementStyleOp as example of correct pattern - it's an Operation,
 * not a Command subclass.
 *
 * This architectural rule is enforced by:
 * - This documentation comment
 * - @sealed JSDoc annotation
 * - Automated test in tests/unit/architecture/noCommandSubclasses.spec.ts
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Key Principles:
 * - Operations execute immediately when added (incremental execution)
 * - Later operations can use outputs from earlier operations
 * - If any operation fails, entire command is rolled back
 * - Commands maintain status: Building → Committed → Undone
 *
 * @sealed - This class must NOT be extended. All domain logic belongs in Operation classes.
 */

import type { IOperation, OperationDescriptor } from './operations/IOperation';
import type { OperationContext } from './operations/OperationContext';
import { serializeOperation } from './operations/OperationRegistry';
import type { ChangeNotifier } from '@/application/appShell/RuntimeChangePublisher';

const noopChangeNotifier: ChangeNotifier = { notifyChange: () => {} };
declare const AggregateError: {
  new(errors: Iterable<unknown>, message?: string): Error & { errors: unknown[] };
};

export interface CommandSnapshot {
  id: string;
  timestamp: string;
  description: string;
  status: CommandStatus;
  operations: OperationDescriptor[];
}

export interface RestoredCommandInput {
  id: string;
  timestamp: string | Date;
  description: string;
  operations: readonly IOperation[];
}

export enum CommandStatus {
  Building = 'building',      // Operations being added/executed
  Committed = 'committed',    // Command complete, in undo stack
  Undone = 'undone'           // Command has been undone
}

type RollbackState = 'not-started' | 'completed' | 'failed';

/**
 * Command - Generic container for operations
 * 
 * @sealed DO NOT SUBCLASS - All logic belongs in Operation classes
 */
export class Command {
  readonly id: string;
  readonly timestamp: Date;
  readonly description: string;
  protected operations: IOperation[] = [];
  protected _status: CommandStatus = CommandStatus.Building;
  protected context: OperationContext;
  protected notifier: ChangeNotifier;
  private rollbackState: RollbackState = 'not-started';
  private rollbackError: unknown;
  private executionAttemptedInGeneration = false;
  private failureRollbackAttempted = false;

  constructor(description: string, context: OperationContext, notifier: ChangeNotifier = noopChangeNotifier) {
    this.id = this.generateId();
    this.timestamp = new Date();
    this.description = description;
    this.context = context;
    this.notifier = notifier;
  }

  static restore(input: RestoredCommandInput, context: OperationContext, notifier: ChangeNotifier = noopChangeNotifier): Command {
    if (!input.id || !input.description) {
      throw new Error('Cannot restore command without id or description');
    }
    if (input.operations.length === 0) {
      throw new Error(`Cannot restore empty command: ${input.id}`);
    }
    const command = new Command(input.description, context, notifier);
    Object.defineProperty(command, 'id', { value: input.id, configurable: false });
    Object.defineProperty(command, 'timestamp', { value: input.timestamp instanceof Date ? input.timestamp : new Date(input.timestamp), configurable: false });
    command.operations = [...input.operations];
    command._status = CommandStatus.Committed;
    return command;
  }

  /**
   * Get the list of operations in this command (read-only access)
   */
  getOperations(): readonly IOperation[] {
    return this.operations;
  }

  hasCurrentExecutionAttempt(): boolean {
    return this.executionAttemptedInGeneration || this.failureRollbackAttempted;
  }

  toSnapshot(): CommandSnapshot {
    if (this._status !== CommandStatus.Committed) {
      throw new Error('Only committed commands can be snapshotted');
    }
    return {
      id: this.id,
      timestamp: this.timestamp.toISOString(),
      description: this.description,
      status: this._status,
      operations: this.operations.map(operation => serializeOperation(operation))
    };
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
  addAndExecute<TOperation extends IOperation>(operation: TOperation): ReturnType<TOperation['apply']> {
    if (this._status !== CommandStatus.Building) {
      throw new Error('Cannot add operations to non-building command');
    }

    this.prepareNewExecutionGenerationIfNeeded();

    try {
      // Execute operation immediately
      this.executionAttemptedInGeneration = true;
      const result = operation.apply(this.context);
      
      if (!result.success) {
        this.rollbackAfterFailure(new Error(result.error || 'Operation failed'));
      }
      
      // Store operation for undo
      this.operations.push(operation);
      
      // Notify world that changes have been made (for immediate reactive UI updates)
      // This ensures 3D view and other reactive components update as each operation executes,
      // not waiting for the entire command to be committed
      this.notifier.notifyChange();
      
      return result as ReturnType<TOperation['apply']>;
    } catch (error) {
      // Operation failed, rollback entire command
      this.rollbackAfterFailure(error);
    }
  }

  /**
   * Determines whether this command can be undone
   *
   * Non-undoable commands, such as bootstrap commands, are not added to the
   * undo stack. CommandStack checks this before adding commands.
   *
   * @returns true if command can be undone (default), false for non-undoable commands
   */
  canUndo(): boolean {
    return true;
  }

  /**
   * Finalize command and prepare for adding to undo stack
   */
  commit(): void {
    if (this.operations.length === 0) {
      throw new Error('Cannot commit empty command');
    }
    this._status = CommandStatus.Committed;
    // Note: No need to call markDirty() here - it's called after each operation in addAndExecute()
  }

  /**
   * Rollback all executed operations (for failed commands)
   * Returns command to building state with no operations
   */
  rollback(): void {
    if (this.rollbackState === 'completed' || this.rollbackState === 'failed') {
      return;
    }

    const hadOperations = this.operations.length > 0;
    try {
      // Undo in reverse order
      for (let i = this.operations.length - 1; i >= 0; i--) {
        this.operations[i].undo(this.context);
      }
    } catch (error) {
      this.rollbackState = 'failed';
      this.rollbackError = error;
      throw error;
    }
    this.operations = [];
    this._status = CommandStatus.Building;
    this.rollbackState = 'completed';
    this.executionAttemptedInGeneration = false;
    if (hadOperations) {
      this.notifier.notifyChange();
    }
  }

  rollbackAfterFailure(originalError: unknown): never {
    this.failureRollbackAttempted = true;
    if (this.rollbackState === 'not-started') {
      try {
        this.rollback();
      } catch (rollbackError) {
        throw new AggregateError([originalError, rollbackError], 'Command failed and rollback failed');
      }
    }
    if (this.rollbackState === 'failed') {
      if (originalError instanceof Error && originalError.name === 'AggregateError' && originalError.message === 'Command failed and rollback failed') {
        throw originalError;
      }
      throw new AggregateError([originalError, this.rollbackError], 'Command failed and rollback failed');
    }
    throw originalError;
  }

  private prepareNewExecutionGenerationIfNeeded(): void {
    if (this.operations.length === 0 && this.rollbackState === 'completed') {
      this.rollbackState = 'not-started';
      this.rollbackError = undefined;
      this.failureRollbackAttempted = false;
      this.executionAttemptedInGeneration = false;
    }
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
      this.operations[i].undo(this.context);
    }
    
    this._status = CommandStatus.Undone;
    
    // Notify world that changes have been made (for reactive UI updates)
    this.notifier.notifyChange();
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
      const result = operation.apply(this.context);
      if (!result.success) {
        throw new Error(`Redo failed: ${result.error}`);
      }
    }
    
    this._status = CommandStatus.Committed;
    
    // Notify world that changes have been made (for reactive UI updates)
    this.notifier.notifyChange();
  }

  /**
   * Generate unique command ID
   */
  private generateId(): string {
    return `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

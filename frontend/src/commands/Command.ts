/**
 * Command - Base class for user actions composed from operations
 * 
 * Commands represent complete user actions that can be executed and undone.
 * They are composed from one or more Operations that execute incrementally.
 * 
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * ARCHITECTURAL PRINCIPLE: Command MUST NOT be subclassed
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Per data-model.md §Command Pattern:
 * "Architecture: Single Command class (not subclasses) - the real logic is in Operation classes"
 * "No Subclasses Needed: Tools create operations directly and pass to generic Command"
 * 
 * WHY THIS MATTERS:
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
 *    const cmd = new Command("Create segment", world);
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
 * - Tools create Operations: `new AddFreePoint2DOp(planeId, position)`
 * - Tools create generic Command: `new Command("Create point", world)`
 * - Tools add operations: `cmd.addAndExecute(operation)`
 * - Tools commit: `cmd.commit()` and `commandStack.push(cmd)`
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

import type { IOperation, OperationResult, OperationDescriptor } from './operations/IOperation';
import { serializeOperation } from './operations/OperationRegistry';
import type { World } from '@/domain/world/World';

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
  protected world: World;

  constructor(description: string, world: World) {
    this.id = this.generateId();
    this.timestamp = new Date();
    this.description = description;
    this.world = world;
  }

  static restore(input: RestoredCommandInput, world: World): Command {
    if (!input.id || !input.description) {
      throw new Error('Cannot restore command without id and description');
    }
    if (input.operations.length === 0) {
      throw new Error(`Cannot restore empty command: ${input.id}`);
    }
    const command = new Command(input.description, world);
    Object.defineProperty(command, 'id', { value: input.id, configurable: false });
    Object.defineProperty(command, 'timestamp', { value: input.timestamp instanceof Date ? input.timestamp : new Date(input.timestamp), configurable: false });
    command.operations = [...input.operations];
    command._status = CommandStatus.Committed;
    return command;
  }

  /**
   * Get the list of operations in this command (read-only access)
   * Phase 114: Used for post-creation feasibility checking
   */
  getOperations(): readonly IOperation[] {
    return this.operations;
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
      
      // Notify world that changes have been made (for immediate reactive UI updates)
      // This ensures 3D view and other reactive components update as each operation executes,
      // not waiting for the entire command to be committed
      this.world.markDirty();
      
      return result;
    } catch (error) {
      // Operation failed, rollback entire command
      this.rollback();
      throw error;
    }
  }

  /**
   * Determines whether this command can be undone
   * 
   * Phase 47: Non-undoable commands (like world initialization) are not added to stack.
   * CommandStack checks this before adding commands to the undo stack.
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
    
    // Notify world that changes have been made (for reactive UI updates)
    this.world.markDirty();
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
    
    // Notify world that changes have been made (for reactive UI updates)
    this.world.markDirty();
  }

  /**
   * Generate unique command ID
   */
  private generateId(): string {
    return `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

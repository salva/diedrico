/**
 * ProcessTreeOperations - Operations for manipulating the construction history tree
 * 
 * These operations maintain stable indices using tombstone pattern:
 * - Removed actions leave null holes in children arrays
 * - Indices never shift, making undo/redo trivial
 * - Visualization skips over null entries
 * 
 */

import type { IOperation, OperationOutputBag, OperationResult } from '../IOperation';
import type { World } from '@/domain/world/World';
import type { ActionNode } from '@/domain/processTree/ProcessTree';

/**
 * RemoveActionFromProcessTreeOp - Remove an action from the construction history
 * 
 * Creates a tombstone (null) at the action's index. The index is preserved
 * so undo can restore the action at exactly the same position.
 * 
 * This is the primary operation used by DeleteElementsCommand.
 */
export class RemoveActionFromProcessTreeOp implements IOperation {
  readonly type = 'RemoveActionFromProcessTree';
  outputs: OperationOutputBag = {};
  
  // Stored for undo
  private removedAction?: ActionNode;
  private groupId?: string;
  private index?: number;

  constructor(
    private actionId: string
  ) {
  }

  apply(world: World): OperationResult {
    try {
      const processTree = world.getProcessTree();
      const result = processTree.removeAction(this.actionId);
      
      if (!result) {
        return {
          success: false,
          outputs: {},
          error: `Action ${this.actionId} not found in ProcessTree`
        };
      }
      
      // Store for undo
      this.removedAction = result.action;
      this.groupId = result.groupId;
      this.index = result.index;
      
      this.outputs = { 
        removedActionId: this.actionId,
        groupId: result.groupId,
        index: result.index
      };
      
      return {
        success: true,
        outputs: this.outputs
      };
    } catch (error) {
      return {
        success: false,
        outputs: {},
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  undo(world: World): void {
    if (!this.removedAction || this.groupId === undefined || this.index === undefined) {
      throw new Error('Cannot undo: no action data stored');
    }

    const processTree = world.getProcessTree();
    processTree.restoreAction(this.removedAction, this.groupId, this.index);
  }

  serialize() {
    return { opType: this.type, actionId: this.actionId, outputs: this.outputs };
  }
}

/**
 * ProcessTreeOperations - Operations for manipulating the construction history tree
 * 
 * These operations maintain stable indices using tombstone pattern:
 * - Removed actions leave null holes in children arrays
 * - Indices never shift, making undo/redo trivial
 * - Visualization skips over null entries
 * 
 */

import type { IOperation, OperationDescriptor, OperationOutputBag, OperationResult } from '../IOperation';
import type { OperationContext } from '../OperationContext';
import type { RemovedActionMetadata } from '@/domain/processTree/ProcessTree';
import type { ActionNodeDescriptorV8 } from './AddProcessTreeActionOp';
import { actionNodeToDescriptor } from './AddProcessTreeActionOp';

export interface RemoveActionFromProcessTreeDescriptorV8 extends OperationDescriptor<'RemoveActionFromProcessTree'> {
  schemaVersion: '8.0.0';
  groupId: string;
  actionId: string;
  removedActionNode: ActionNodeDescriptorV8;
  originalIndex: number;
  previousSiblingId?: string;
  nextSiblingId?: string;
}

/**
 * RemoveActionFromProcessTreeOp - Remove an action from the construction history
 * 
 * Creates a tombstone (null) at the action's index. The index is preserved
 * so undo can restore the action at exactly the same position.
 * 
 * This is the primary operation used by DeleteElementsCommand.
 */
export class RemoveActionFromProcessTreeOp implements IOperation<RemoveActionFromProcessTreeDescriptorV8> {
  readonly type = 'RemoveActionFromProcessTree';
  outputs: OperationOutputBag = {};
  
  private removed?: RemovedActionMetadata;

  constructor(
    private actionId: string,
    restoredMetadata?: RemovedActionMetadata,
  ) {
    this.removed = restoredMetadata;
  }

  apply(context: OperationContext): OperationResult {
    try {
      const processTree = context.processTree;
      const result = processTree.removeAction(this.actionId);

      if (!result) {
        return {
          success: false,
          outputs: {},
          error: `Action ${this.actionId} not found in ProcessTree`
        };
      }
      
      this.removed = result;

      this.outputs = {
        removedActionId: this.actionId,
        groupId: result.groupId,
        index: result.originalIndex
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

  undo(context: OperationContext): void {
    if (!this.removed) {
      throw new Error('Cannot undo: no action data stored');
    }

    context.processTree.restoreAction(this.removed);
  }

  serialize(): RemoveActionFromProcessTreeDescriptorV8 {
    if (!this.removed) throw new Error('Cannot serialize RemoveActionFromProcessTreeOp before apply');
    return {
      opType: this.type,
      schemaVersion: '8.0.0' as const,
      groupId: this.removed.groupId,
      actionId: this.actionId,
      removedActionNode: actionNodeToDescriptor(this.removed.actionNode),
      originalIndex: this.removed.originalIndex,
      previousSiblingId: this.removed.previousSiblingId,
      nextSiblingId: this.removed.nextSiblingId,
    };
  }
}

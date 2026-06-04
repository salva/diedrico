/**
 * AddProcessTreeActionOp - Operation for adding ProcessTree actions
 * 
 * Wraps ProcessTree action registration as an undoable operation.
 * This ensures that when commands are undone, both the element AND its
 * ProcessTree action are removed, preventing orphaned dependency entries.
 * 
 */

import type { IOperation, JsonObject, OperationOutputBag, OperationResult } from '../IOperation';
import type { World } from '@/domain/world/World';
import type { Action } from '@/domain/processTree/Action';
import { operationSuccess } from '../operationResultHelpers';

export class AddProcessTreeActionOp implements IOperation {
  readonly type = 'AddProcessTreeActionOp';
  outputs: OperationOutputBag = {};

  constructor(private readonly action: Action, private readonly groupId: string) {
  }

  apply(world: World): OperationResult {
    // Add action to ProcessTree
    const action = this.action;
    
    // Add to existing group (Strict Mode: groupId is required)
    const index = world.getProcessTree().addActionToGroup(action, this.groupId);
    
    // Phase 93: Actions no longer have IDs - store elementId for tracking
    this.outputs = {
      elementId: action.elementId,  // Store elementId instead of action.id
      groupId: this.groupId,
      index: index
    };
    
    return operationSuccess(this.outputs);
  }

  undo(world: World): void {
    if (!this.outputs.elementId) {
      throw new Error('Cannot undo: operation was not applied');
    }
    
    // Phase 93: Remove action by elementId
    // Find the action that produced this element and remove it
    const actions = world.getProcessTree().getActionsProducingElement(this.outputs.elementId);
    if (actions.length > 0) {
      // Remove the most recent action (should be only one, but just in case)
      world.getProcessTree().removeActionByElementId(this.outputs.elementId);
    }

    // Removed fallback: We rely on AddProcessTreeActionGroupOp to manage group lifecycle.
    // If this op added an action to a group, undoing it naturally removes the action.
    // The group itself is handled by its own Op.

  }

  serialize() {
    const action: JsonObject = {
      elementId: this.action.elementId,
      description: this.action.description,
      isOutput: this.action.isOutput
    };
    return {
      opType: this.type,
      action,
      groupId: this.groupId,
      outputs: this.outputs
    };
  }
}

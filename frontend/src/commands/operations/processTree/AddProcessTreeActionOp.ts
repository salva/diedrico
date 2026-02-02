/**
 * AddProcessTreeActionOp - Operation for adding ProcessTree actions
 * 
 * Wraps ProcessTree action registration as an undoable operation.
 * This ensures that when commands are undone, both the element AND its
 * ProcessTree action are removed, preventing orphaned dependency entries.
 * 
 * Reference: specs/001-dihedral-learning-mvp/data-model.md §ProcessTree Action Registration (Phase 81)
 */

import type { IOperation, OperationResult } from '../IOperation';
import type { World } from '@/domain/world/World';
import type { Action } from '@/domain/processTree/Action';

export class AddProcessTreeActionOp implements IOperation {
  readonly type = 'AddProcessTreeActionOp';
  parameters: Record<string, any>;
  outputs: Record<string, any> = {};

  constructor(action: Action, private groupId: string) {
    // Store action in parameters for serializability
    this.parameters = {
      action: action,
      groupId: groupId
    };
  }

  apply(world: World): OperationResult {
    // Add action to ProcessTree
    const action = this.parameters.action as Action;
    
    // Add to existing group (Strict Mode: groupId is required)
    const index = world.getProcessTree().addActionToGroup(action, this.groupId);
    
    // Phase 93: Actions no longer have IDs - store elementId for tracking
    this.outputs = {
      elementId: action.elementId,  // Store elementId instead of action.id
      groupId: this.groupId,
      index: index
    };
    
    return {
      success: true,
      outputs: this.outputs
    };
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

    // Legacy fallback removed: We rely on AddProcessTreeActionGroupOp to manage group lifecycle.
    // If this op added an action to a group, undoing it naturally removes the action.
    // The group itself is handled by its own Op.

  }
}

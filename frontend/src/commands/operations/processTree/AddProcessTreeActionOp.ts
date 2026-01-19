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
  readonly type = 'AddProcessTreeAction';
  parameters: Record<string, any>;
  outputs: Record<string, any> = {};

  constructor(action: Action) {
    // Store action in parameters for serializability
    this.parameters = {
      action: action
    };
  }

  apply(world: World): OperationResult {
    // Add action to ProcessTree
    const action = this.parameters.action as Action;
    const actionGroup = world.getProcessTree().addAction(action);
    
    // Store the location for undo
    // The action is the first (and only) child in the newly created ActionGroup
    this.outputs = {
      actionId: action.id,
      groupId: actionGroup.id,
      index: 0
    };

    // Rebuild dependency maps to include new action
    world.getDependencyService().rebuildDependencyMaps();

    return {
      success: true,
      outputs: this.outputs
    };
  }

  undo(world: World): void {
    if (!this.outputs.actionId) {
      throw new Error('Cannot undo: operation was not applied');
    }

    // Remove action from ProcessTree
    world.getProcessTree().removeAction(this.outputs.actionId);

    // Rebuild dependency maps to remove stale references
    world.getDependencyService().rebuildDependencyMaps();
  }
}

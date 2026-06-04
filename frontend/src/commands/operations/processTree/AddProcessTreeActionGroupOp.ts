/**
 * AddProcessTreeActionGroupOp - Operation for adding an ActionGroup to the ProcessTree
 * 
 * Part of the split operation pattern for N-actions-1-group support.
 * This operation creates the container group, while AddProcessTreeActionOp adds items to it.
 */

import type { IOperation, OperationOutputBag, OperationResult } from '../IOperation';
import type { OperationContext } from '../OperationContext';
import type { ActionGroup } from '@/domain/processTree/ProcessTree';

export class AddProcessTreeActionGroupOp implements IOperation {
  readonly type = 'AddProcessTreeActionGroup';
  outputs: OperationOutputBag = {};

  // Transient reference to group (not serialized, rebuilt during apply?)
  // Ideally operations should be serializable.
  // Passing the full group object in constructor means we rely on the caller to create it.
  constructor(private group: ActionGroup) {
  }

  apply(context: OperationContext): OperationResult {
    context.processTree.addActionGroup(this.group);
    this.outputs = { groupId: this.group.id };
    
    // Dependency maps might refer to groups? Probably not, they refer to elements (actions).
    
    return { success: true, outputs: this.outputs };
  }

  undo(context: OperationContext): void {
    const processTree = context.processTree;
    processTree.removeActionGroup(this.group.id);
  }

  serialize() {
    return {
      opType: this.type,
      groupId: this.group.id,
      outputs: this.outputs
    };
  }
}

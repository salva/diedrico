/**
 * AddProcessTreeActionGroupOp - Operation for adding an ActionGroup to the ProcessTree
 * 
 * Part of the split operation pattern for N-actions-1-group support.
 * This operation creates the container group, while AddProcessTreeActionOp adds items to it.
 */

import type { IOperation, JsonObject, OperationDescriptor, OperationOutputBag, OperationResult } from '../IOperation';
import type { OperationContext } from '../OperationContext';
import type { ActionGroup } from '@/domain/processTree/ProcessTree';

interface ActionGroupDescriptorV8 extends JsonObject {
  id: string;
  type: 'actionGroup';
  created: string;
}

export interface AddProcessTreeActionGroupDescriptorV8 extends OperationDescriptor<'AddProcessTreeActionGroup'> {
  schemaVersion: '8.0.0';
  group: ActionGroupDescriptorV8;
}

function actionGroupToDescriptor(group: ActionGroup): ActionGroupDescriptorV8 {
  return { id: group.id, type: 'actionGroup', created: group.created.toISOString() };
}

export class AddProcessTreeActionGroupOp implements IOperation<AddProcessTreeActionGroupDescriptorV8> {
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

  serialize(): AddProcessTreeActionGroupDescriptorV8 {
    return {
      opType: this.type,
      schemaVersion: '8.0.0' as const,
      group: actionGroupToDescriptor(this.group),
    };
  }
}

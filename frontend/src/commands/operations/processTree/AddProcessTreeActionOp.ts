/**
 * AddProcessTreeActionOp - Operation for adding ProcessTree actions
 * 
 * Wraps ProcessTree action registration as an undoable operation.
 * This ensures that when commands are undone, both the element AND its
 * ProcessTree action are removed, preventing orphaned dependency entries.
 * 
 */

import type { IOperation, JsonObject, OperationDescriptor, OperationOutputBag, OperationResult } from '../IOperation';
import type { OperationContext } from '../OperationContext';
import type { Action } from '@/domain/processTree/Action';
import type { ActionNode } from '@/domain/processTree/ProcessTree';
import { operationSuccess } from '../operationResultHelpers';

export interface ActionNodeDescriptorV8 extends JsonObject {
  id: string;
  type: 'action';
  created: string;
  elementId: string;
  description: string;
}

export interface AddProcessTreeActionDescriptorV8 extends OperationDescriptor<'AddProcessTreeActionOp'> {
  schemaVersion: '8.0.0';
  groupId: string;
  actionNode: ActionNodeDescriptorV8;
}

export function actionNodeToDescriptor(actionNode: ActionNode): ActionNodeDescriptorV8 {
  return {
    id: actionNode.id,
    type: 'action',
    created: actionNode.created.toISOString(),
    elementId: actionNode.elementId,
    description: actionNode.description,
  };
}

export class AddProcessTreeActionOp implements IOperation<AddProcessTreeActionDescriptorV8> {
  readonly type = 'AddProcessTreeActionOp';
  outputs: OperationOutputBag = {};
  private actionNode?: ActionNode;

  constructor(private readonly action: Action | ActionNode, private readonly groupId: string) {
    if ('type' in action && action.type === 'action' && action.created instanceof Date) this.actionNode = action;
  }

  apply(context: OperationContext): OperationResult {
    const result = this.actionNode
      ? { actionNode: this.actionNode, index: context.processTree.insertActionNodeToGroup(this.actionNode, this.groupId) }
      : context.processTree.addActionToGroup(this.action, this.groupId);
    this.actionNode = result.actionNode;
    
    // Phase 93: Actions no longer have IDs - store elementId for tracking
    this.outputs = {
      actionId: result.actionNode.id,
      elementId: result.actionNode.elementId,
      groupId: this.groupId,
      index: result.index
    };
    
    return operationSuccess(this.outputs);
  }

  undo(context: OperationContext): void {
    if (!this.actionNode) {
      throw new Error('Cannot undo: operation was not applied');
    }
    context.processTree.removeAction(this.actionNode.id);
  }

  serialize(): AddProcessTreeActionDescriptorV8 {
    if (!this.actionNode) throw new Error('Cannot serialize AddProcessTreeActionOp before apply');
    return {
      opType: this.type,
      schemaVersion: '8.0.0' as const,
      actionNode: actionNodeToDescriptor(this.actionNode),
      groupId: this.groupId,
    };
  }
}

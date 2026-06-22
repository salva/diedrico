/**
 * ToggleOutputOp - Toggle "isOutput" status of a node
 */

import type { IOperation, OperationDescriptor, OperationOutputBag, OperationResult } from '../IOperation';
import type { OperationContext } from '../OperationContext';

export interface ToggleOutputDescriptorV8 extends OperationDescriptor<'ToggleOutput'> {
  schemaVersion: '8.0.0';
  nodeId: string;
}

export class ToggleOutputOp implements IOperation<ToggleOutputDescriptorV8> {
  readonly type = 'ToggleOutput';
  outputs: OperationOutputBag = {};

  constructor(private readonly nodeId: string) {
  }

  apply(context: OperationContext): OperationResult {
    const processTree = context.processTree;
    try {
      const node = processTree.findNodeById(this.nodeId);
      if (!node) throw new Error(`ProcessTree node not found: ${this.nodeId}`);
      context.visibilityModel.toggleOutput(this.nodeId, node.type);
      return { success: true, outputs: this.outputs };
    } catch (e: any) {
      return { success: false, outputs: {}, error: e.message };
    }
  }

  undo(context: OperationContext): void {
    const processTree = context.processTree;
    const node = processTree.findNodeById(this.nodeId);
    if (!node) throw new Error(`ProcessTree node not found: ${this.nodeId}`);
    context.visibilityModel.toggleOutput(this.nodeId, node.type);
  }

  serialize(): ToggleOutputDescriptorV8 {
    return { opType: this.type, schemaVersion: '8.0.0' as const, nodeId: this.nodeId };
  }
}

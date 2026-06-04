/**
 * ToggleOutputOp - Toggle "isOutput" status of a node
 */

import type { IOperation, OperationOutputBag, OperationResult } from '../IOperation';
import type { OperationContext } from '../OperationContext';

export class ToggleOutputOp implements IOperation {
  readonly type = 'ToggleOutput';
  outputs: OperationOutputBag = {};

  constructor(private readonly nodeId: string) {
  }

  apply(context: OperationContext): OperationResult {
    const processTree = context.world.getProcessTree();
    try {
      processTree.toggleOutput(this.nodeId);
      return { success: true, outputs: this.outputs };
    } catch (e: any) {
      return { success: false, outputs: {}, error: e.message };
    }
  }

  undo(context: OperationContext): void {
    const processTree = context.world.getProcessTree();
    processTree.toggleOutput(this.nodeId);
  }

  serialize() {
    return { opType: this.type, nodeId: this.nodeId };
  }
}

/**
 * ToggleEncapsulationOp - Toggle encapsulation (black-box) mode of a subprocess
 */

import type { IOperation, OperationOutputBag, OperationResult } from '../IOperation';
import type { OperationContext } from '../OperationContext';

export class ToggleEncapsulationOp implements IOperation {
  readonly type = 'ToggleEncapsulation';
  outputs: OperationOutputBag = {};

  constructor(private readonly subprocessId: string) {
  }

  apply(context: OperationContext): OperationResult {
    const processTree = context.processTree;
    try {
      if (!processTree.findSubprocessById(this.subprocessId)) throw new Error(`Subprocess not found: ${this.subprocessId}`);
      const current = context.visibilityModel.get(this.subprocessId, 'subprocess');
      context.visibilityModel.setShowIntermediates(this.subprocessId, !current.showIntermediates);
      return { success: true, outputs: this.outputs };
    } catch (e: any) {
      return { success: false, outputs: {}, error: e.message };
    }
  }

  undo(context: OperationContext): void {
    const processTree = context.processTree;
    if (!processTree.findSubprocessById(this.subprocessId)) throw new Error(`Subprocess not found: ${this.subprocessId}`);
    const current = context.visibilityModel.get(this.subprocessId, 'subprocess');
    context.visibilityModel.setShowIntermediates(this.subprocessId, !current.showIntermediates);
  }

  serialize() {
    return { opType: this.type, subprocessId: this.subprocessId };
  }
}

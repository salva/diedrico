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
    const processTree = context.world.getProcessTree();
    try {
      processTree.toggleSubprocessEncapsulation(this.subprocessId);
      return { success: true, outputs: this.outputs };
    } catch (e: any) {
      return { success: false, outputs: {}, error: e.message };
    }
  }

  undo(context: OperationContext): void {
    const processTree = context.world.getProcessTree();
    processTree.toggleSubprocessEncapsulation(this.subprocessId);
  }

  serialize() {
    return { opType: this.type, subprocessId: this.subprocessId };
  }
}

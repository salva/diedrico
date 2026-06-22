/**
 * ToggleEncapsulationOp - Toggle encapsulation (black-box) mode of a subprocess
 */

import type { IOperation, OperationDescriptor, OperationOutputBag, OperationResult } from '../IOperation';
import type { OperationContext } from '../OperationContext';

export interface ToggleEncapsulationDescriptorV8 extends OperationDescriptor<'ToggleEncapsulation'> {
  schemaVersion: '8.0.0';
  subprocessId: string;
}

export class ToggleEncapsulationOp implements IOperation<ToggleEncapsulationDescriptorV8> {
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

  serialize(): ToggleEncapsulationDescriptorV8 {
    return { opType: this.type, schemaVersion: '8.0.0' as const, subprocessId: this.subprocessId };
  }
}

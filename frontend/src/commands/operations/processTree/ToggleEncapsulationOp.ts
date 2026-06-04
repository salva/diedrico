/**
 * ToggleEncapsulationOp - Toggle encapsulation (black-box) mode of a subprocess
 */

import type { IOperation, OperationOutputBag, OperationResult } from '../IOperation';
import type { World } from '@/domain/world/World';

export class ToggleEncapsulationOp implements IOperation {
  readonly type = 'ToggleEncapsulation';
  outputs: OperationOutputBag = {};

  constructor(private readonly subprocessId: string) {
  }

  apply(world: World): OperationResult {
    const processTree = world.getProcessTree();
    try {
      processTree.toggleSubprocessEncapsulation(this.subprocessId);
      return { success: true, outputs: this.outputs };
    } catch (e: any) {
      return { success: false, outputs: {}, error: e.message };
    }
  }

  undo(world: World): void {
    const processTree = world.getProcessTree();
    processTree.toggleSubprocessEncapsulation(this.subprocessId);
  }

  serialize() {
    return { opType: this.type, subprocessId: this.subprocessId };
  }
}

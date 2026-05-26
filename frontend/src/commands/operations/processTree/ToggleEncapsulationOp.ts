/**
 * ToggleEncapsulationOp - Toggle encapsulation (black-box) mode of a subprocess
 */

import type { IOperation, OperationResult } from '../IOperation';
import type { World } from '@/domain/world/World';

export class ToggleEncapsulationOp implements IOperation {
  readonly type = 'ToggleEncapsulation';
  parameters: Record<string, any>;
  outputs: Record<string, any> = {};

  constructor(private readonly subprocessId: string) {
    this.parameters = { subprocessId };
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

  redo(world: World): void {
    const processTree = world.getProcessTree();
    processTree.toggleSubprocessEncapsulation(this.subprocessId);
  }

  serialize() {
    return { opType: this.type, subprocessId: this.parameters.subprocessId };
  }
}

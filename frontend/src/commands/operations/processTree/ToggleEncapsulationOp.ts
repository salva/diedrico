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
      console.log(`[ToggleEncapsulationOp.apply] subprocessId: ${this.subprocessId}`);
      processTree.toggleSubprocessEncapsulation(this.subprocessId);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  undo(world: World): void {
    const processTree = world.getProcessTree();
    processTree.toggleSubprocessEncapsulation(this.subprocessId);
  }

  redo(world: World): void {
    const processTree = world.getProcessTree();
    console.log(`[ToggleEncapsulationOp.redo] subprocessId: ${this.subprocessId}`);
    processTree.toggleSubprocessEncapsulation(this.subprocessId);
  }
}

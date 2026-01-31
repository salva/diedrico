/**
 * ToggleSubprocessVisibilityOp - Toggle visibility of a subprocess
 */

import type { IOperation, OperationResult } from '../IOperation';
import type { World } from '@/domain/world/World';

export class ToggleSubprocessVisibilityOp implements IOperation {
  readonly type = 'ToggleSubprocessVisibility';
  parameters: Record<string, any>;
  outputs: Record<string, any> = {};

  constructor(private readonly subprocessId: string) {
    this.parameters = { subprocessId };
  }

  apply(world: World): OperationResult {
    const processTree = world.getProcessTree();
    try {
      // Just toggle
      processTree.toggleSubprocessVisibility(this.subprocessId);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  undo(world: World): void {
    // Inverse of toggle is toggle
    const processTree = world.getProcessTree();
    processTree.toggleSubprocessVisibility(this.subprocessId);
  }

  redo(world: World): void {
    const processTree = world.getProcessTree();
    processTree.toggleSubprocessVisibility(this.subprocessId);
  }
}

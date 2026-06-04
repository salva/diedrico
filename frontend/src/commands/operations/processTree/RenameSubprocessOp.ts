/**
 * RenameSubprocessOp - Rename a subprocess in the ProcessTree
 */

import type { IOperation, OperationOutputBag, OperationResult } from '../IOperation';
import type { World } from '@/domain/world/World';

export class RenameSubprocessOp implements IOperation {
  readonly type = 'RenameSubprocess';
  outputs: OperationOutputBag = {};
  private oldName: string | null = null;

  constructor(private readonly subprocessId: string, private readonly newName: string) {
  }

  apply(world: World): OperationResult {
    const processTree = world.getProcessTree();
    const subprocess = processTree.findSubprocessById(this.subprocessId);
    
    if (!subprocess) {
      return { success: false, outputs: {}, error: `Subprocess not found: ${this.subprocessId}` };
    }

    if (this.oldName === null) {
      this.oldName = subprocess.name;
    }

    processTree.renameSubprocess(this.subprocessId, this.newName);
    return { success: true, outputs: this.outputs };
  }

  undo(world: World): void {
    if (this.oldName !== null) {
      const processTree = world.getProcessTree();
      processTree.renameSubprocess(this.subprocessId, this.oldName);
    }
  }

  serialize() {
    return { opType: this.type, subprocessId: this.subprocessId, newName: this.newName };
  }
}

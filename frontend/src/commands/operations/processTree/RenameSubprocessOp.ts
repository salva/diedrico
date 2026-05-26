/**
 * RenameSubprocessOp - Rename a subprocess in the ProcessTree
 */

import type { IOperation, OperationResult } from '../IOperation';
import type { World } from '@/domain/world/World';

export class RenameSubprocessOp implements IOperation {
  readonly type = 'RenameSubprocess';
  parameters: Record<string, any>;
  outputs: Record<string, any> = {};
  private oldName: string | null = null;

  constructor(private readonly subprocessId: string, private readonly newName: string) {
    this.parameters = { subprocessId, newName };
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

  redo(world: World): void {
    const processTree = world.getProcessTree();
    processTree.renameSubprocess(this.subprocessId, this.newName);
  }

  serialize() {
    return { opType: this.type, subprocessId: this.parameters.subprocessId, newName: this.parameters.newName };
  }
}

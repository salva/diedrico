/**
 * RenameSubprocessOp - Rename a subprocess in the ProcessTree
 */

import type { IOperation, OperationOutputBag, OperationResult } from '../IOperation';
import type { OperationContext } from '../OperationContext';

export class RenameSubprocessOp implements IOperation {
  readonly type = 'RenameSubprocess';
  outputs: OperationOutputBag = {};
  private oldName: string | null = null;

  constructor(private readonly subprocessId: string, private readonly newName: string) {
  }

  apply(context: OperationContext): OperationResult {
    const processTree = context.processTree;
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

  undo(context: OperationContext): void {
    if (this.oldName !== null) {
      const processTree = context.processTree;
      processTree.renameSubprocess(this.subprocessId, this.oldName);
    }
  }

  serialize() {
    return { opType: this.type, subprocessId: this.subprocessId, newName: this.newName };
  }
}

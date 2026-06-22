/**
 * RenameSubprocessOp - Rename a subprocess in the ProcessTree
 */

import type { IOperation, OperationDescriptor, OperationOutputBag, OperationResult } from '../IOperation';
import type { OperationContext } from '../OperationContext';

export interface RenameSubprocessDescriptorV8 extends OperationDescriptor<'RenameSubprocess'> {
  schemaVersion: '8.0.0';
  subprocessId: string;
  newName: string;
}

export class RenameSubprocessOp implements IOperation<RenameSubprocessDescriptorV8> {
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

  serialize(): RenameSubprocessDescriptorV8 {
    return { opType: this.type, schemaVersion: '8.0.0' as const, subprocessId: this.subprocessId, newName: this.newName };
  }
}

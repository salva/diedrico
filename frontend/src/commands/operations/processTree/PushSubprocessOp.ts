/**
 * PushSubprocessOp - Push subprocess onto ProcessTree stack
 * 
 * Creates a new subprocess and pushes it onto the ProcessTree subprocess stack.
 * All subsequent actions will be added to this subprocess until it is popped.
 * 
 * Phase 85: ProcessTree Subprocess Stack Architecture
 */

import type { IOperation, JsonObject, OperationDescriptor, OperationOutputBag, OperationResult } from '../IOperation';
import type { OperationContext } from '../OperationContext';
import type { Subprocess } from '@/domain/processTree/ProcessTree';

interface SubprocessDescriptorV8 extends JsonObject {
  id: string;
  type: 'subprocess';
  created: string;
  name: string;
}

export interface PushSubprocessDescriptorV8 extends OperationDescriptor<'PushSubprocess'> {
  schemaVersion: '8.0.0';
  subprocess: SubprocessDescriptorV8;
}

function subprocessToDescriptor(subprocess: Subprocess): SubprocessDescriptorV8 {
  return { id: subprocess.id, type: 'subprocess', created: subprocess.created.toISOString(), name: subprocess.name };
}

export class PushSubprocessOp implements IOperation<PushSubprocessDescriptorV8> {
  readonly type = 'PushSubprocess';
  outputs: OperationOutputBag = {};

  private subprocess?: Subprocess;

  constructor(private readonly subprocessName: string, subprocess?: Subprocess) {
    this.subprocess = subprocess;
  }

  apply(context: OperationContext): OperationResult {
    const subprocess = this.subprocess ?? context.processTree.pushSubprocess(this.subprocessName);
    if (this.subprocess) {
      if (context.processTree.findNodeById(this.subprocess.id)) {
        context.processTree.restoreSubprocessToStack(this.subprocess.id);
      } else {
        context.processTree.insertSubprocess(this.subprocess);
      }
    }
    this.subprocess = subprocess;
    this.outputs = { subprocessId: subprocess.id };
    return { success: true, outputs: this.outputs };
  }

  undo(context: OperationContext): void {
    if (!this.subprocess) throw new Error('Cannot undo PushSubprocessOp before apply');
    context.processTree.undoSubprocessCreation(this.subprocess.id);
  }

  serialize(): PushSubprocessDescriptorV8 {
    if (!this.subprocess) throw new Error('Cannot serialize PushSubprocessOp before apply');
    return { opType: this.type, schemaVersion: '8.0.0' as const, subprocess: subprocessToDescriptor(this.subprocess) };
  }
}

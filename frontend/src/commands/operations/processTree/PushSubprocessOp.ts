/**
 * PushSubprocessOp - Push subprocess onto ProcessTree stack
 * 
 * Creates a new subprocess and pushes it onto the ProcessTree subprocess stack.
 * All subsequent actions will be added to this subprocess until it is popped.
 * 
 * Phase 85: ProcessTree Subprocess Stack Architecture
 */

import type { IOperation, OperationOutputBag, OperationResult } from '../IOperation';
import type { World } from '@/domain/world/World';

export class PushSubprocessOp implements IOperation {
  readonly type = 'PushSubprocess';
  outputs: OperationOutputBag = {};

  constructor(private readonly subprocessName: string, subprocessId?: string) {
    // If subprocessId provided (during deserialization), store it in outputs
    if (subprocessId) {
      this.outputs = { subprocessId };
    }
  }

  apply(world: World): OperationResult {
    // On replay (deserialization), reuse the stored subprocessId from outputs
    // This ensures toggle operations can find the correct subprocess
    const existingId = this.outputs.subprocessId;
    const subprocess = world.getProcessTree().pushSubprocess(this.subprocessName, existingId);
    this.outputs = { subprocessId: subprocess.id };
    return { success: true, outputs: this.outputs };
  }

  undo(world: World): void {
    // Undo by popping the subprocess from the stack
    world.getProcessTree().popSubprocess();
  }

  serialize() {
    return { opType: this.type, subprocessName: this.subprocessName, subprocessId: this.outputs.subprocessId, outputs: this.outputs };
  }
}

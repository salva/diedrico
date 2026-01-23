/**
 * PushSubprocessOp - Push subprocess onto ProcessTree stack
 * 
 * Creates a new subprocess and pushes it onto the ProcessTree subprocess stack.
 * All subsequent actions will be added to this subprocess until it is popped.
 * 
 * Phase 85: ProcessTree Subprocess Stack Architecture
 * Reference: specs/001-dihedral-learning-mvp/data-model.md §ProcessTree (Phase 85)
 */

import type { IOperation, OperationResult } from '../IOperation';
import type { World } from '@/domain/world/World';

export class PushSubprocessOp implements IOperation {
  readonly type = 'PushSubprocess';
  parameters: Record<string, any>;
  outputs: Record<string, any> = {};

  constructor(private readonly subprocessName: string) {
    this.parameters = { subprocessName };
  }

  apply(world: World): OperationResult {
    const subprocess = world.getProcessTree().pushSubprocess(this.subprocessName);
    this.outputs = { subprocessId: subprocess.id };
    return { success: true, outputs: this.outputs };
  }

  undo(world: World): void {
    // Undo by popping the subprocess from the stack
    world.getProcessTree().popSubprocess();
  }
}

/**
 * PopSubprocessOp - Pop subprocess from ProcessTree stack
 * 
 * Pops the current subprocess from the ProcessTree stack, returning to the parent subprocess.
 * The subprocess remains in the tree as a child of its parent - only the stack is affected.
 * 
 * Phase 85: ProcessTree Subprocess Stack Architecture
 */

import type { IOperation, OperationResult } from '../IOperation';
import type { World } from '@/domain/world/World';

export class PopSubprocessOp implements IOperation {
  readonly type = 'PopSubprocess';
  parameters: Record<string, any> = {};
  outputs: Record<string, any> = {};
  
  private poppedSubprocessId: string | undefined;

  apply(world: World): OperationResult {
    // Store info about subprocess being popped for undo
    const currentSubprocess = world.getProcessTree().getCurrentSubprocess();
    this.poppedSubprocessId = currentSubprocess.id;
    
    world.getProcessTree().popSubprocess();
    return { success: true, outputs: {} };
  }

  undo(world: World): void {
    if (!this.poppedSubprocessId) {
      throw new Error('Cannot undo PopSubprocessOp: no subprocess ID stored');
    }
    
    // Restore the subprocess to the stack
    world.getProcessTree().restoreSubprocessToStack(this.poppedSubprocessId);
  }

  serialize() {
    return { opType: this.type, outputs: this.outputs };
  }
}

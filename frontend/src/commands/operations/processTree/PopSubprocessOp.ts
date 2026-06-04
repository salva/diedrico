/**
 * PopSubprocessOp - Pop subprocess from ProcessTree stack
 * 
 * Pops the current subprocess from the ProcessTree stack, returning to the parent subprocess.
 * The subprocess remains in the tree as a child of its parent - only the stack is affected.
 * 
 * Phase 85: ProcessTree Subprocess Stack Architecture
 */

import type { IOperation, OperationOutputBag, OperationResult } from '../IOperation';
import type { OperationContext } from '../OperationContext';

export class PopSubprocessOp implements IOperation {
  readonly type = 'PopSubprocess';
  outputs: OperationOutputBag = {};
  
  private poppedSubprocessId: string | undefined;

  apply(context: OperationContext): OperationResult {
    // Store info about subprocess being popped for undo
    const currentSubprocess = context.world.getProcessTree().getCurrentSubprocess();
    this.poppedSubprocessId = currentSubprocess.id;
    
    context.world.getProcessTree().popSubprocess();
    return { success: true, outputs: {} };
  }

  undo(context: OperationContext): void {
    if (!this.poppedSubprocessId) {
      throw new Error('Cannot undo PopSubprocessOp: no subprocess ID stored');
    }
    
    // Restore the subprocess to the stack
    context.world.getProcessTree().restoreSubprocessToStack(this.poppedSubprocessId);
  }

  serialize() {
    return { opType: this.type, outputs: this.outputs };
  }
}

/**
 * PopSubprocessOp - Pop subprocess from ProcessTree stack
 * 
 * Pops the current subprocess from the ProcessTree stack, returning to the parent subprocess.
 * The subprocess remains in the tree as a child of its parent - only the stack is affected.
 * 
 * Phase 85: ProcessTree Subprocess Stack Architecture
 */

import type { IOperation, OperationDescriptor, OperationOutputBag, OperationResult } from '../IOperation';
import type { OperationContext } from '../OperationContext';

export interface PopSubprocessDescriptorV8 extends OperationDescriptor<'PopSubprocess'> {
  schemaVersion: '8.0.0';
}

export class PopSubprocessOp implements IOperation<PopSubprocessDescriptorV8> {
  readonly type = 'PopSubprocess';
  outputs: OperationOutputBag = {};
  
  private poppedSubprocessId: string | undefined;

  apply(context: OperationContext): OperationResult {
    // Store info about subprocess being popped for undo
    const currentSubprocess = context.processTree.getCurrentSubprocess();
    this.poppedSubprocessId = currentSubprocess.id;
    
    context.processTree.popSubprocess();
    return { success: true, outputs: {} };
  }

  undo(context: OperationContext): void {
    if (!this.poppedSubprocessId) {
      throw new Error('Cannot undo PopSubprocessOp: no subprocess ID stored');
    }
    
    // Restore the subprocess to the stack
    context.processTree.restoreSubprocessToStack(this.poppedSubprocessId);
  }

  serialize(): PopSubprocessDescriptorV8 {
    return { opType: this.type, schemaVersion: '8.0.0' as const };
  }
}

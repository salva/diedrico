/**
 * PopSubprocessOp - Pop subprocess from ProcessTree stack
 * 
 * Pops the current subprocess from the ProcessTree stack, returning to the parent subprocess.
 * The subprocess remains in the tree as a child of its parent - only the stack is affected.
 * 
 * Phase 85: ProcessTree Subprocess Stack Architecture
 * Reference: specs/001-dihedral-learning-mvp/data-model.md §ProcessTree (Phase 85)
 */

import type { IOperation, OperationResult } from '../IOperation';
import type { World } from '@/domain/world/World';

export class PopSubprocessOp implements IOperation {
  readonly type = 'PopSubprocess';
  parameters: Record<string, any> = {};
  outputs: Record<string, any> = {};
  
  private poppedSubprocessId: string | undefined;
  private poppedSubprocessName: string | undefined;

  apply(world: World): OperationResult {
    // Store info about subprocess being popped for undo
    const currentSubprocess = world.getProcessTree().getCurrentSubprocess();
    this.poppedSubprocessId = currentSubprocess.id;
    this.poppedSubprocessName = currentSubprocess.name;
    
    world.getProcessTree().popSubprocess();
    return { success: true, outputs: {} };
  }

  undo(world: World): void {
    // Undo by re-pushing the subprocess onto the stack
    // Note: The subprocess still exists in the tree, we just need to push it back onto the stack
    // This is tricky - we need to manually push the existing subprocess back onto the stack
    // For now, we'll need to access the subprocess by ID and manually push it
    
    if (!this.poppedSubprocessId) {
      throw new Error('Cannot undo PopSubprocessOp: no subprocess ID stored');
    }
    
    // Find the subprocess in the tree and push it back onto the stack
    const processTree = world.getProcessTree();
    const currentSubprocess = processTree.getCurrentSubprocess();
    
    // Find the popped subprocess in current subprocess's children
    const poppedSubprocess = currentSubprocess.children.find(
      child => child.type === 'subprocess' && child.id === this.poppedSubprocessId
    );
    
    if (!poppedSubprocess || poppedSubprocess.type !== 'subprocess') {
      throw new Error(`Cannot undo PopSubprocessOp: subprocess ${this.poppedSubprocessId} not found in parent's children`);
    }
    
    // Manually push the subprocess back onto the stack
    // We need to access the private stack - we'll use a workaround by calling pushSubprocess with same name
    // then replacing the newly created subprocess with the original one
    // Actually, this is complex - let's add a helper method to ProcessTree
    // For now, throw an error indicating this needs ProcessTree support
    throw new Error('PopSubprocessOp undo requires ProcessTree.restoreSubprocessToStack() method - not yet implemented');
  }
}

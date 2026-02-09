/**
 * HingeLineSequenceFactory - Builds operation sequence for complete hinge line creation
 * 
 * Creating a complete hinge line requires 3 separate operations:
 * 1. AddHingeLineOp - Creates the 3D HingeLine object
 * 2. AddHalfHingeLine2DOp (horizontal) - Creates 2D representation on horizontal plane
 * 3. AddHalfHingeLine2DOp (vertical) - Creates 2D representation on vertical plane
 * 
 * This factory demonstrates the principle that operations must be minimal and atomic.
 * Complex multi-element creation is handled by sequence factories, not by complex operations.
 * 
 * Pattern:
 * - Factory receives open Command
 * - Adds 3 operations to Command
 * - Each operation calls its respective element factory method
 * - Element factories handle ID generation (with redo support)
 * 
 * @see specs/001-dihedral-learning-mvp/data-model.md#operation-sequence-factories
 */

import type { Command } from '../Command';
import { AddHingeLineOp, AddHalfHingeLine2DOp } from '../operations/world/InitializationOps';
import { AddProcessTreeActionOp } from '../operations/processTree/AddProcessTreeActionOp';
import {
  createInitializeHingeLineAction,
  createInitializeHalfHingeLine2DAction
} from '@/domain/processTree/actions/InitializeWorldActions';

/**
 * Build complete hinge line with both half hinge lines
 * 
 * Creates:
 * - 3D HingeLine object connecting two planes
 * - Half hinge line on horizontal projection plane
 * - Half hinge line on vertical projection plane
 * 
 * **Phase 84**: No geometry parameters - computed on demand from canonical coordinates
 * 
 * @param horizontalPlaneId ID of horizontal projection plane
 * @param verticalPlaneId ID of vertical projection plane
 * @param cmd Open Command to add operations to
 */
export function buildHingeLineWithHalves(
  horizontalPlaneId: string,
  verticalPlaneId: string,
  cmd: Command,
  groupId: string
): void {
  // Step 1: Create 3D hinge line
  // AddHingeLineOp calls world.addHingeLine() which generates ID if not provided
  const hingeLineOp = new AddHingeLineOp(horizontalPlaneId, verticalPlaneId);
  cmd.addAndExecute(hingeLineOp);
  const hingeLineId = hingeLineOp.outputs.hingeLineId as string;
  
  cmd.addAndExecute(new AddProcessTreeActionOp(
    createInitializeHingeLineAction(hingeLineId),
    groupId
  ));

  // Step 2: Create half hinge line on horizontal plane
  // AddHalfHingeLine2DOp calls projPlane.addHalfHingeLine2D() which generates ID
  const hhl1Op = new AddHalfHingeLine2DOp(horizontalPlaneId, hingeLineId);
  cmd.addAndExecute(hhl1Op);
  cmd.addAndExecute(new AddProcessTreeActionOp(
    createInitializeHalfHingeLine2DAction(hhl1Op.outputs.lineId),
    groupId
  ));
  
  // Step 3: Create half hinge line on vertical plane
  const hhl2Op = new AddHalfHingeLine2DOp(verticalPlaneId, hingeLineId);
  cmd.addAndExecute(hhl2Op);
  cmd.addAndExecute(new AddProcessTreeActionOp(
    createInitializeHalfHingeLine2DAction(hhl2Op.outputs.lineId),
    groupId
  ));
}

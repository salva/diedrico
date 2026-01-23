/**
 * PlaneSequenceFactory - Factory for creating 3D plane sequences with ProcessTree actions
 * 
 * Follows the sequence factory pattern established in Phase 81:
 * - Factories execute operations AND create ProcessTree actions internally
 * - Return element IDs for compositional nesting
 * - Enable dependency tracking for reactive updates
 * 
 * Pattern: operation → extract ID → create action → return ID
 * 
 * Phase 85: Uses PushSubprocessOp/PopSubprocessOp for subprocess stack management.
 * Operations automatically record actions to current subprocess.
 * 
 * Eliminates code duplication between Create3DPlaneTool and CreateProjectionPlaneTool
 * while ensuring ProcessTree actions are created consistently.
 */

import { Command } from '@/commands/Command';
import { Add3DPlaneOp } from '@/commands/operations/world/Add3DPlaneOp';
import { AddAuxiliaryProjectionPlaneOp } from '@/commands/operations/world/AddAuxiliaryProjectionPlaneOp';
import { AddHingeLineOp, AddHalfHingeLine2DOp } from '@/commands/operations/world/InitializationOps';
import { AddProcessTreeActionOp } from '@/commands/operations/processTree/AddProcessTreeActionOp';
import { PushSubprocessOp, PopSubprocessOp } from '@/commands/operations/processTree';
import { UpdateElementStyleOp } from '@/commands/operations/world/UpdateElementStyleOp';
import { createAdd3DPlaneAction } from '@/domain/processTree/actions/Element3DActions';
import { createProjectionPlaneAction } from '@/domain/processTree/actions/CreateProjectionPlaneAction';
import { HalfHingeLine2D } from '@/domain/world/HingeLine';

export class PlaneSequenceFactory {
  /**
   * Create a 3D plane from two trace lines on different projection planes
   * 
   * Creates:
   * 1. Plane3DFromTraces (via Add3DPlaneOp)
   * 2. ProcessTree action for dependency tracking
   * 
   * @param cmd - Command to add operations to
   * @param trace1Id - ID of first trace line
   * @param trace2Id - ID of second trace line
   * @param plane1Id - ID of projection plane containing trace1
   * @param plane2Id - ID of projection plane containing trace2
   * @param label - Optional label for the plane
   * @returns Object containing the created plane ID
   */
  static create3DPlaneFromTraces(
    cmd: Command,
    trace1Id: string,
    trace2Id: string,
    plane1Id: string,
    plane2Id: string,
    label?: string
  ): { planeId: string } {
    // Execute operation to create 3D plane
    const result = cmd.addAndExecute(new Add3DPlaneOp(
      trace1Id,
      trace2Id,
      plane1Id,
      plane2Id,
      label
    ));
    
    const planeId = result.outputs.planeId;
    
    // Create ProcessTree action for dependency tracking
    const action = createAdd3DPlaneAction(
      planeId,
      trace1Id,
      trace2Id,
      plane1Id,
      plane2Id
    );
    cmd.addAndExecute(new AddProcessTreeActionOp(action));
    
    return { planeId };
  }

  /**
   * Create an auxiliary projection plane with automatic hinge line creation
   * 
   * Creates:
   * 1. AuxiliaryProjectionPlane (via AddAuxiliaryProjectionPlaneOp)
   * 2. HingeLine connecting hingeTracePlaneId to new projection plane
   * 3. HalfHingeLine2D on both planes
   * 4. Hides T1 trace line (unless it's already a HalfHingeLine2D)
   * 5. ProcessTree action for dependency tracking
   * 
   * Phase 85: Wraps operation sequence with PushSubprocessOp/PopSubprocessOp.
   * Operations automatically record actions to current subprocess.
   * 
   * This is the canonical way to create auxiliary projection planes ("folded planes")
   * that are connected to existing projection planes via a hinge line.
   * 
   * @param cmd - Command to add operations to
   * @param world - World instance (needed to check if T1 is HalfHingeLine2D)
   * @param plane3DId - ID of the Plane3D this projection plane projects
   * @param t1HingeTraceId - ID of hinge trace line (T1) on existing projection plane
   * @param t2OtherTraceId - ID of other trace line (T2) on different projection plane
   * @param t2PrimeLineId - ID of position/orientation line (T2') on same plane as T1
   * @param hingeTracePlaneId - ID of projection plane containing T1 (connects via hinge)
   * @param name - Optional name for the plane (e.g., 'P_A1')
   * @returns Object containing the created projection plane ID
   */
  static createAuxiliaryProjectionPlane(
    cmd: Command,
    world: import('@/domain/world/World').World,
    plane3DId: string,
    t1HingeTraceId: string,
    t2OtherTraceId: string,
    t2PrimeLineId: string,
    hingeTracePlaneId: string,
    name?: string
  ): { projPlaneId: string } {
    // Phase 85: Push subprocess - all operations grouped under this subprocess
    cmd.addAndExecute(new PushSubprocessOp('Create Auxiliary Projection Plane'));
    
    // Execute operation to create auxiliary projection plane
    const result = cmd.addAndExecute(new AddAuxiliaryProjectionPlaneOp(
      plane3DId,
      t1HingeTraceId,
      t2OtherTraceId,
      t2PrimeLineId,
      name
    ));
    
    const projPlaneId = result.outputs.projPlaneId as string;
    
    // Create ProcessTree action for dependency tracking
    const projPlaneAction = createProjectionPlaneAction(
      projPlaneId,
      t1HingeTraceId,
      t2OtherTraceId,
      t2PrimeLineId
    );
    cmd.addAndExecute(new AddProcessTreeActionOp(projPlaneAction));
    
    // Create hinge line connecting the new auxiliary plane to the hinge trace's plane
    // IMPORTANT: plane1 = new auxiliary plane (canonical coords source), plane2 = existing plane
    const hingeLineResult = cmd.addAndExecute(new AddHingeLineOp(
      projPlaneId,        // plane1Id (new auxiliary plane - defines canonical coords)
      hingeTracePlaneId   // plane2Id (existing plane containing T1)
    ));
    const hingeLineId = hingeLineResult.outputs.hingeLineId as string;
    
    // Phase 85: Operations now automatically record actions to current subprocess
    // No manual ProcessTree action recording needed
    
    // Create HalfHingeLine2D on both planes (order matches HingeLine plane order)
    cmd.addAndExecute(new AddHalfHingeLine2DOp(projPlaneId, hingeLineId));
    cmd.addAndExecute(new AddHalfHingeLine2DOp(hingeTracePlaneId, hingeLineId));
    
    // Hide T1 trace line (now that it's become a hinge line), unless it's already a HalfHingeLine2D
    const hingePlane = world.getProjectionPlaneById(hingeTracePlaneId);
    if (hingePlane) {
      const t1Line = hingePlane.getLine(t1HingeTraceId);
      if (t1Line && !(t1Line instanceof HalfHingeLine2D)) {
        // T1 is a regular line, hide it since it's now represented by the HalfHingeLine2D
        cmd.addAndExecute(new UpdateElementStyleOp(
          t1HingeTraceId,
          hingeTracePlaneId,
          { visible: false }
        ));
      }
    }
    
    // Phase 85: Pop subprocess - operation sequence complete
    cmd.addAndExecute(new PopSubprocessOp());
    
    return { projPlaneId };
  }
}

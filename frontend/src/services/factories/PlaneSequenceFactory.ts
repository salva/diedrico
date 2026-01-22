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
 * Eliminates code duplication between Create3DPlaneTool and CreateProjectionPlaneTool
 * while ensuring ProcessTree actions are created consistently.
 */

import { Command } from '@/commands/Command';
import { Add3DPlaneOp } from '@/commands/operations/world/Add3DPlaneOp';
import { AddProcessTreeActionOp } from '@/commands/operations/processTree/AddProcessTreeActionOp';
import { createAdd3DPlaneAction } from '@/domain/processTree/actions/Element3DActions';

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
}

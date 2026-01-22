/**
 * PointSequenceFactory - Factory for creating free point sequences with ProcessTree actions
 * 
 * Follows the sequence factory pattern established in Phase 81:
 * - Factories execute operations AND create ProcessTree actions internally
 * - Return element IDs for compositional nesting
 * - Enable dependency tracking for reactive updates
 * 
 * Pattern: operation → extract ID → create action → return ID
 * 
 * Eliminates code duplication between PointTool, QuickProjectionSetupTool, and other
 * point creation code while ensuring ProcessTree actions are created consistently.
 */

import type { Vector3 } from 'three';
import { Command } from '@/commands/Command';
import { AddFreePoint2DOp } from '@/commands/operations/world/AddFreePointOp';
import { AddProcessTreeActionOp } from '@/commands/operations/processTree/AddProcessTreeActionOp';
import { createPointAction } from '@/domain/processTree/actions/CreatePointAction';

export class PointSequenceFactory {
  /**
   * Create a free point at a specific position
   * 
   * Creates:
   * 1. FreePoint2D (via AddFreePoint2DOp)
   * 2. ProcessTree action for dependency tracking
   * 
   * @param cmd - Command to add operations to
   * @param planeId - ID of projection plane containing the point
   * @param position - Position in plane intrinsic coordinates (u, v, 1)
   * @returns Object containing the created point ID
   */
  static createFreePoint(
    cmd: Command,
    planeId: string,
    position: Vector3
  ): { pointId: string } {
    // Execute operation to create free point
    const result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, position));
    const pointId = result.outputs.pointId;
    
    // Create ProcessTree action for dependency tracking
    const action = createPointAction(pointId, planeId, position);
    cmd.addAndExecute(new AddProcessTreeActionOp(action));
    
    return { pointId };
  }
}

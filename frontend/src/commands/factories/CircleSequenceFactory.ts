/**
 * CircleSequenceFactory - Factory for creating circle operation sequences
 * 
 * Encapsulates the operation sequence for creating circles by center and point.
 * 
 * Pattern: Open Command - Receives an open Command, adds operations to it.
 * Returns IDs of created elements for use in nested factory calls.
 * 
 * Benefits:
 * - Consistent API for circle creation
 * - Returns element IDs for use in composite constructions
 * - Testable without tool infrastructure
 * - Reusable across different UIs or automation contexts
 */

import { Command } from '../Command';
import { AddCircle2DByCenterAndPointOp } from '../operations/world/AddCircleOp';
import { AddProcessTreeActionOp } from '../operations/processTree/AddProcessTreeActionOp';
import { createCircleAction } from '@/domain/processTree/actions/CreateCircleAction';

/**
 * Result of circle creation
 */
export interface CircleResult {
  circleId: string;
}

/**
 * Factory for creating circle operation sequences
 */
export class CircleSequenceFactory {
  /**
   * Create a circle by center and point on circumference.
   * 
   * @param cmd - Open Command to add operations to
   * @param planeId - ID of the projection plane
   * @param centerPointId - ID of center point
   * @param circumferencePointId - ID of point on circumference
   * @returns Object with circleId
   * @throws Error if operation fails
   */
  static createCircleByCenterAndPoint(
    cmd: Command,
    planeId: string,
    centerPointId: string,
    circumferencePointId: string
  ): CircleResult {
    const operation = new AddCircle2DByCenterAndPointOp(planeId, centerPointId, circumferencePointId);
    const result = cmd.addAndExecute(operation);
    
    if (!result.success || !result.outputs.circleId) {
      throw new Error(result.error || 'Failed to create circle');
    }
    
    const circleId = result.outputs.circleId as string;
    
    // Record ProcessTree action for dependency tracking
    const action = createCircleAction(circleId, planeId, centerPointId, circumferencePointId);
    cmd.addAndExecute(new AddProcessTreeActionOp(action));
    
    return { circleId };
  }
}

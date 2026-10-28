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

import type { Command } from '../Command';
import { AddCircle2DByCenterAndPointOp, AddCircle2DByCenterAndRadiusVectorOp } from '../operations/world/AddCircleOp';
import { recordProcessTreeAction, requireStringOutput } from './sequenceFactoryHelpers';
import { createCircleAction } from '@/domain/processTree/actions/CreateCircleAction';
import type { Vector3 } from 'three';

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
    circumferencePointId: string,
    groupId: string
  ): CircleResult {
    const operation = new AddCircle2DByCenterAndPointOp(planeId, centerPointId, circumferencePointId);
    const result = cmd.addAndExecute(operation);
    const circleId = requireStringOutput(result, 'circleId', 'Failed to create circle');
    
    // Record ProcessTree action for dependency tracking (Phase 92: minimal signature)
    const action = createCircleAction(circleId);
    
    recordProcessTreeAction(cmd, action, groupId);
    
    return { circleId };
  }

  static createCircleByCenterAndRadiusVector(
    cmd: Command,
    planeId: string,
    centerPointId: string,
    radiusVector: Vector3,
    groupId: string
  ): CircleResult {
    const operation = new AddCircle2DByCenterAndRadiusVectorOp(planeId, centerPointId, radiusVector);
    const result = cmd.addAndExecute(operation);
    const circleId = requireStringOutput(result, 'circleId', 'Failed to create circle by center and radius');
    const action = createCircleAction(circleId);
    recordProcessTreeAction(cmd, action, groupId);
    return { circleId };
  }
}

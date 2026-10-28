/**
 * LineSequenceFactory - Factory for creating line operation sequences
 * 
 * Encapsulates the operation sequence for creating lines:
 * - Line by two points (Line2DByTwoPoints)
 * - Parallel line (Line2DParallel)
 * - Perpendicular line (Line2DPerpendicularToLine)
 * - Tangent lines (tangent to circle through point, parallel to line)
 * 
 * Pattern: Open Command - Receives an open Command, adds operations to it.
 * Returns IDs of created elements for use in nested factory calls.
 * 
 * Benefits:
 * - Consistent API for line creation across different line types
 * - Returns element IDs for use in composite constructions
 * - Testable without tool infrastructure
 * - Reusable across different UIs or automation contexts
 * 
 * Example:
 * ```typescript
  * const cmd = new Command('Create construction', context);
 * 
 * // Create line by two points
 * const lineResult = LineSequenceFactory.createLineByTwoPoints(
 *   cmd, planeId, point1Id, point2Id
 * );
 * 
 * // Use the line ID in subsequent operations
 * const parallelResult = LineSequenceFactory.createParallelLine(
 *   cmd, planeId, lineResult.lineId, throughPointId
 * );
 * ```
 */

import type { Command } from '../Command';
import { 
  AddLine2DByTwoPointsOp,
  AddLine2DByPointAndRelativeAngleOp,
  AddLine2DParallelToLineOp,
  AddLine2DPerpendicularToLineOp,
  AddLine2DTangentToCircleThroughPointOp,
  AddLine2DTangentToCircleParallelToLineOp
} from '../operations/world/AddLineOp';
import { recordProcessTreeAction, requireStringOutput } from './sequenceFactoryHelpers';
import { createLineAction } from '@/domain/processTree/actions/CreateLineAction';
import { createParallelLineAction } from '@/domain/processTree/actions/CreateParallelLineAction';
import { createPerpendicularLineAction } from '@/domain/processTree/actions/CreatePerpendicularLineAction';

/**
 * Result of line creation
 */
export interface LineResult {
  lineId: string;
}

/**
 * Factory for creating line operation sequences
 */
export class LineSequenceFactory {
  /**
   * Create a line by two points.
   * 
   * @param cmd - Open Command to add operations to
   * @param planeId - ID of the projection plane
   * @param point1Id - ID of first point
   * @param point2Id - ID of second point
   * @returns Object with lineId
   * @throws Error if operation fails
   */
  static createLineByTwoPoints(
    cmd: Command,
    planeId: string,
    point1Id: string,
    point2Id: string,
    groupId: string
  ): LineResult {
    const operation = new AddLine2DByTwoPointsOp(planeId, point1Id, point2Id);
    const result = cmd.addAndExecute(operation);
    const lineId = requireStringOutput(result, 'lineId', 'Failed to create line by two points');
    
    // Record ProcessTree action for dependency tracking (Phase 92: minimal signature)
    const action = createLineAction(lineId);
    
    recordProcessTreeAction(cmd, action, groupId);
    
    return { lineId };
  }

  /**
   * Create a line parallel to a reference line through a point.
   * 
   * @param cmd - Open Command to add operations to
   * @param planeId - ID of the projection plane
   * @param referenceLineId - ID of the reference line
   * @param throughPointId - ID of the point the parallel line passes through
   * @returns Object with lineId
   * @throws Error if operation fails
   */
  static createParallelLine(
    cmd: Command,
    planeId: string,
    referenceLineId: string,
    throughPointId: string,
    groupId: string
  ): LineResult {
    const operation = new AddLine2DParallelToLineOp(planeId, referenceLineId, throughPointId);
    const result = cmd.addAndExecute(operation);
    const lineId = requireStringOutput(result, 'lineId', 'Failed to create parallel line');
    
    // Record ProcessTree action for dependency tracking
    const action = createParallelLineAction(lineId);
    
    recordProcessTreeAction(cmd, action, groupId);
    
    return { lineId };
  }

  /**
   * Create a line perpendicular to a reference line through a point.
   * 
   * @param cmd - Open Command to add operations to
   * @param planeId - ID of the projection plane
   * @param referenceLineId - ID of the reference line
   * @param throughPointId - ID of the point the perpendicular line passes through
   * @returns Object with lineId
   * @throws Error if operation fails
   */
  static createPerpendicularLine(
    cmd: Command,
    planeId: string,
    referenceLineId: string,
    throughPointId: string,
    groupId: string
  ): LineResult {
    const operation = new AddLine2DPerpendicularToLineOp(planeId, referenceLineId, throughPointId);
    const result = cmd.addAndExecute(operation);
    const lineId = requireStringOutput(result, 'lineId', 'Failed to create perpendicular line');
    
    // Record ProcessTree action for dependency tracking
    const action = createPerpendicularLineAction(lineId);
    
    recordProcessTreeAction(cmd, action, groupId);
    
    return { lineId };
  }

  static createLineByPointAndRelativeAngle(
    cmd: Command,
    planeId: string,
    referenceLineId: string,
    throughPointId: string,
    angleRadians: number,
    groupId: string
  ): LineResult {
    const operation = new AddLine2DByPointAndRelativeAngleOp(planeId, referenceLineId, throughPointId, angleRadians);
    const result = cmd.addAndExecute(operation);
    const lineId = requireStringOutput(result, 'lineId', 'Failed to create line by point and angle');
    const action = createLineAction(lineId);
    recordProcessTreeAction(cmd, action, groupId);
    return { lineId };
  }

  /**
   * Create a tangent line to a circle through a point.
   * 
   * @param cmd - Open Command to add operations to
   * @param planeId - ID of the projection plane
   * @param circleId - ID of the circle
   * @param pointId - ID of the point the tangent passes through
   * @param index - Which tangent (0 or 1) when two tangents exist
   * @returns Object with lineId
   * @throws Error if operation fails
   */
  static createTangentToCircleThroughPoint(
    cmd: Command,
    planeId: string,
    circleId: string,
    pointId: string,
    index: 0 | 1
  ): LineResult {
    const operation = new AddLine2DTangentToCircleThroughPointOp(planeId, circleId, pointId, index);
    const result = cmd.addAndExecute(operation);
    return { lineId: requireStringOutput(result, 'lineId', 'Failed to create tangent line through point') };
  }

  /**
   * Create a tangent line to a circle parallel to a reference line.
   * 
   * @param cmd - Open Command to add operations to
   * @param planeId - ID of the projection plane
   * @param circleId - ID of the circle
   * @param referenceLineId - ID of the reference line
   * @param index - Which tangent (0 or 1) when two tangents exist
   * @returns Object with lineId
   * @throws Error if operation fails
   */
  static createTangentToCircleParallelToLine(
    cmd: Command,
    planeId: string,
    circleId: string,
    referenceLineId: string,
    index: 0 | 1
  ): LineResult {
    const operation = new AddLine2DTangentToCircleParallelToLineOp(planeId, circleId, referenceLineId, index);
    const result = cmd.addAndExecute(operation);
    return { lineId: requireStringOutput(result, 'lineId', 'Failed to create tangent line parallel to line') };
  }
}

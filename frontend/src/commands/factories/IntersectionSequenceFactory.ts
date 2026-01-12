/**
 * IntersectionSequenceFactory - Factory for creating intersection point sequences
 * 
 * Encapsulates the operation sequence for creating intersection points between:
 * - Line-Line intersections
 * - Line-Circle intersections (with index for multiple intersections)
 * - Circle-Circle intersections (with index for multiple intersections)
 * 
 * Phase 42: Now handles HalfHingeLine2D intersections by creating sibling points
 * on the complementary plane (follows same pattern as SiblingGuide2D from Phase 36).
 * 
 * Pattern: Open Command - Receives an open Command, adds operations to it.
 * 
 * Benefits:
 * - Separates geometric logic from tool interaction logic
 * - Type-safe operation selection based on intersection type
 * - Testable without tool infrastructure
 * - Reusable across different UIs or automation contexts
 * 
 * Example:
 * ```typescript
 * const cmd = new Command('Create intersection', world);
 * const result = IntersectionSequenceFactory.createIntersection(
 *   cmd, planeId, intersectionData, world
 * );
 * // result.pointId: ID of created intersection point
 * // result.siblingPointId: ID of sibling point (if HHL intersection)
 * 
 * // Tool handles: process tree action, commit, push to stack, feedback
 * ```
 * 
 * @see frontend/src/commands/factories/README.md
 * @see data-model.md §HalfHingeLine2D Intersection Sibling Behavior
 */

import { Command } from '../Command';
import { AddLineLineIntersectionPoint2DOp } from '../operations/world/AddLineLineIntersectionPoint2DOp';
import { AddLineCircleIntersectionPoint2DOp } from '../operations/world/AddLineCircleIntersectionPoint2DOp';
import { AddCircleCircleIntersectionPoint2DOp } from '../operations/world/AddCircleCircleIntersectionPoint2DOp';
import { AddSiblingIntersectionPoint2DOp } from '../operations/world/AddSiblingIntersectionPoint2DOp';
import type { World } from '@/domain/world/World';

/**
 * Intersection data specifying the type and parameters for intersection creation
 */
export interface IntersectionData {
  type: 'line-line' | 'line-circle' | 'circle-circle';
  element1Id: string;
  element2Id: string;
  lineId?: string;     // For line-circle intersections (which element is the line)
  circleId?: string;   // For line-circle intersections (which element is the circle)
  index?: number;      // For line-circle and circle-circle (0 or 1 for two possible points)
}

/**
 * Factory for creating intersection point operation sequences
 */
export class IntersectionSequenceFactory {
  /**
   * Create an intersection point with the appropriate operation type.
   * 
   * If either element is a HalfHingeLine2D, automatically creates a sibling
   * intersection point on the complementary plane (following Phase 36 sibling pattern).
   * 
   * @param cmd - Open Command to add operations to
   * @param planeId - ID of the projection plane
   * @param intersectionData - Specification of intersection type and elements
   * @param world - World instance for HHL detection and sibling plane resolution
   * @returns Object with pointId and optional siblingPointId
   * @throws Error if intersection type is unknown or operation fails
   */
  static createIntersection(
    cmd: Command,
    planeId: string,
    intersectionData: IntersectionData,
    world: World
  ): { pointId: string; siblingPointId?: string } {
    // Create the appropriate operation based on intersection type
    let operation;
    if (intersectionData.type === 'line-line') {
      operation = new AddLineLineIntersectionPoint2DOp(
        planeId,
        intersectionData.element1Id,
        intersectionData.element2Id
      );
    } else if (intersectionData.type === 'line-circle') {
      // Validate line-circle specific parameters
      if (!intersectionData.lineId || !intersectionData.circleId || intersectionData.index === undefined) {
        throw new Error('Line-circle intersection requires lineId, circleId, and index');
      }
      
      operation = new AddLineCircleIntersectionPoint2DOp(
        planeId,
        intersectionData.lineId,
        intersectionData.circleId,
        intersectionData.index
      );
    } else if (intersectionData.type === 'circle-circle') {
      // Validate circle-circle specific parameters
      if (intersectionData.index === undefined) {
        throw new Error('Circle-circle intersection requires index');
      }
      
      operation = new AddCircleCircleIntersectionPoint2DOp(
        planeId,
        intersectionData.element1Id,
        intersectionData.element2Id,
        intersectionData.index
      );
    } else {
      throw new Error(`Unknown intersection type: ${(intersectionData as IntersectionData).type}`);
    }

    // Execute primary operation and extract outputs
    const result = cmd.addAndExecute(operation);
    const pointId = result.outputs.pointId;
    
    let siblingPointId: string | undefined;
    
    try {
      // Check if either element is HalfHingeLine2D and get sibling plane
      const plane = world.getProjectionPlaneById(planeId);
      if (!plane) {
        throw new Error(`Plane not found: ${planeId}`);
      }
      
      const primaryPoint = plane.getPoint(pointId);
      if (!primaryPoint) {
        throw new Error(`Primary intersection point not found: ${pointId}`);
      }
      
      const siblingPlaneId = world.getSiblingPlaneForIntersection(primaryPoint);
      
      if (siblingPlaneId) {
        // Create sibling intersection using coordinate correspondence
        const siblingResult = cmd.addAndExecute(
          new AddSiblingIntersectionPoint2DOp(siblingPlaneId, pointId)
        );
        siblingPointId = siblingResult.outputs.pointId;
        
        console.log(
          `[IntersectionSequenceFactory] Created sibling intersection ${siblingPointId} ` +
          `in plane ${siblingPlaneId} for primary ${pointId}`
        );
      }
    } catch (siblingError) {
      // Sibling creation failed - log but don't fail the entire operation
      console.warn('[IntersectionSequenceFactory] Failed to create sibling intersection:', siblingError);
    }

    return { pointId, siblingPointId };
  }
}

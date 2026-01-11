/**
 * IntersectionSequenceFactory - Factory for creating intersection point sequences
 * 
 * Encapsulates the operation sequence for creating intersection points between:
 * - Line-Line intersections
 * - Line-Circle intersections (with index for multiple intersections)
 * - Circle-Circle intersections (with index for multiple intersections)
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
 * 
 * // Tool handles: process tree action, commit, push to stack, feedback
 * ```
 * 
 * @see frontend/src/commands/factories/README.md
 */

import { Command } from '../Command';
import { AddLineLineIntersectionPoint2DOp } from '../operations/world/AddLineLineIntersectionPoint2DOp';
import { AddLineCircleIntersectionPoint2DOp } from '../operations/world/AddLineCircleIntersectionPoint2DOp';
import { AddCircleCircleIntersectionPoint2DOp } from '../operations/world/AddCircleCircleIntersectionPoint2DOp';
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
   * Create an intersection point with the appropriate operation type
   * 
   * @param cmd - Open Command to add operations to
   * @param planeId - ID of the projection plane
   * @param intersectionData - Specification of intersection type and elements
   * @param world - World instance (currently unused, included for consistency with other factories)
   * @returns Object with pointId of created intersection point
   * @throws Error if intersection type is unknown or operation fails
   */
  static createIntersection(
    cmd: Command,
    planeId: string,
    intersectionData: IntersectionData,
    world: World
  ): { pointId: string } {
    // Silence unused variable warning - world included for future extensibility
    void world;

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

    // Execute operation and extract outputs
    const result = cmd.addAndExecute(operation);
    const pointId = result.outputs.pointId;

    return { pointId };
  }
}

/**
 * IntersectionSequenceFactory - Factory for creating intersection point sequences
 * 
 * Phase 74: Refactored to eliminate IntersectionData string discriminator.
 * Instead of one method with type string dispatch, provides 3 type-specific methods.
 * Callers use instanceof checks to determine which method to call.
 * 
 * Encapsulates the operation sequence for creating intersection points between:
 * - Line-Line intersections
 * - Line-Circle intersections (with index for multiple intersections)
 * - Circle-Circle intersections (with index for multiple intersections)
 * 
 * Phase 42: Handles HalfHingeLine2D intersections by creating sibling points
 * on the complementary plane (follows same pattern as SiblingGuide2D from Phase 36).
 * 
 * Pattern: Open Command - Receives an open Command, adds operations to it.
 * 
 * Benefits:
 * - No string discriminator round-trip (instanceof → string → dispatch)
 * - Type-safe: each method knows exactly what it handles
 * - Callers use instanceof directly, matching Phase 73 architectural principle
 * - Testable without tool infrastructure
 * - Reusable across different UIs or automation contexts
 * 
 * Example:
 * ```typescript
   * const cmd = new Command('Create intersection', context);
 * const element1 = world.getLine2D(id1);
 * const element2 = world.getLine2D(id2);
 * 
 * // Caller uses instanceof to select method
 * let result;
 * if (element1 instanceof Line2D && element2 instanceof Line2D) {
 *   result = IntersectionSequenceFactory.createLineLineIntersection(
 *     cmd, planeId, id1, id2, world
 *   );
 * }
 * ```
 * 
 * @see frontend/src/commands/factories/README.md
 * @see data-model.md §HalfHingeLine2D Intersection Sibling Behavior
 */

import type { Command } from '../Command';
import { AddLineLineIntersectionPoint2DOp } from '../operations/world/AddLineLineIntersectionPoint2DOp';
import { AddLineCircleIntersectionPoint2DOp } from '../operations/world/AddLineCircleIntersectionPoint2DOp';
import { AddCircleCircleIntersectionPoint2DOp } from '../operations/world/AddCircleCircleIntersectionPoint2DOp';
import { AddSiblingIntersectionPoint2DOp } from '../operations/world/AddSiblingIntersectionPoint2DOp';
import { recordProcessTreeAction, requireStringOutput } from './sequenceFactoryHelpers';
import { createLineLineIntersectionPointAction } from '@/domain/processTree/actions/CreateLineLineIntersectionPointAction';
import { createLineCircleIntersectionPointAction } from '@/domain/processTree/actions/CreateLineCircleIntersectionPointAction';
import { createCircleCircleIntersectionPointAction } from '@/domain/processTree/actions/CreateCircleCircleIntersectionPointAction';
import { createSiblingIntersectionPointAction } from '@/domain/processTree/actions/CreateSiblingIntersectionPointAction';
import type { World } from '@/domain/world/World';
import { GeometryElementLookup } from '@/domain/world/GeometryElementLookup';
import { HalfHingeLine2D } from '@/domain/world/HingeLine';
import { Point2DLineLineIntersection, Point2DLineCircleIntersection, Point2DCircleCircleIntersection, type Point2D } from '@/domain/world/Point';

/**
 * Result of intersection creation with optional sibling point
 */
export interface IntersectionResult {
  pointId: string;
  siblingPointId?: string;
}

/**
 * Factory for creating intersection point operation sequences
 */
export class IntersectionSequenceFactory {
  /**
   * Create a line-line intersection point.
   * 
   * If either line is a HalfHingeLine2D, automatically creates a sibling
   * intersection point on the complementary plane.
   * 
   * @param cmd - Open Command to add operations to
   * @param planeId - ID of the projection plane
   * @param line1Id - ID of first line
   * @param line2Id - ID of second line
   * @param world - World instance for HHL detection and sibling plane resolution
   * @returns Object with pointId and optional siblingPointId
   * @throws Error if operation fails
   */
  static createLineLineIntersection(
    cmd: Command,
    planeId: string,
    line1Id: string,
    line2Id: string,
    world: World,
    groupId: string
  ): IntersectionResult {
    const operation = new AddLineLineIntersectionPoint2DOp(planeId, line1Id, line2Id);
    const result = this.executeWithSiblingSupport(cmd, operation, planeId, world);
    
    // Record ProcessTree action for primary intersection
    const action = createLineLineIntersectionPointAction(result.pointId);
    recordProcessTreeAction(cmd, action, groupId);
    
    this.recordSiblingActionIfCreated(cmd, world, result, groupId);
    
    return result;
  }

  /**
   * Create a line-circle intersection point.
   * 
   * If the line is a HalfHingeLine2D, automatically creates a sibling
   * intersection point on the complementary plane.
   * 
   * @param cmd - Open Command to add operations to
   * @param planeId - ID of the projection plane
   * @param lineId - ID of the line
   * @param circleId - ID of the circle
   * @param index - Which intersection point (0 or 1) when two exist
   * @param world - World instance for HHL detection and sibling plane resolution
   * @returns Object with pointId and optional siblingPointId
   * @throws Error if operation fails
   */
  static createLineCircleIntersection(
    cmd: Command,
    planeId: string,
    lineId: string,
    circleId: string,
    index: number,
    world: World,
    groupId: string
  ): IntersectionResult {
    const operation = new AddLineCircleIntersectionPoint2DOp(planeId, lineId, circleId, index);
    const result = this.executeWithSiblingSupport(cmd, operation, planeId, world);
    
    // Record ProcessTree action for primary intersection
    const action = createLineCircleIntersectionPointAction(result.pointId);
    recordProcessTreeAction(cmd, action, groupId);
    
    this.recordSiblingActionIfCreated(cmd, world, result, groupId);
    
    return result;
  }

  /**
   * Create a circle-circle intersection point.
   * 
   * Circles do not create sibling intersections (circles cannot be HalfHingeLines).
   * 
   * @param cmd - Open Command to add operations to
   * @param planeId - ID of the projection plane
   * @param circle1Id - ID of first circle
   * @param circle2Id - ID of second circle
   * @param index - Which intersection point (0 or 1) when two exist
   * @param world - World instance for validation
   * @returns Object with pointId and optional siblingPointId
   * @throws Error if operation fails
   */
  static createCircleCircleIntersection(
    cmd: Command,
    planeId: string,
    circle1Id: string,
    circle2Id: string,
    index: number,
    world: World,
    groupId: string
  ): IntersectionResult {
    const operation = new AddCircleCircleIntersectionPoint2DOp(planeId, circle1Id, circle2Id, index);
    const result = this.executeWithSiblingSupport(cmd, operation, planeId, world);
    
    // Record ProcessTree action for primary intersection
    const action = createCircleCircleIntersectionPointAction(result.pointId);
    
    recordProcessTreeAction(cmd, action, groupId);
    
    // Note: Circles never create siblings, so no sibling action needed
    
    return result;
  }

  /**
   * Execute intersection operation and create sibling if needed (shared logic)
   */
  private static executeWithSiblingSupport(
    cmd: Command,
    operation: AddLineLineIntersectionPoint2DOp | AddLineCircleIntersectionPoint2DOp | AddCircleCircleIntersectionPoint2DOp,
    planeId: string,
    world: World
  ): IntersectionResult {
    // Execute primary operation and extract outputs
    const result = cmd.addAndExecute(operation);
    const pointId = requireStringOutput(result, 'pointId', 'pointId missing from intersection operation output');
    
    let siblingPointId: string | undefined;

    // Check if either element is HalfHingeLine2D and get sibling plane
    const plane = world.getProjectionPlaneById(planeId);
    if (!plane) {
      throw new Error(`Plane not found: ${planeId}`);
    }

    const primaryPoint = plane.getPoint(pointId);
    if (!primaryPoint) {
      throw new Error(`Primary intersection point not found: ${pointId}`);
    }

    const siblingPlaneId = getSiblingPlaneForIntersection(world, primaryPoint);

    if (siblingPlaneId) {
      // Create sibling intersection using coordinate correspondence
      const siblingResult = cmd.addAndExecute(
        new AddSiblingIntersectionPoint2DOp(siblingPlaneId, pointId)
      );
      siblingPointId = requireStringOutput(siblingResult, 'pointId', 'pointId missing from sibling intersection operation output');
    }

    return { pointId, siblingPointId };
  }

  private static recordSiblingActionIfCreated(
    cmd: Command,
    world: World,
    result: IntersectionResult,
    groupId: string
  ): void {
    if (!result.siblingPointId) return;

    const lookup = new GeometryElementLookup(world);
    const primaryPoint = lookup.getPoint2D(result.pointId);
    if (!primaryPoint || !getSiblingPlaneForIntersection(world, primaryPoint)) return;

    recordProcessTreeAction(
      cmd,
      createSiblingIntersectionPointAction(result.siblingPointId),
      groupId
    );
  }
}

function getSiblingPlaneForIntersection(world: World, intersectionPoint: Point2D): string | undefined {
  const lookup = new GeometryElementLookup(world);
  const [element1Id, element2Id] = getIntersectionElementIds(intersectionPoint);
  const element1 = element1Id ? lookup.getLine2D(element1Id) : undefined;
  const element2 = element2Id ? lookup.getLine2D(element2Id) : undefined;
  const halfHingeLine = element1 instanceof HalfHingeLine2D
    ? element1
    : element2 instanceof HalfHingeLine2D
      ? element2
      : undefined;

  if (!halfHingeLine) return undefined;
  return world.getHingeLineById(halfHingeLine.hingeLineId)?.getOtherPlane(intersectionPoint.planeId) || undefined;
}

function getIntersectionElementIds(intersectionPoint: Point2D): [string | undefined, string | undefined] {
  if (intersectionPoint instanceof Point2DLineLineIntersection) {
    return [intersectionPoint.line1Id, intersectionPoint.line2Id];
  }
  if (intersectionPoint instanceof Point2DLineCircleIntersection) {
    return [intersectionPoint.lineId, intersectionPoint.circleId];
  }
  if (intersectionPoint instanceof Point2DCircleCircleIntersection) {
    return [intersectionPoint.circle1Id, intersectionPoint.circle2Id];
  }
  return [undefined, undefined];
}

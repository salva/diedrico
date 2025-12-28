/**
 * Composable for automatic point creation during tool usage
 * Implements FR-023: automatic intersection point creation
 * and automatic free point creation when clicking on empty space
 */

import { useWorldStore } from '@/stores/worldStore';
import { useSnapping } from './useSnapping';
import { useElementGeometry } from './useElementGeometry';
import { CreateFreePointCommand } from '@/commands/CreateFreePointCommand';
import { CreateIntersectionPointCommand } from '@/commands/CreateIntersectionPointCommand';
import type { Element2D, Point2D } from '@/types/ElementTypes';

/**
 * Get coordinates of a Point2D element
 */
function getPointCoordinates(point: Point2D): { x: number; y: number } | null {
  if (point.kind === 'Point2DFree' || point.kind === 'Point2DDerived') {
    return { x: point.x, y: point.y };
  }
  // For Point2DFromIntersection, coordinates need to be computed
  // This is a placeholder - will be computed during recomputation
  return { x: 0, y: 0 };
}

export interface PointCreationResult {
  pointId: string;
  isExisting: boolean;
  isIntersection: boolean;
  isFree: boolean;
  created: boolean;
}

export function useImplicitPointCreation() {
  const worldStore = useWorldStore();
  const { snapToPoint } = useSnapping();
  const { findIntersectingElements } = useElementGeometry();

  /**
   * Create or find a point at the given location
   * Priority: existing point > intersection > free point
   * 
   * @param x X coordinate in workspace
   * @param y Y coordinate in workspace
   * @param planeId Active plane ID
   * @param actionId Parent action ID for auxiliary actions
   * @param snapRadius Snap radius for existing points
   * @returns Point creation result with point ID
   */
  const createPointIfNeeded = (
    x: number,
    y: number,
    planeId: string,
    actionId: string,
    snapRadius: number = 10
  ): PointCreationResult | null => {
    // 1. Check if clicking near an existing point (highest priority)
    const snappedPoint = snapToPoint(x, y);
    if (snappedPoint.snapped) {
      // Find the actual point at these coordinates
      const points = worldStore.allElements2D.filter(
        (el): el is Point2D => el.kind.startsWith('Point2D') && el.planeId === planeId
      );
      
      for (const point of points) {
        const coords = getPointCoordinates(point);
        if (coords && Math.abs(coords.x - snappedPoint.x) < 0.1 && Math.abs(coords.y - snappedPoint.y) < 0.1) {
          return {
            pointId: point.id,
            isExisting: true,
            isIntersection: false,
            isFree: false,
            created: false
          };
        }
      }
    }

    // 2. Check if clicking on an intersection between elements
    const intersections = findIntersectingElements(x, y, snapRadius);
    if (intersections.length > 0) {
      // Found intersection - create intersection point automatically
      const { element1, element2 } = intersections[0];

      const command = new CreateIntersectionPointCommand(
        {
          element1Id: element1.id,
          element2Id: element2.id,
          intersectionIndex: 0, // Default to first intersection
          planeId: planeId,
          actionId: actionId // Auxiliary action
        },
        worldStore
      );

      const result = command.execute();

      if (result.success && result.outputs?.pointId) {
        return {
          pointId: result.outputs.pointId,
          isExisting: false,
          isIntersection: true,
          isFree: false,
          created: true
        };
      }
    }

    // 3. Create free point at clicked location (empty space)
    const command = new CreateFreePointCommand(
      {
        x: x,
        y: y,
        planeId: planeId,
        actionId: actionId // Auxiliary action
      },
      worldStore
    );

    const result = command.execute();

    if (result.success && result.outputs?.pointId) {
      return {
        pointId: result.outputs.pointId,
        isExisting: false,
        isIntersection: false,
        isFree: true,
        created: true
      };
    }

    return null;
  };

  /**
   * Detect what action would occur at the given location
   * Used for visual feedback before clicking
   */
  const detectPointAction = (
    x: number,
    y: number,
    planeId: string,
    snapRadius: number = 10
  ): 'snap-to-point' | 'snap-to-intersection' | 'create-free-point' => {
    // Check for existing point
    const snappedPoint = snapToPoint(x, y);
    if (snappedPoint.snapped) {
      // Find if there's an actual point at these coordinates
      const points = worldStore.allElements2D.filter(
        (el): el is Point2D => el.kind.startsWith('Point2D') && el.planeId === planeId
      );
      
      for (const point of points) {
        const coords = getPointCoordinates(point);
        if (coords && Math.abs(coords.x - snappedPoint.x) < 0.1 && Math.abs(coords.y - snappedPoint.y) < 0.1) {
          return 'snap-to-point';
        }
      }
    }

    // Check for intersection
    const intersections = findIntersectingElements(x, y, snapRadius);
    if (intersections.length > 0) {
      return 'snap-to-intersection';
    }

    // Default: create free point
    return 'create-free-point';
  };

  /**
   * Find all intersections on the active plane for visual markers
   */
  const findAllIntersections = (planeId: string): Array<{ x: number; y: number; elements: Element2D[] }> => {
    const intersections: Array<{ x: number; y: number; elements: Element2D[] }> = [];
    
    // Get all elements on this plane
    const elements = worldStore.allElements2D.filter((el: Element2D) => 
      el.planeId === planeId && 
      !el.infeasible &&
      (el.kind.startsWith('Line2D') || el.kind.startsWith('Segment2D') || el.kind.startsWith('Circle2D'))
    );

    // Check each pair of elements for intersections
    for (let i = 0; i < elements.length; i++) {
      for (let j = i + 1; j < elements.length; j++) {
        // TODO: Compute actual intersection points
        // This is a placeholder - full implementation would compute geometric intersections
        // For now, we'll let findIntersectingElements handle detection dynamically
      }
    }

    return intersections;
  };

  return {
    createPointIfNeeded,
    detectPointAction,
    findAllIntersections
  };
}

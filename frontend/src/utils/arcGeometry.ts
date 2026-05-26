/**
 * computeArcGeometry - Compute arc visualization between sibling guides
 * 
 * Phase 101: Broken Hinge Lines (BHL) - Arc Rendering
 * 
 * Creates a smooth arc connecting two corresponding guide points on sibling BHHLs.
 * The arc is rendered in paper coordinates (canvas space) and uses a quadratic Bezier curve.
 * 
 * Algorithm:
 * 1. Get guide endpoints in 2D plane coordinates
 * 2. Transform endpoints to paper coordinates (canvas space)
 * 3. Compute midpoint and control point for Bezier curve
 * 4. Return ArcGeometry with points in paper coordinates
 * 
 * GEOMETRIC PRINCIPLE:
 * - Primary guide on BHHL1 (plane P1)
 * - Sibling guide on BHHL2 (plane P2)
 * - Arc represents corresponding distance transport between planes
 * - Arc is perpendicular to both guides at endpoints (smooth tangent transition)
 * 
 * @param world World instance for coordinate transformations
 * @param primaryGuide Guide2D on primary BHHL
 * @param siblingGuide Guide2D on sibling BHHL
 * @returns ArcGeometry in paper coordinates, or null if infeasible
 * 
 * @see ArcGeometry in types/arcGeometry.ts
 */

import type { World } from '@/domain/world/World';
import type { Guide2D, SiblingGuide2D } from '@/domain/world/Guide';
import type { ArcGeometry } from '@/types/arcGeometry';
import { DEFAULT_ARC_STYLE } from '@/types/arcGeometry';
import { Vector2, Vector3 } from 'three';

/**
 * Compute arc geometry between two sibling guides
 */
export function computeArcGeometry(
  world: World,
  primaryGuide: Guide2D,
  siblingGuide: SiblingGuide2D
): ArcGeometry | null {
  try {
    // Realize both guides in their respective 2D plane coordinates
    const primaryReal = primaryGuide.realize2D(world);
    const siblingReal = siblingGuide.realize2D(world);

    if (!primaryReal || !siblingReal || !primaryReal.isFeasible() || !siblingReal.isFeasible()) {
      return null;
    }

    // Get projection plane realizations to transform to paper coordinates
    const primaryPlaneReal = world.getProjectionPlane2DRealization(primaryGuide.planeId);
    const siblingPlaneReal = world.getProjectionPlane2DRealization(siblingGuide.planeId);

    if (!primaryPlaneReal || !siblingPlaneReal) {
      return null;
    }

    // The line realization point anchors are the corresponding guide endpoints in
    // each plane's intrinsic coordinates. SiblingGuide2D intentionally has no
    // throughPointId; correspondence is owned by its realization.
    const primaryPt = new Vector3(
      primaryReal.point1.x,
      primaryReal.point1.y,
      1
    ).applyMatrix3(primaryPlaneReal.planeToPaper2D);

    const siblingPt = new Vector3(
      siblingReal.point1.x,
      siblingReal.point1.y,
      1
    ).applyMatrix3(siblingPlaneReal.planeToPaper2D);

    // Create Vector2 for the arc endpoints
    const startPoint = new Vector2(primaryPt.x, primaryPt.y);
    const endPoint = new Vector2(siblingPt.x, siblingPt.y);

    // Compute quadratic Bezier control point
    // Use midpoint with slight offset perpendicular to line for smooth curve
    const midpoint = new Vector2(
      (startPoint.x + endPoint.x) / 2,
      (startPoint.y + endPoint.y) / 2
    );

    // Vector from start to end
    const delta = new Vector2(
      endPoint.x - startPoint.x,
      endPoint.y - startPoint.y
    );

    // Perpendicular offset (rotate 90 degrees)
    // Offset magnitude is 20% of distance for gentle curve
    const offsetMagnitude = delta.length() * 0.2;
    const perpendicular = new Vector2(-delta.y, delta.x).normalize().multiplyScalar(offsetMagnitude);

    const controlPoint = new Vector2(
      midpoint.x + perpendicular.x,
      midpoint.y + perpendicular.y
    );

    // Return ArcGeometry
    return {
      startPoint,
      endPoint,
      controlPoints: [controlPoint],
      style: DEFAULT_ARC_STYLE
    };
  } catch (error) {
    console.error('[computeArcGeometry] Error computing arc:', error);
    return null;
  }
}

/**
 * Guide2D - Guide line perpendicular to hinge line or BHL projection
 * 
 * Guides are special lines used in dihedral geometry for transporting
 * points and distances between projection planes.
 * 
 * Key properties:
 * - Always perpendicular to a reference line (hinge line or BHL projection)
 * - Pass through a user-specified point
 * - Belong to BOTH planes associated with the reference line
 * - Render as dashed lines extending to viewport edges
 * 
 * Design principles:
 * - Principle V: Homogeneous coordinates for perpendicular calculation
 * - Guides store DEFINITION (lineId, pointId), realization stores computed geometry
 * 
 * @see specs/001-dihedral-learning-mvp/data-model.md#guide
 * @see specs/001-dihedral-learning-mvp/spec.md#guides
 */

import { Vector3 } from 'three';
import { Line2DPerpendicularToLine, Line2DRealization2D, Line2D } from './Line';
import { intersectLineLine } from '@/domain/calculations/Intersections';

/**
 * Guide2D - Guide line perpendicular to reference line (hinge line or BHL)
 * 
 * Guides are by definition perpendicular to a reference line and pass through a point.
 * They have special properties:
 * - Dashed rendering extending to viewport edges
 * - Dual plane membership (belong to both planes of the reference line)
 * - Used for transporting points and distances between planes
 * 
 * Extends Line2DPerpendicularToLine to inherit perpendicular line computation.
 */
export class Guide2D extends Line2DPerpendicularToLine {
  readonly type: 'perpendicular-to-line' = 'perpendicular-to-line';
  visible: boolean = true;  // Whether guide is visible in the canvas
  siblingGuideId?: string;  // ID of the sibling guide in the paired plane

  constructor(
    id: string,
    referenceLineId: string,
    throughPointId: string,
    planeId: string,
    label?: string,
    siblingGuideId?: string
  ) {
    super(id, referenceLineId, throughPointId, planeId, label);
    this.siblingGuideId = siblingGuideId;
  }

  clone(): Guide2D {
    return new Guide2D(
      this.id,
      this.referenceLineId,
      this.throughPointId,
      this.planeId,
      this.label,
      this.siblingGuideId
    );
  }

  /**
   * Calculate 2D realization - compute guide perpendicular to reference line
   * 
   * Algorithm:
   * 1. Get reference line's realization (point + direction)
   * 2. Compute perpendicular direction using 90-degree rotation
   * 3. Get the through-point position
   * 4. Return guide as line through the point with perpendicular direction
   * 
   * Perpendicular in 2D homogeneous coordinates:
   * - If line has direction (dx, dy, 0), perpendicular is (-dy, dx, 0)
   * - This is a counter-clockwise 90-degree rotation
   * - Works correctly with homogeneous coords (z=0 for direction vectors)
   * 
   * NOTE: Guides use Line2DRealization2D directly per architectural principle.
   * Guides are lines with special rendering (dashed, dual-plane), but geometrically
   * they are simply lines. Type distinction happens at domain level (Guide2D), not
   * realization level. See data-model.md §Line2D Constructions.
   */
  realize2D(world: import('./World').World): Line2DRealization2D | null {
    // Get reference line realization from world
    const referenceLine = world.getLine2DRealization(this.referenceLineId);
    if (!referenceLine) {
      return null;  // Cannot compute guide without reference line
    }

    // Check if reference line is infeasible - propagate infeasibility
    if (!referenceLine.feasible) {
      console.warn('[Guide2DPerpendicularToLine] Reference line is infeasible, marking guide as infeasible');
      return new Line2DRealization2D(new Vector3(0, 0, 1), new Vector3(1, 0, 0), false);
    }

    // Get through-point realization from world
    const throughPointRealization = world.getPoint2DRealization(this.throughPointId);
    if (!throughPointRealization) {
      return null;  // Cannot compute guide without through-point
    }

    // Check if through-point is infeasible - propagate infeasibility
    if (!throughPointRealization.feasible) {
      console.warn('[Guide2DPerpendicularToLine] Through-point is infeasible, marking guide as infeasible');
      return new Line2DRealization2D(new Vector3(0, 0, 1), new Vector3(1, 0, 0), false);
    }

    // Compute perpendicular direction using 90-degree rotation
    // If line direction is (dx, dy, 0), perpendicular is (-dy, dx, 0)
    const lineDirection = referenceLine.getDirection();
    const perpendicularDirection = new Vector3(
      -lineDirection.y,  // -dy
      lineDirection.x,   // dx
      0                  // Direction vector, no translation
    );

    // Check for degenerate case (shouldn't happen if reference line is valid)
    if (perpendicularDirection.lengthSq() < 1e-10) {
      console.warn(`Guide ${this.id}: reference line has zero direction`);
      return new Line2DRealization2D(throughPointRealization.position.clone(), new Vector3(1, 0, 0), false);
    }

    // Create guide realization: line through throughPoint with perpendicular direction
    return new Line2DRealization2D(throughPointRealization.position.clone(), perpendicularDirection, true);
  }
}

/**
 * SiblingGuide2D - Automatically created companion guide in paired projection plane
 * 
 * When a user creates a Guide2D in one projection plane (e.g., P_H), a SiblingGuide2D
 * is automatically created in the other plane (e.g., P_V). Both guides:
 * - Share the same name and visual style
 * - Are perpendicular to their respective HalfHingeLine2D projections
 * - Are geometrically linked (both represent the same 3D construction)
 * - Are deleted together (cascade deletion via dependency system)
 * 
 * Sibling guides use the same coordinate optimization as sibling intersection points:
 * the guide in plane P_H and its sibling in plane P_V have identical geometric
 * parameters when constructed from the same parent HingeLine.
 * 
 * Architecture:
 * - Sibling plane derived via: HalfHingeLine2D → HingeLine → getOtherPlane()
 * - Created at command level using AddSiblingGuide2DOp
 * - Primary/sibling distinction is semantic (who initiated creation)
 * - Both guides have equal geometric status
 * 
 * Note: SiblingGuide2D extends Line2D directly (not Line2DPerpendicularToLine)
 * to have its own type discriminator, similar to SiblingIntersectionPoint2D pattern.
 * 
 * @see specs/001-dihedral-learning-mvp/data-model.md#siblingguide2d
 */
export class SiblingGuide2D extends Line2D {
  readonly type: 'sibling-guide' = 'sibling-guide';
  readonly referenceLineId: string;  // HalfHingeLine2D in sibling plane
  primaryGuideId: string;  // ID of the primary guide this sibling derives from
  visible: boolean = true;  // Whether guide is visible in the canvas

  constructor(
    id: string,
    referenceLineId: string,
    planeId: string,
    primaryGuideId: string,
    label?: string
  ) {
    super(id, planeId, label);
    this.referenceLineId = referenceLineId;
    this.primaryGuideId = primaryGuideId;
  }

  clone(): SiblingGuide2D {
    return new SiblingGuide2D(
      this.id,
      this.referenceLineId,
      this.planeId,
      this.primaryGuideId,
      this.label
    );
  }

  /**
   * Calculate 2D realization using coordinate correspondence pattern
   * 
   * COORDINATE CORRESPONDENCE: The position where the sibling guide intersects its
   * HalfHingeLine is the twin of where the primary guide intersects its HalfHingeLine.
   * Both HalfHingeLine2D objects use identical parameterization (same point and direction
   * in local coordinates), enabling direct coordinate transfer.
   * 
   * Algorithm:
   * 1. Get primary guide's realization
   * 2. Find where primary guide intersects its HalfHingeLine → get (u,v) coordinates
   * 3. Use those SAME (u,v) coordinates on the sibling HalfHingeLine (coordinate twin)
   * 4. Compute perpendicular direction to sibling HalfHingeLine
   * 5. Return line through twin position with perpendicular direction
   * 
   * This follows the same pattern as SiblingIntersectionPoint2D: parent objects are
   * "primary guide + half HL" rather than "line + point", and we use coordinate
   * correspondence instead of explicit through-point.
   * 
   * @param world World instance to access primary guide and HalfHingeLine realizations
   * @returns Line2DRealization2D with perpendicular line to sibling HalfHingeLine
   */
  realize2D(world: import('./World').World): Line2DRealization2D | null {
    // Get primary guide's realization
    const primaryGuide = world.getLine2DById(this.primaryGuideId);
    if (!primaryGuide) {
      console.warn(`[SiblingGuide2D] Cannot find primary guide ${this.primaryGuideId}`);
      return null;
    }

    const primaryGuideRealization = world.getLine2DRealization(this.primaryGuideId);
    if (!primaryGuideRealization) {
      return null;  // Cannot compute without primary guide realization
    }

    // Check if primary guide is infeasible - propagate infeasibility
    if (!primaryGuideRealization.feasible) {
      console.warn('[SiblingGuide2D] Primary guide is infeasible, marking sibling guide as infeasible');
      return new Line2DRealization2D(new Vector3(0, 0, 1), new Vector3(1, 0, 0), false);
    }

    // Get primary guide's HalfHingeLine to find the intersection point
    // Primary guide is Guide2D which extends Line2DPerpendicularToLine
    const primaryReferenceLineId = (primaryGuide as any).referenceLineId;
    if (!primaryReferenceLineId) {
      console.warn(`[SiblingGuide2D] Cannot find referenceLineId on primary guide ${this.primaryGuideId}`);
      return null;
    }

    const primaryHalfHingeLineRealization = world.getLine2DRealization(primaryReferenceLineId);
    if (!primaryHalfHingeLineRealization) {
      console.warn(`[SiblingGuide2D] Cannot get realization for primary HalfHingeLine ${primaryReferenceLineId}`);
      return null;
    }

    // Find intersection of primary guide with its HalfHingeLine
    // This gives us the (u,v) coordinates we'll use on the sibling HalfHingeLine
    const intersectionResult = intersectLineLine(primaryGuideRealization, primaryHalfHingeLineRealization);
    
    if (intersectionResult.type !== 'point' || !intersectionResult.point) {
      console.warn(`[SiblingGuide2D] Primary guide does not intersect its HalfHingeLine (type: ${intersectionResult.type})`);
      return new Line2DRealization2D(new Vector3(0, 0, 1), new Vector3(1, 0, 0), false);
    }

    // The intersection point's coordinates are what we'll use on the sibling HalfHingeLine
    // This is the coordinate correspondence: same (u,v) on both parameterized HalfHingeLines
    const twinPosition = intersectionResult.point.clone();

    // Get sibling HalfHingeLine realization
    const siblingHalfHingeLineRealization = world.getLine2DRealization(this.referenceLineId);
    if (!siblingHalfHingeLineRealization) {
      return null;  // Cannot compute without sibling HalfHingeLine
    }

    // Check if sibling HalfHingeLine is infeasible - propagate infeasibility
    if (!siblingHalfHingeLineRealization.feasible) {
      console.warn('[SiblingGuide2D] Sibling HalfHingeLine is infeasible, marking sibling guide as infeasible');
      return new Line2DRealization2D(new Vector3(0, 0, 1), new Vector3(1, 0, 0), false);
    }

    // Compute perpendicular direction to sibling HalfHingeLine
    // If line direction is (dx, dy, 0), perpendicular is (-dy, dx, 0)
    const hingeDirection = siblingHalfHingeLineRealization.getDirection();
    const perpendicularDirection = new Vector3(
      -hingeDirection.y,  // -dy
      hingeDirection.x,   // dx
      0                   // Direction vector, no translation
    );

    // Check for degenerate case (shouldn't happen if HalfHingeLine is valid)
    if (perpendicularDirection.lengthSq() < 1e-10) {
      console.warn(`SiblingGuide2D ${this.id}: sibling HalfHingeLine has zero direction`);
      return new Line2DRealization2D(twinPosition, new Vector3(1, 0, 0), false);
    }

    // Create sibling guide realization: line through twin position with perpendicular direction
    return new Line2DRealization2D(twinPosition, perpendicularDirection, true);
  }
}

// Type guards for Guide types
export function isGuide2D(line: Line2D): line is Guide2D {
  return line.type === 'perpendicular-to-line' && 'visible' in line && !('primaryGuideId' in line);
}

export function isSiblingGuide2D(line: Line2D): line is SiblingGuide2D {
  return line.type === 'sibling-guide';
}

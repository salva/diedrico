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
  readonly type: 'guide' = 'guide';
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
    const plane = world.getProjectionPlaneById(this.planeId);
    const refLine = plane?.getLine(this.referenceLineId);
    const referenceLine = refLine?.realize2D(world);
    if (!referenceLine) {
      return null;  // Cannot compute guide without reference line
    }

    // Check if reference line is infeasible - propagate infeasibility
    if (!referenceLine.feasible) {
      console.warn('[Guide2DPerpendicularToLine] Reference line is infeasible, marking guide as infeasible');
      return new Line2DRealization2D(new Vector3(0, 0, 1), new Vector3(1, 0, 0), false);
    }

    // Get through-point realization from world
    const throughPoint = plane?.getPoint(this.throughPointId);
    const throughPointRealization = throughPoint?.realize2D(world);
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
   * Calculate 2D realization using parametric scalar correspondence pattern
   * 
   * PARAMETRIC SCALAR CORRESPONDENCE: Both HalfHingeLine2D objects use identical
   * parameterization (same reference point Q and direction D). When the primary guide
   * intersects its HalfHingeLine at position R = Q + d·D, the sibling guide intersects
   * its HalfHingeLine at R' = Q' + d·D' using the SAME scalar d.
   * 
   * Algorithm:
   * 1. Get primary guide's realization
   * 2. Find where primary guide intersects its HalfHingeLine → point R
   * 3. Express R parametrically: R = Q + d·D (extract scalar d)
   * 4. Use SAME scalar d on sibling HalfHingeLine: R' = Q' + d·D'
   * 5. Compute perpendicular direction to sibling HalfHingeLine
   * 6. Return line through R' with perpendicular direction
   * 
   * This follows the same pattern as SiblingIntersectionPoint2D: parent objects are
   * "primary guide + half HL" rather than "line + point", and we use parametric
   * correspondence instead of explicit through-point.
   * 
   * @param world World instance to access primary guide and HalfHingeLine realizations
   * @returns Line2DRealization2D with perpendicular line to sibling HalfHingeLine
   */
  realize2D(world: import('./World').World): Line2DRealization2D | null {
    // Get primary guide's realization
    const primaryGuide = world.getLine2D(this.primaryGuideId);
    if (!primaryGuide) {
      console.warn(`[SiblingGuide2D] Cannot find primary guide ${this.primaryGuideId}`);
      return null;
    }

    const primaryGuidePlane = world.getProjectionPlaneById(primaryGuide.planeId);
    const primaryGuideRealization = primaryGuidePlane?.getLine(this.primaryGuideId)?.realize2D(world);
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

    const primaryRefLine = primaryGuidePlane?.getLine(primaryReferenceLineId);
    const primaryHalfHingeLineRealization = primaryRefLine?.realize2D(world);
    if (!primaryHalfHingeLineRealization) {
      console.warn(`[SiblingGuide2D] Cannot get realization for primary HalfHingeLine ${primaryReferenceLineId}`);
      return null;
    }

    // Find intersection of primary guide with its HalfHingeLine
    const intersectionResult = intersectLineLine(primaryGuideRealization, primaryHalfHingeLineRealization);
    
    if (intersectionResult.type !== 'point' || !intersectionResult.point) {
      console.warn(`[SiblingGuide2D] Primary guide does not intersect its HalfHingeLine (type: ${intersectionResult.type})`);
      return new Line2DRealization2D(new Vector3(0, 0, 1), new Vector3(1, 0, 0), false);
    }

    // Get primary HalfHingeLine's parametric representation: R = Q + d·D
    const primaryHHL = world.getLine2D(primaryReferenceLineId) as any;
    if (!primaryHHL || !primaryHHL.point || !primaryHHL.direction) {
      console.warn(`[SiblingGuide2D] Cannot get HalfHingeLine parametric data for ${primaryReferenceLineId}`);
      return null;
    }

    const Q = primaryHHL.point;      // Reference point
    const D = primaryHHL.direction;  // Direction vector
    const R = intersectionResult.point;  // Intersection point

    // Extract scalar d such that R = Q + d·D
    // We can use either x or y component (whichever has larger direction component to avoid division by small numbers)
    let d: number;
    if (Math.abs(D.x) > Math.abs(D.y)) {
      // Use x component: R.x = Q.x + d·D.x  =>  d = (R.x - Q.x) / D.x
      d = (R.x - Q.x) / D.x;
    } else if (Math.abs(D.y) > 1e-10) {
      // Use y component: R.y = Q.y + d·D.y  =>  d = (R.y - Q.y) / D.y
      d = (R.y - Q.y) / D.y;
    } else {
      console.warn(`[SiblingGuide2D] Primary HalfHingeLine has degenerate direction`);
      return new Line2DRealization2D(new Vector3(0, 0, 1), new Vector3(1, 0, 0), false);
    }

    // Get sibling HalfHingeLine's parametric representation: R' = Q' + d·D'
    const siblingHHL = world.getLine2D(this.referenceLineId) as any;
    if (!siblingHHL || !siblingHHL.point || !siblingHHL.direction) {
      console.warn(`[SiblingGuide2D] Cannot get sibling HalfHingeLine parametric data for ${this.referenceLineId}`);
      return null;
    }

    const Q_prime = siblingHHL.point;      // Sibling reference point (should equal Q due to identical parameterization)
    const D_prime = siblingHHL.direction;  // Sibling direction vector (should equal D due to identical parameterization)

    // Compute twin position using SAME scalar d: R' = Q' + d·D'
    const twinPosition = new Vector3(
      Q_prime.x + d * D_prime.x,
      Q_prime.y + d * D_prime.y,
      1  // Homogeneous coordinate for a point
    );

    // Get sibling HalfHingeLine realization for perpendicular computation
    const siblingPlane = world.getProjectionPlaneById(this.planeId);
    const siblingRefLine = siblingPlane?.getLine(this.referenceLineId);
    const siblingHalfHingeLineRealization = siblingRefLine?.realize2D(world);
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
  return line.type === 'guide';
}

export function isSiblingGuide2D(line: Line2D): line is SiblingGuide2D {
  return line.type === 'sibling-guide';
}

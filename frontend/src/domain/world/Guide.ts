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
import { Line2DPerpendicularToLine, Line2DRealization2D, Line2D, Line2DType } from './Line';
import { intersectLineLine } from '@/domain/calculations/Intersections';
import { HalfHingeLine2D } from './HingeLine';
import { HalfHingeLineRealization2D } from './HalfHingeLineRealization2D';
import { BrokenHalfHingeLine2D } from './elements/BrokenHalfHingeLine2D';
import { applyMatrix4x3, applyMatrix3x4 } from '@/utils/threeUtils';
import type { ArcGeometry } from '@/types/arcGeometry';

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
  visible: boolean = true;  // Whether guide is visible in the canvas
  siblingGuideId?: string;  // ID of the sibling guide in the paired plane
  arcGeometry?: ArcGeometry;  // Arc between this guide and sibling (Phase 101: Broken Hinge Lines)

  constructor(
    id: string,
    referenceLineId: string,
    throughPointId: string,
    planeId: string,
    label?: string,
    siblingGuideId?: string,
    arcGeometry?: ArcGeometry
  ) {
    // Phase 52: Pass 'guide' as type to parent constructor
    super(id, referenceLineId, throughPointId, planeId, label, 'guide');
    this.siblingGuideId = siblingGuideId;
    this.arcGeometry = arcGeometry;
  }

  clone(): Guide2D {
    return new Guide2D(
      this.id,
      this.referenceLineId,
      this.throughPointId,
      this.planeId,
      this.label,
      this.siblingGuideId,
      this.arcGeometry
    );
  }

  /**
   * Calculate 2D realization - compute guide perpendicular to reference line
   * 
   * Phase 76: Returns Line2DRealization2D (non-nullable)
   * - Missing dependencies: throw Error with [INTERNAL ERROR] prefix
   * - Geometric failures: return realization with feasible=false
   * 
   * Phase 101: For HalfHingeLine realizations, use the guideVector from realization
   * - HalfHingeLineRealization2D: use realization.guideVector (perpendicular for regular, parallel to T1 for broken)
   * - Other lines: compute perpendicular direction (90-degree rotation)
   * 
   * Algorithm:
   * 1. Get reference line's realization (point + direction)
   * 2. If HalfHingeLineRealization2D: use its guideVector
   * 3. Otherwise: Compute perpendicular direction using 90-degree rotation
   * 4. Get the through-point position
   * 5. Return guide as line through the point with computed direction
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
  realize2D(world: import('./World').World): Line2DRealization2D {
    // Get reference line realization from world
    const plane = world.getProjectionPlaneById(this.planeId)!;
    const refLine = plane.getLine(this.referenceLineId);
    
    if (!refLine) {
      throw new Error(`[INTERNAL ERROR] [Guide2D] referenceLineId ${this.referenceLineId} not found on plane ${this.planeId} for guide ${this.id}. Dependency graph corrupted.`);
    }
    
    const referenceLine = refLine.realize2D(world);

    // Check if reference line is infeasible - propagate infeasibility
    if (!referenceLine.feasible) {
      console.warn('[Guide2DPerpendicularToLine] Reference line is infeasible, marking guide as infeasible');
      return new Line2DRealization2D(new Vector3(0, 0, 1), new Vector3(1, 0, 0), false);
    }

    // Get through-point realization from world
    const throughPoint = plane.getPoint(this.throughPointId);
    
    if (!throughPoint) {
      throw new Error(`[INTERNAL ERROR] [Guide2D] throughPointId ${this.throughPointId} not found on plane ${this.planeId} for guide ${this.id}. Dependency graph corrupted.`);
    }
    
    const throughPointRealization = throughPoint.realize2D(world);

    // Check if through-point is infeasible - propagate infeasibility
    if (!throughPointRealization.feasible) {
      console.warn('[Guide2DPerpendicularToLine] Through-point is infeasible, marking guide as infeasible');
      return new Line2DRealization2D(new Vector3(0, 0, 1), new Vector3(1, 0, 0), false);
    }

    // Determine guide direction based on reference line type
    let guideDirection: Vector3;
    
    if (referenceLine instanceof HalfHingeLineRealization2D) {
      // Phase 101: For hinge lines (regular or broken), use the guideVector from realization
      // - Regular HalfHingeLine2D: guideVector is perpendicular to hinge
      // - BrokenHalfHingeLine2D: guideVector is parallel to main hinge T1
      guideDirection = referenceLine.getGuideVector();
    } else {
      // For other lines: compute perpendicular direction using 90-degree rotation
      // If line direction is (dx, dy, 0), perpendicular is (-dy, dx, 0)
      const lineDirection = referenceLine.getDirection();
      guideDirection = new Vector3(
        -lineDirection.y,  // -dy
        lineDirection.x,   // dx
        0                  // Direction vector, no translation
      );
    }

    // Check for degenerate case (shouldn't happen if reference line is valid)
    if (guideDirection.lengthSq() < 1e-10) {
      console.warn(`Guide ${this.id}: computed guide direction has zero length`);
      return new Line2DRealization2D(throughPointRealization.position.clone(), new Vector3(1, 0, 0), false);
    }

    // Create guide realization: line through throughPoint with computed direction
    return new Line2DRealization2D(throughPointRealization.position.clone(), guideDirection, true);
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
  readonly type: Line2DType = 'sibling-guide';
  readonly referenceLineId: string;  // HalfHingeLine2D in sibling plane
  primaryGuideId: string;  // ID of the primary guide this sibling derives from
  visible: boolean = true;  // Whether guide is visible in the canvas
  arcGeometry?: ArcGeometry;  // Arc between this guide and primary (Phase 101: Broken Hinge Lines)

  constructor(
    id: string,
    referenceLineId: string,
    planeId: string,
    primaryGuideId: string,
    label?: string,
    arcGeometry?: ArcGeometry
  ) {
    super(id, planeId, label);
    this.referenceLineId = referenceLineId;
    this.primaryGuideId = primaryGuideId;
    this.arcGeometry = arcGeometry;
  }

  clone(): SiblingGuide2D {
    return new SiblingGuide2D(
      this.id,
      this.referenceLineId,
      this.planeId,
      this.primaryGuideId,
      this.label,
      this.arcGeometry
    );
  }

  getDependencies(): string[] {
    return [this.referenceLineId, this.primaryGuideId];
  }

  /**
   * Get the primary guide and its plane by navigating through the hinge line relationship
   * 
   * Navigation path: myHHL → HingeLine → otherPlane → primaryGuide
   * 
   * @param world World instance for plane and hinge line lookup
   * @returns Object containing the primary guide, primary HHL, and sibling's own HHL
   */
  private getPrimaryGuideContext(world: import('./World').World): {
    primaryGuide: Guide2D;
    primaryHHL: HalfHingeLine2D;
    myHHL: HalfHingeLine2D;
  } {
    const myPlane = world.getProjectionPlaneById(this.planeId)!;
    const myHHL = myPlane.getLine(this.referenceLineId)! as HalfHingeLine2D;
    const hingeLine = world.getHingeLineById(myHHL.hingeLineId)!;
    const primaryPlaneId = hingeLine.getOtherPlane(this.planeId)!;
    const primaryPlane = world.getProjectionPlaneById(primaryPlaneId)!;
    const primaryGuide = primaryPlane.getLine(this.primaryGuideId)! as Guide2D;
    const primaryHHL = primaryPlane.getLine(primaryGuide.referenceLineId)! as HalfHingeLine2D;
    
    return { primaryGuide, primaryHHL, myHHL };
  }

  /**
   * Calculate 2D realization using parametric scalar correspondence pattern
   * 
   * Phase 76: Returns Line2DRealization2D (non-nullable)
   * - Missing dependencies: handled by getPrimaryGuideContext() with ! operators
   * - Geometric failures: return realization with feasible=false
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
  realize2D(world: import('./World').World): Line2DRealization2D {
    console.log(`[SiblingGuide2D] realize2D called for ${this.id}, primaryGuideId: ${this.primaryGuideId}`);
    
    // Get primary guide via: myHHL → HingeLine → otherPlane → primaryGuide
    const { primaryGuide, primaryHHL, myHHL } = this.getPrimaryGuideContext(world);
    
    const primaryGuideRealization = primaryGuide.realize2D(world);
    console.log(`[SiblingGuide2D] Primary guide realization feasible:`, primaryGuideRealization.feasible);

    // Check if primary guide is infeasible - propagate infeasibility
    if (!primaryGuideRealization.feasible) {
      console.warn('[SiblingGuide2D] Primary guide is infeasible, marking sibling guide as infeasible');
      return new Line2DRealization2D(new Vector3(0, 0, 1), new Vector3(1, 0, 0), false);
    }

    // Get primary guide's HalfHingeLine to find the intersection point
    const primaryHalfHingeLineRealization = primaryHHL.realize2D(world);

    // Find intersection of primary guide with its HalfHingeLine
    const intersectionPointReal = intersectLineLine(primaryGuideRealization, primaryHalfHingeLineRealization);
    
    // Check if intersection is feasible (lines not parallel)
    if (!intersectionPointReal.feasible) {
      console.warn('[SiblingGuide2D] Primary guide is parallel to its HalfHingeLine - no intersection');
      return new Line2DRealization2D(new Vector3(0, 0, 1), new Vector3(1, 0, 0), false);
    }
    
    // Get sibling HalfHingeLine realization (needed for both approaches)
    const siblingHalfHingeLineRealization = myHHL.realize2D(world);

    let twinPosition: Vector3;

    if (myHHL instanceof BrokenHalfHingeLine2D) {
      // BHHL 3D round-trip: Both BHHLs (T2 on primary plane, T2' on sibling plane) are
      // 2D representations of the SAME 3D BrokenHingeLine. The guide intersects T2 at
      // point R, which corresponds to a unique 3D point on the BHL. The twin position
      // is simply that same 3D point projected onto the sibling plane.
      //
      // Algorithm:
      // 1. R = guide ∩ T2 in primary plane local coords (already computed)
      // 2. R_3D = planeTo3D(primaryPlane) × R  (lift to 3D)
      // 3. R' = threeDToPlane(siblingPlane) × R_3D  (project to sibling plane)

      const R = intersectionPointReal.position;

      const primaryPlaneReal3D = world.getProjectionPlane3DRealization(primaryHHL.planeId);
      const siblingPlaneReal3D = world.getProjectionPlane3DRealization(this.planeId);

      if (!primaryPlaneReal3D?.feasible || !siblingPlaneReal3D?.feasible) {
        console.warn('[SiblingGuide2D] 3D plane realization infeasible for BHHL round-trip');
        return new Line2DRealization2D(new Vector3(0, 0, 1), new Vector3(1, 0, 0), false);
      }

      // Lift R to 3D (Vector3 → Vector4 homogeneous)
      const R_3D = applyMatrix4x3(R, primaryPlaneReal3D.planeTo3D);
      // Project back to sibling plane 2D (Vector4 → Vector3 homogeneous)
      const R_prime = applyMatrix3x4(R_3D, siblingPlaneReal3D.threeDToPlane);

      twinPosition = new Vector3(R_prime.x, R_prime.y, 1);

      console.log(`[SiblingGuide2D] BHHL 3D round-trip: R=(${R.x.toFixed(2)},${R.y.toFixed(2)}) → 3D=(${R_3D.x.toFixed(2)},${R_3D.y.toFixed(2)},${R_3D.z.toFixed(2)}) → twin=(${twinPosition.x.toFixed(2)},${twinPosition.y.toFixed(2)})`);
    } else {
      // Regular HHL case: Both planes share canonical coordinates.
      // Use parametric scalar correspondence: R = Q + d·D, R' = Q' + d·D'
      const Q = primaryHalfHingeLineRealization.point1;
      const D = primaryHalfHingeLineRealization.point2;
      const R = intersectionPointReal.position;

      let d: number;
      if (Math.abs(D.x) > Math.abs(D.y)) {
        d = (R.x - Q.x) / D.x;
      } else if (Math.abs(D.y) > 1e-10) {
        d = (R.y - Q.y) / D.y;
      } else {
        console.warn(`[SiblingGuide2D] Primary HalfHingeLine has degenerate direction`);
        return new Line2DRealization2D(new Vector3(0, 0, 1), new Vector3(1, 0, 0), false);
      }

      const Q_prime = siblingHalfHingeLineRealization.point1;
      const D_prime = siblingHalfHingeLineRealization.point2;

      twinPosition = new Vector3(
        Q_prime.x + d * D_prime.x,
        Q_prime.y + d * D_prime.y,
        1
      );
    }

    // Compute perpendicular direction using sibling HalfHingeLine realization;

    // Check if sibling HalfHingeLine is infeasible - propagate infeasibility
    if (!siblingHalfHingeLineRealization.feasible) {
      console.warn('[SiblingGuide2D] Sibling HalfHingeLine is infeasible, marking sibling guide as infeasible');
      return new Line2DRealization2D(new Vector3(0, 0, 1), new Vector3(1, 0, 0), false);
    }

    // Compute guide direction using sibling HalfHingeLine realization
    // Since the sibling reference is always a HalfHingeLine2D, its realization is always
    // HalfHingeLineRealization2D which provides getGuideVector():
    // - Regular HalfHingeLine2D: guideVector is perpendicular to hinge
    // - BrokenHalfHingeLine2D: guideVector is parallel to main hinge T1
    const guideDirection = (siblingHalfHingeLineRealization as HalfHingeLineRealization2D).getGuideVector();

    // Check for degenerate case (shouldn't happen if HalfHingeLine is valid)
    if (guideDirection.lengthSq() < 1e-10) {
      console.warn(`SiblingGuide2D ${this.id}: sibling HalfHingeLine has zero direction`);
      return new Line2DRealization2D(twinPosition, new Vector3(1, 0, 0), false);
    }

    // Create sibling guide realization: line through twin position with guide direction
    return new Line2DRealization2D(twinPosition, guideDirection, true);
  }
}

// Type guards for Guide types
export function isGuide2D(line: Line2D): line is Guide2D {
  return line instanceof Guide2D;
}

export function isSiblingGuide2D(line: Line2D): line is SiblingGuide2D {
  return line instanceof SiblingGuide2D;
}

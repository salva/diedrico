/**
 * HingeLine - Intersection line shared by two projection planes
 * 
 * A hinge line represents the physical fold between two projection planes
 * (e.g., HL_HV between P_H and P_V). It is NOT used for broken hinge lines (BHLs),
 * which are intersections between arbitrary 3D planes.
 * 
 * The hinge line exists in 3D space and automatically realizes on both planes it connects.
 * Each plane gets a HingeLineRealization2D (the 2D view of the hinge line on that plane).
 * 
 * **Phase 52**: Refactored to extend Element3D, removing id and label properties
 * which are now inherited from Element base class. Replaces `name` with `label`.
 * 
 * Reference: specs/001-dihedral-learning-mvp/data-model.md §HingeLine
 */

import { Vector3, Vector4 } from 'three';
import { Line2D, Line2DRealization2D } from './Line';
import { Element3D } from './Element3D';

/**
 * HalfHingeLine2D - 2D representation of a hinge line on a specific projection plane
 * 
 * Each HingeLine has exactly 2 HalfHingeLine2D objects (one per plane).
 * This represents how the hinge line appears in the plane's (u,v) coordinate system.
 * 
 * Design: HalfHingeLine2D extends Line2D so it can be used with all line operations.
 * It's a fixed line (cannot be deleted) that represents the fold between planes.
 * Guides reference HalfHingeLine2D (not HingeLine) because guides are perpendicular
 * to the 2D representation.
 * 
 * Reference: specs/001-dihedral-learning-mvp/data-model.md §HingeLine
 */
export class HalfHingeLine2D extends Line2D {
  readonly hingeLineId: string;  // Parent HingeLine
  readonly point: Vector3;       // Point on the line (homogeneous: u, v, 1)
  readonly direction: Vector3;   // Direction vector (homogeneous: du, dv, 0)

  constructor(
    id: string,
    hingeLineId: string,
    planeId: string,
    point: Vector3,
    direction: Vector3
  ) {
    super(id, planeId, `HL_${hingeLineId}`);
    this.hingeLineId = hingeLineId;
    this.point = point;
    this.direction = direction;
  }

  clone(): HalfHingeLine2D {
    return new HalfHingeLine2D(
      this.id,
      this.hingeLineId,
      this.planeId,
      this.point.clone(),
      this.direction.clone()
    );
  }

  /**
   * Realize this half-hinge line (returns geometric data directly)
   * HalfHingeLine2D stores its geometry directly, no computation needed
   * 
   * Returns infinite line: point1 (finite) + point2 (direction with z=0)
   * 
   * @param _world World instance (not used for hinge lines, which store geometry directly)
   */
  realize2D(_world: import('./World').World): Line2DRealization2D {
    // Infinite line: point1 is finite point (z=1), point2 is direction (z=0)
    return new Line2DRealization2D(this.point, this.direction);
  }
}

/**
 * HingeLine - Physical fold between two projection planes
 * 
 * The hinge line is a 3D element that automatically appears on both planes it connects.
 * It cannot be deleted and is not stored as Line2D entities - it's a fixed element.
 * 
 * Each HingeLine has exactly 2 HalfHingeLine2D objects (one per plane) that represent
 * how the hinge line appears in each plane's (u,v) coordinate system. These HalfHingeLine2D
 * objects are owned by their respective ProjectionPlane objects.
 * 
 * **Phase 52**: Refactored to extend Element3D. Inherits id and label from Element.
 * Implements getDependencies() to return [plane1Id, plane2Id].
 */
export class HingeLine extends Element3D {
  readonly plane1Id: string;  // First projection plane
  readonly plane2Id: string;  // Second projection plane
  readonly line3D?: {         // 3D representation (for future 3D rendering)
    point: Vector4;           // Point on line in 3D space
    direction: Vector4;       // Direction vector in 3D space
  };

  constructor(
    id: string,
    label: string,
    plane1Id: string,
    plane2Id: string,
    line3D?: { point: Vector4; direction: Vector4 }
  ) {
    // Phase 52: Call Element3D constructor with id and label
    super(id, label);
    
    if (plane1Id === plane2Id) {
      throw new Error('HingeLine: plane1 and plane2 must be distinct');
    }

    this.plane1Id = plane1Id;
    this.plane2Id = plane2Id;
    this.line3D = line3D;
  }

  /**
   * Get dependencies - IDs of planes this hinge line depends on
   * Implementation of Element3D.getDependencies()
   */
  getDependencies(): string[] {
    return [this.plane1Id, this.plane2Id];
  }

  /**
   * Clone this hinge line
   * Implementation of Element3D.clone()
   */
  clone(): HingeLine {
    return new HingeLine(
      this.id,
      this.label || '',
      this.plane1Id,
      this.plane2Id,
      this.line3D ? {
        point: this.line3D.point.clone(),
        direction: this.line3D.direction.clone()
      } : undefined
    );
  }

  /**
   * Check if this hinge line connects to the specified plane
   */
  connectsToPlane(planeId: string): boolean {
    return this.plane1Id === planeId || this.plane2Id === planeId;
  }

  /**
   * Get the other plane connected by this hinge line
   */
  getOtherPlane(planeId: string): string | null {
    if (planeId === this.plane1Id) return this.plane2Id;
    if (planeId === this.plane2Id) return this.plane1Id;
    return null;
  }

  /**
   * Validate that both HalfHingeLine2D objects use identical parametric representation
   * 
   * CRITICAL REQUIREMENT: For SiblingIntersectionPoint2D coordinate cloning to work,
   * both HalfHingeLine2D objects representing this HingeLine MUST use:
   *   - Same reference point Q (in local (u,v) coordinates)
   *   - Same direction vector D (in local (u,v) coordinates)
   * 
   * When Q=Q' and D=D', a point at R = Q + d·D on the primary plane
   * maps to R' = Q' + d·D' = Q + d·D = R on the sibling plane (identical coordinates).
   * 
   * Breaking this constraint causes sibling points to compute incorrect positions silently.
   * 
   * @param halfHinge1 First HalfHingeLine2D object
   * @param halfHinge2 Second HalfHingeLine2D object
   * @throws Error if parametric consistency is violated
   */
  static validateParametricConsistency(
    halfHinge1: HalfHingeLine2D,
    halfHinge2: HalfHingeLine2D
  ): void {
    const EPSILON = 1e-10;

    // Check hingeLineId matches
    if (halfHinge1.hingeLineId !== halfHinge2.hingeLineId) {
      throw new Error(
        `HingeLine.validateParametricConsistency: HalfHingeLine2D objects have different hingeLineIds ` +
        `(${halfHinge1.hingeLineId} vs ${halfHinge2.hingeLineId})`
      );
    }

    // Check reference points are identical: Q = Q'
    const pointDiff = halfHinge1.point.clone().sub(halfHinge2.point);
    const pointDistance = pointDiff.length();
    
    if (pointDistance > EPSILON) {
      throw new Error(
        `HingeLine.validateParametricConsistency: Reference points differ for ${halfHinge1.hingeLineId}\n` +
        `  Plane ${halfHinge1.planeId}: point = (${halfHinge1.point.x}, ${halfHinge1.point.y}, ${halfHinge1.point.z})\n` +
        `  Plane ${halfHinge2.planeId}: point = (${halfHinge2.point.x}, ${halfHinge2.point.y}, ${halfHinge2.point.z})\n` +
        `  Distance: ${pointDistance}\n` +
        `CRITICAL: Both HalfHingeLine2D must use identical reference point Q for coordinate cloning to work.`
      );
    }

    // Check direction vectors are identical: D = D'
    const directionDiff = halfHinge1.direction.clone().sub(halfHinge2.direction);
    const directionDistance = directionDiff.length();
    
    if (directionDistance > EPSILON) {
      throw new Error(
        `HingeLine.validateParametricConsistency: Direction vectors differ for ${halfHinge1.hingeLineId}\n` +
        `  Plane ${halfHinge1.planeId}: direction = (${halfHinge1.direction.x}, ${halfHinge1.direction.y}, ${halfHinge1.direction.z})\n` +
        `  Plane ${halfHinge2.planeId}: direction = (${halfHinge2.direction.x}, ${halfHinge2.direction.y}, ${halfHinge2.direction.z})\n` +
        `  Distance: ${directionDistance}\n` +
        `CRITICAL: Both HalfHingeLine2D must use identical direction vector D for coordinate cloning to work.`
      );
    }
  }
}

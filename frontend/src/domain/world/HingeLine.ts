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
 * Reference: specs/001-dihedral-learning-mvp/data-model.md §HingeLine
 */

import { Vector3, Vector4 } from 'three';
import { Line2D, Line2DRealization2D } from './Line';

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
  readonly type: 'half-hinge' = 'half-hinge';
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
   */
  realize2D(): Line2DRealization2D {
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
 */
export class HingeLine {
  readonly id: string;
  readonly name: string;
  readonly plane1Id: string;  // First projection plane
  readonly plane2Id: string;  // Second projection plane
  readonly line3D?: {         // 3D representation (for future 3D rendering)
    point: Vector4;           // Point on line in 3D space
    direction: Vector4;       // Direction vector in 3D space
  };

  constructor(
    id: string,
    name: string,
    plane1Id: string,
    plane2Id: string,
    line3D?: { point: Vector4; direction: Vector4 }
  ) {
    if (plane1Id === plane2Id) {
      throw new Error('HingeLine: plane1 and plane2 must be distinct');
    }

    this.id = id;
    this.name = name;
    this.plane1Id = plane1Id;
    this.plane2Id = plane2Id;
    this.line3D = line3D;
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
}

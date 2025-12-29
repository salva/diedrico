/**
 * Point - Geometric point in 2D or 3D space
 * 
 * Points are the fundamental building blocks of the dihedral system.
 * All points MUST be stored in plane intrinsic coordinates <u,v> as per Constitution Principle V.
 * 
 * Design principles:
 * - Principle V: Use homogeneous coordinates [x, y, 1] for all transformations
 * - Points can be Free (user-placed) or Derived (calculated from other elements)
 * 
 * @see specs/001-dihedral-learning-mvp/data-model.md#point2d
 */

export interface PointCoordinates {
  u: number;  // Plane intrinsic u-coordinate
  v: number;  // Plane intrinsic v-coordinate
}

export type PointType = 'free' | 'derived';

export class Point {
  id?: string;
  coordinates: PointCoordinates;
  type: PointType;
  label?: string;
  planeId?: string;  // Which projection plane this point belongs to

  constructor(
    u: number,
    v: number,
    type: PointType = 'free',
    label?: string,
    planeId?: string
  ) {
    this.coordinates = { u, v };
    this.type = type;
    this.label = label;
    this.planeId = planeId;
  }

  /**
   * Get homogeneous coordinate representation [u, v, 1]
   * Required by Constitution Principle V
   */
  getHomogeneousCoords(): [number, number, number] {
    return [this.coordinates.u, this.coordinates.v, 1];
  }

  /**
   * Update point coordinates
   */
  setCoordinates(u: number, v: number): void {
    this.coordinates.u = u;
    this.coordinates.v = v;
  }

  /**
   * Clone this point
   */
  clone(): Point {
    const cloned = new Point(
      this.coordinates.u,
      this.coordinates.v,
      this.type,
      this.label,
      this.planeId
    );
    if (this.id) {
      cloned.id = this.id;
    }
    return cloned;
  }
}

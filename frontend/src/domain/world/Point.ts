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

export type PointType = 'free' | 'derived';

export class Point {
  id?: string;
  coordinates: [number, number, number];  // Homogeneous coordinates [u, v, 1]
  type: PointType;
  label?: string;
  planeId?: string;  // Which projection plane this point belongs to
  locked?: boolean;  // If true, point cannot be moved or deleted

  constructor(
    coordinates: [number, number, number],  // Homogeneous [u, v, 1]
    type: PointType = 'free',
    plane?: { id?: string },
    label?: string
  ) {
    this.coordinates = coordinates;
    this.type = type;
    this.label = label;
    this.planeId = plane?.id;
    this.locked = false;
  }

  /**
   * Get homogeneous coordinate representation [u, v, 1]
   * Required by Constitution Principle V
   */
  getHomogeneousCoords(): [number, number, number] {
    return this.coordinates;
  }

  /**
   * Update point coordinates
   */
  setCoordinates(coords: [number, number, number]): void {
    this.coordinates = coords;
  }

  /**
   * Clone this point
   */
  clone(): Point {
    const cloned = new Point(
      [...this.coordinates] as [number, number, number],
      this.type,
      this.planeId ? { id: this.planeId } : undefined,
      this.label
    );
    if (this.id) {
      cloned.id = this.id;
    }
    if (this.locked !== undefined) {
      cloned.locked = this.locked;
    }
    return cloned;
  }

  /**
   * Getter for u coordinate (convenience accessor)
   */
  get u(): number {
    return this.coordinates[0];
  }

  /**
   * Getter for v coordinate (convenience accessor)
   */
  get v(): number {
    return this.coordinates[1];
  }
}

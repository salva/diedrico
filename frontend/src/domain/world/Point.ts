/**
 * Point - Geometric point in 2D or 3D space
 * 
 * Points are the fundamental building blocks of the dihedral system.
 * All points MUST be stored in plane intrinsic coordinates <u,v> as per Constitution Principle V.
 * 
 * Two types of 2D points:
 * - Free points: defined by their position inside the projection plane
 * - Intersection points: defined as intersection of two objects, with index for multiple intersections
 * 
 * Design principles:
 * - Principle V: Use homogeneous coordinates [x, y, 1] for all transformations
 * 
 * @see specs/001-dihedral-learning-mvp/data-model.md#point2d
 */

export type PointType = 'free' | 'intersection';

export interface IntersectionDefinition {
  element1Id: string;  // ID of first intersecting element
  element2Id: string;  // ID of second intersecting element
  index: number;       // Index to identify which intersection (0, 1, 2...) when multiple exist
}

export class Point {
  id?: string;
  coordinates: [number, number, number];  // Homogeneous coordinates [u, v, 1]
  type: PointType;
  label?: string;
  planeId?: string;  // Which projection plane this point belongs to
  locked?: boolean;  // If true, point cannot be moved or deleted
  
  // For intersection points only
  intersection?: IntersectionDefinition;

  constructor(
    coordinates: [number, number, number],  // Homogeneous [u, v, 1]
    type: PointType = 'free',
    plane?: { id?: string },
    label?: string,
    intersection?: IntersectionDefinition
  ) {
    this.coordinates = coordinates;
    this.type = type;
    this.label = label;
    this.planeId = plane?.id;
    this.locked = false;
    this.intersection = intersection;
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
      this.label,
      this.intersection ? { ...this.intersection } : undefined
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

  /**
   * Create an intersection point
   * Static factory method for creating points defined by intersection of two elements
   */
  static createIntersection(
    coordinates: [number, number, number],
    element1Id: string,
    element2Id: string,
    index: number,
    plane?: { id?: string },
    label?: string
  ): Point {
    return new Point(
      coordinates,
      'intersection',
      plane,
      label,
      { element1Id, element2Id, index }
    );
  }
}

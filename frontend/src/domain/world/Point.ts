/**
 * Point2D - Geometric point in 2D projection plane
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

/**
 * Base Point2D class with common fields for all point types
 */
export abstract class Point2D {
  id?: string;
  coordinates: [number, number, number];  // Homogeneous coordinates [u, v, 1]
  abstract readonly type: PointType;
  label?: string;
  planeId?: string;  // Which projection plane this point belongs to

  constructor(
    coordinates: [number, number, number],  // Homogeneous [u, v, 1]
    plane?: { id?: string },
    label?: string
  ) {
    this.coordinates = coordinates;
    this.label = label;
    this.planeId = plane?.id;
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
  abstract clone(): Point2D;

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

/**
 * Free Point2D - defined by its position inside the projection plane
 */
export class FreePoint2D extends Point2D {
  readonly type: 'free' = 'free';
  locked?: boolean;  // If true, point cannot be moved or deleted

  constructor(
    coordinates: [number, number, number],
    plane?: { id?: string },
    label?: string
  ) {
    super(coordinates, plane, label);
    this.locked = false;
  }

  clone(): FreePoint2D {
    const cloned = new FreePoint2D(
      [...this.coordinates] as [number, number, number],
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
}

/**
 * Intersection Point2D - defined as intersection of two objects
 */
export class IntersectionPoint2D extends Point2D {
  readonly type: 'intersection' = 'intersection';
  element1Id: string;  // ID of first intersecting element
  element2Id: string;  // ID of second intersecting element
  index: number;       // Index to identify which intersection (0, 1, 2...) when multiple exist

  constructor(
    coordinates: [number, number, number],
    element1Id: string,
    element2Id: string,
    index: number,
    plane?: { id?: string },
    label?: string
  ) {
    super(coordinates, plane, label);
    this.element1Id = element1Id;
    this.element2Id = element2Id;
    this.index = index;
  }

  clone(): IntersectionPoint2D {
    const cloned = new IntersectionPoint2D(
      [...this.coordinates] as [number, number, number],
      this.element1Id,
      this.element2Id,
      this.index,
      this.planeId ? { id: this.planeId } : undefined,
      this.label
    );
    if (this.id) {
      cloned.id = this.id;
    }
    return cloned;
  }
}

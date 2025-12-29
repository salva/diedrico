/**
 * Point2D - Geometric point in 2D projection plane
 * 
 * Points are the fundamental building blocks of the dihedral system.
 * This class represents the DEFINITION/RULE of a point, not its coordinates.
 * Actual coordinates are stored in Point2DRealization objects.
 * 
 * Two types of 2D points:
 * - Free points: defined by their position inside the projection plane
 * - Intersection points: defined as intersection of two objects, with index for multiple intersections
 * 
 * Design principles:
 * - Principle V: Coordinates computed and cached in realizations
 * 
 * @see specs/001-dihedral-learning-mvp/data-model.md#point2d
 */

export type PointType = 'free' | 'intersection';

/**
 * Point2DRealization - Stores computed coordinates for a Point2D
 * This is the cache of evaluated point positions.
 */
export class Point2DRealization {
  pointId: string;
  coordinates: [number, number, number];  // Homogeneous coordinates [u, v, 1]
  planeId?: string;

  constructor(
    pointId: string,
    coordinates: [number, number, number],
    planeId?: string
  ) {
    this.pointId = pointId;
    this.coordinates = coordinates;
    this.planeId = planeId;
  }

  /**
   * Get homogeneous coordinate representation [u, v, 1]
   */
  getHomogeneousCoords(): [number, number, number] {
    return this.coordinates;
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

/**
 * Base Point2D class - represents the rule/definition of a point
 */
export abstract class Point2D {
  id?: string;
  abstract readonly type: PointType;
  label?: string;
  planeId?: string;  // Which projection plane this point belongs to

  constructor(
    plane?: { id?: string },
    label?: string
  ) {
    this.label = label;
    this.planeId = plane?.id;
  }

  /**
   * Clone this point
   */
  abstract clone(): Point2D;
}

/**
 * Free Point2D - defined by its position inside the projection plane
 * The rule is: "user placed it at this position"
 */
export class FreePoint2D extends Point2D {
  readonly type: 'free' = 'free';
  position: [number, number, number];  // The defining position [u, v, 1]
  locked?: boolean;  // If true, point cannot be moved or deleted

  constructor(
    position: [number, number, number],
    plane?: { id?: string },
    label?: string
  ) {
    super(plane, label);
    this.position = position;
    this.locked = false;
  }

  clone(): FreePoint2D {
    const cloned = new FreePoint2D(
      [...this.position] as [number, number, number],
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
 * The rule is: "intersection of element1 and element2 at index"
 * Coordinates are computed and cached in Point2DRealization.
 */
export class IntersectionPoint2D extends Point2D {
  readonly type: 'intersection' = 'intersection';
  element1Id: string;  // ID of first intersecting element
  element2Id: string;  // ID of second intersecting element
  index: number;       // Index to identify which intersection (0, 1, 2...) when multiple exist

  constructor(
    element1Id: string,
    element2Id: string,
    index: number,
    plane?: { id?: string },
    label?: string
  ) {
    super(plane, label);
    this.element1Id = element1Id;
    this.element2Id = element2Id;
    this.index = index;
  }

  clone(): IntersectionPoint2D {
    const cloned = new IntersectionPoint2D(
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

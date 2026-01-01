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

import { Vector3, Vector4 } from 'three';
import type { Line2DRealization } from './Line';
import { intersectLineLine } from '../calculations/Intersections';

export type Point2DType = 'free' | 'intersection';

/**
 * Point2DRealization - Stores computed 2D position for a Point2D
 * Contains ONLY numeric data. Structural information (id, planeId) stays in domain objects.
 */
export class Point2DRealization {
  position: Vector3;  // Position in plane coordinates (u, v, 1) - ONLY NUMERIC DATA

  constructor(position: Vector3) {
    this.position = position;
  }

  /**
   * Get position as Vector3
   */
  getPosition(): Vector3 {
    return this.position;
  }
}

/**
 * Point3DRealization - Stores computed 3D position for a point
 * Reconstructed from 2D projections or defined directly in 3D space.
 * Contains ONLY numeric data. Structural information (id) stays in domain objects.
 */
export class Point3DRealization {
  position: Vector4;  // Position in 3D space (x, y, z, 1) - ONLY NUMERIC DATA

  constructor(position: Vector4) {
    this.position = position;
  }

  /**
   * Get position as Vector4
   */
  getPosition(): Vector4 {
    return this.position;
  }
}

/**
 * Base Point2D class - represents the rule/definition of a point
 */
export abstract class Point2D {
  id: string;  // Unique identifier (required)
  abstract readonly type: Point2DType;
  label?: string;
  planeId: string;  // Which projection plane this point belongs to

  constructor(
    id: string,
    planeId: string,
    label?: string
  ) {
    this.id = id;
    this.label = label;
    this.planeId = planeId;
  }

  /**
   * Clone this point
   */
  abstract clone(): Point2D;

  /**
   * Calculate the 2D realization (position) for this point
   * Returns position in the projection plane's intrinsic coordinates
   * 
   * @param getLine Optional callback to get line realizations (needed for intersection points)
   */
  abstract realize2D(getLine?: (id: string) => Line2DRealization | null): Point2DRealization;
}

/**
 * Free Point2D - defined by its position inside the projection plane
 * The rule is: "user placed it at this position"
 */
export class FreePoint2D extends Point2D {
  readonly type: 'free' = 'free';
  readonly position: Vector3;  // The defining position in plane coordinates (u, v, 1) - IMMUTABLE RULE
  locked?: boolean;  // If true, point cannot be moved or deleted

  constructor(
    id: string,
    position: Vector3,
    planeId: string,
    label?: string
  ) {
    super(id, planeId, label);
    this.position = position;
    this.locked = false;
  }

  clone(): FreePoint2D {
    const cloned = new FreePoint2D(
      this.id,
      this.position.clone(),
      this.planeId,
      this.label
    );
    if (this.locked !== undefined) {
      cloned.locked = this.locked;
    }
    return cloned;
  }

  /**
   * Calculate 2D realization - for free points, just return the stored position
   */
  realize2D(): Point2DRealization {
    return new Point2DRealization(this.position);
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
    id: string,
    element1Id: string,
    element2Id: string,
    index: number,
    planeId: string,
    label?: string
  ) {
    super(id, planeId, label);
    this.element1Id = element1Id;
    this.element2Id = element2Id;
    this.index = index;
  }

  clone(): IntersectionPoint2D {
    const cloned = new IntersectionPoint2D(
      this.id,
      this.element1Id,
      this.element2Id,
      this.index,
      this.planeId,
      this.label
    );
    return cloned;
  }

  /**
   * Calculate 2D realization - compute intersection of two geometric objects
   * Intersection is calculated in the plane's intrinsic coordinate system
   * 
   * Currently supports:
   * - Line-Line intersection (index must be 0, as there's only one intersection point)
   * 
   * @param getLine Callback to get line realizations
   * @returns Point2DRealization with intersection point, or origin if computation fails
   */
  realize2D(getLine?: (id: string) => Line2DRealization | null): Point2DRealization {
    // Validate getLine callback
    if (!getLine) {
      console.warn('[IntersectionPoint2D] realize2D called without getLine callback');
      return new Point2DRealization(new Vector3(0, 0, 1));
    }
    
    // Get realizations of both elements
    const line1 = getLine(this.element1Id);
    const line2 = getLine(this.element2Id);
    
    if (!line1 || !line2) {
      console.warn(
        '[IntersectionPoint2D] Cannot compute intersection: missing line realization',
        { element1Id: this.element1Id, element2Id: this.element2Id, line1, line2 }
      );
      return new Point2DRealization(new Vector3(0, 0, 1));
    }
    
    // Compute line-line intersection using homogeneous coordinates
    const result = intersectLineLine(line1, line2);
    
    if (result.type !== 'point' || !result.point) {
      console.warn(
        '[IntersectionPoint2D] Lines do not intersect:',
        result.type,
        result.message
      );
      // Return origin as fallback (infeasible construction)
      return new Point2DRealization(new Vector3(0, 0, 1));
    }
    
    // Return the intersection point
    return new Point2DRealization(result.point);
  }
}

/**
 * Point2D - Geometric point in 2D projection plane
 * 
 * Points are the fundamental building blocks of the dihedral system.
 * This class represents the DEFINITION/RULE of a point, not its coordinates.
 * Actual coordinates are stored in Point2DRealization2D objects.
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
import { applyMatrix3x4 } from '@/utils/threeUtils';
import type { Line2DRealization2D } from './Line';
import type { World } from './World';
import { intersectLineLine } from '../calculations/Intersections';

export type Point2DType = 'free' | 'intersection' | 'sibling-intersection';

/**
 * Point2DRealization2D - Stores computed 2D position for a Point2D
 * Contains ONLY numeric data. Structural information (id, planeId) stays in domain objects.
 */
export class Point2DRealization2D {
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
 * Point3DRealization3D - Stores computed 3D position for a point
 * Reconstructed from 2D projections or defined directly in 3D space.
 * Contains ONLY numeric data. Structural information (id) stays in domain objects.
 */
export class Point3DRealization3D {
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
   * @param world Optional World instance (needed for sibling intersection points)
   */
  abstract realize2D(getLine?: (id: string) => Line2DRealization2D | null, world?: World): Point2DRealization2D;
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
  realize2D(getLine?: (id: string) => Line2DRealization2D | null, world?: World): Point2DRealization2D {
    return new Point2DRealization2D(this.position);
  }
}

/**
 * Intersection Point2D - defined as intersection of two objects
 * The rule is: "intersection of element1 and element2 at index"
 * Coordinates are computed and cached in Point2DRealization2D.
 * 
 * When intersecting with HalfHingeLine2D, a sibling point is automatically
 * created on the paired plane to maintain geometric consistency.
 */
export class IntersectionPoint2D extends Point2D {
  readonly type: 'intersection' = 'intersection';
  element1Id: string;  // ID of first intersecting element
  element2Id: string;  // ID of second intersecting element
  index: number;       // Index to identify which intersection (0, 1, 2...) when multiple exist
  siblingPointId?: string;  // Optional: ID of sibling point on paired plane (populated when intersecting with HalfHingeLine2D)

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
   * @param world Optional World instance (not used by IntersectionPoint2D)
   * @returns Point2DRealization2D with intersection point, or origin if computation fails
   */
  realize2D(getLine?: (id: string) => Line2DRealization2D | null, world?: World): Point2DRealization2D {
    // Validate getLine callback
    if (!getLine) {
      console.warn('[IntersectionPoint2D] realize2D called without getLine callback');
      return new Point2DRealization2D(new Vector3(0, 0, 1));
    }
    
    // Get realizations of both elements
    const line1 = getLine(this.element1Id);
    const line2 = getLine(this.element2Id);
    
    if (!line1 || !line2) {
      console.warn(
        '[IntersectionPoint2D] Cannot compute intersection: missing line realization',
        { element1Id: this.element1Id, element2Id: this.element2Id, line1, line2 }
      );
      return new Point2DRealization2D(new Vector3(0, 0, 1));
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
      return new Point2DRealization2D(new Vector3(0, 0, 1));
    }
    
    // Return the intersection point
    return new Point2DRealization2D(result.point);
  }
}

/**
 * Sibling Intersection Point2D - automatically created when intersecting with HalfHingeLine2D
 * The rule is: "projection of primary intersection's 3D position onto sibling plane"
 * 
 * This represents the projection of a 3D intersection point onto the paired plane.
 * When a user intersects an element with a HalfHingeLine2D on one plane, the system
 * automatically creates this sibling point on the other plane to show the complete
 * geometric relationship.
 * 
 * Realization algorithm:
 * 1. Get primary intersection point's 2D realization
 * 2. Reconstruct 3D position from primary's plane projection
 * 3. Project that 3D position onto this sibling's plane
 * 4. Return the resulting 2D position
 */
export class SiblingIntersectionPoint2D extends Point2D {
  readonly type: 'sibling-intersection' = 'sibling-intersection';
  primaryIntersectionId: string;  // ID of the primary intersection point this sibling derives from

  constructor(
    id: string,
    primaryIntersectionId: string,
    planeId: string,
    label?: string
  ) {
    super(id, planeId, label);
    this.primaryIntersectionId = primaryIntersectionId;
  }

  clone(): SiblingIntersectionPoint2D {
    return new SiblingIntersectionPoint2D(
      this.id,
      this.primaryIntersectionId,
      this.planeId,
      this.label
    );
  }

  /**
   * Calculate 2D realization - project primary's 3D position onto sibling plane
   * 
   * @param getLine Optional callback to get line realizations (not used directly but part of interface)
   * @param world Required: World instance to access primary point and compute 3D position
   * @returns Point2DRealization2D with projected position
   */
  realize2D(getLine?: (id: string) => Line2DRealization2D | null, world?: World): Point2DRealization2D {
    if (!world) {
      console.warn('[SiblingIntersectionPoint2D] realize2D called without world context');
      return new Point2DRealization2D(new Vector3(0, 0, 1));
    }

    // Get primary intersection point
    const primary = world.getPoint2DById(this.primaryIntersectionId);
    if (!primary) {
      console.warn(`[SiblingIntersectionPoint2D] Primary point ${this.primaryIntersectionId} not found`);
      return new Point2DRealization2D(new Vector3(0, 0, 1));
    }

    // Get primary's 3D position
    const primary3D = world.getPoint3DRealization(this.primaryIntersectionId);
    if (!primary3D) {
      console.warn(`[SiblingIntersectionPoint2D] Cannot compute 3D position for primary ${this.primaryIntersectionId}`);
      return new Point2DRealization2D(new Vector3(0, 0, 1));
    }

    // Get sibling plane realization for 3D projection
    const siblingPlaneRealization = world.getProjectionPlane3DRealization(this.planeId);
    if (!siblingPlaneRealization) {
      console.warn(`[SiblingIntersectionPoint2D] Sibling plane realization ${this.planeId} not found`);
      return new Point2DRealization2D(new Vector3(0, 0, 1));
    }

    // Project 3D point onto sibling plane using 3D→2D transformation
    // threeDToPlane is a Matrix3x4 that transforms (x,y,z,w) → (u,v,1)
    const uvw = applyMatrix3x4(primary3D.position, siblingPlaneRealization.threeDToPlane);
    
    return new Point2DRealization2D(new Vector3(uvw.x, uvw.y, uvw.z));
  }
}

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
import type { World } from './World';
import { intersectLineLine, intersectLineCircle, intersectCircleCircle } from '../calculations/Intersections';

export type Point2DType = 'free' | 'intersection' | 'sibling-intersection';

/**
 * Point2DRealization2D - Stores computed 2D position for a Point2D
 * Contains ONLY numeric data. Structural information (id, planeId) stays in domain objects.
 */
export class Point2DRealization2D {
  position: Vector3;  // Position in plane coordinates (u, v, 1) - ONLY NUMERIC DATA
  feasible: boolean;  // Whether the geometric computation succeeded

  constructor(position: Vector3, feasible: boolean = true) {
    this.position = position;
    this.feasible = feasible;
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
  feasible: boolean;  // Whether the geometric computation succeeded

  constructor(position: Vector4, feasible: boolean = true) {
    this.position = position;
    this.feasible = feasible;
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
  visible: boolean = true;  // Whether point is visible in the canvas

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
   * @param world World instance to query parent realizations
   */
  abstract realize2D(world: World): Point2DRealization2D;
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
  realize2D(_world: World): Point2DRealization2D {
    return new Point2DRealization2D(this.position, true);
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
   * Supports:
   * - Line-Line intersection (index must be 0, as there's only one intersection point)
   * - Line-Circle intersection (index 0 or 1 for two possible intersection points)
   * - Circle-Circle intersection (index 0 or 1 for two possible intersection points)
   * 
   * @param world World instance to query parent realizations
   * @returns Point2DRealization2D with intersection point, or infeasible if computation fails
   */
  realize2D(world: World): Point2DRealization2D {
    // Try to get elements as lines (check both lines and guides collections)
    // Guides extend Line2DRealization2D, so they can be used as lines
    const line1 = world.getLine2DRealization(this.element1Id) || world.getGuide2DRealization(this.element1Id);
    const line2 = world.getLine2DRealization(this.element2Id) || world.getGuide2DRealization(this.element2Id);
    
    // Try to get elements as circles
    const circle1 = world.getCircle2DRealization(this.element1Id);
    const circle2 = world.getCircle2DRealization(this.element2Id);
    
    // Check if parent elements are infeasible - propagate infeasibility
    if ((line1 && !line1.feasible) || (line2 && !line2.feasible) || 
        (circle1 && !circle1.feasible) || (circle2 && !circle2.feasible)) {
      console.warn('[IntersectionPoint2D] Parent element is infeasible, marking this as infeasible');
      return new Point2DRealization2D(new Vector3(0, 0, 1), false);
    }
    
    // Determine intersection type and compute
    if (line1 && line2) {
      // Line-Line intersection
      const result = intersectLineLine(line1, line2);
      
      if (result.type !== 'point' || !result.point) {
        console.warn('[IntersectionPoint2D] Lines do not intersect (parallel or coincident):', result.type, result.message);
        return new Point2DRealization2D(new Vector3(0, 0, 1), false);
      }
      
      return new Point2DRealization2D(result.point, true);
      
    } else if (line1 && circle2) {
      // Line-Circle intersection
      const result = intersectLineCircle(line1, circle2);
      
      if (result.points.length === 0) {
        console.warn('[IntersectionPoint2D] Line and circle do not intersect');
        return new Point2DRealization2D(new Vector3(0, 0, 1), false);
      }
      
      // Return the point at the specified index
      const point = result.points[Math.min(this.index, result.points.length - 1)];
      return new Point2DRealization2D(point, true);
      
    } else if (circle1 && line2) {
      // Circle-Line intersection (same as Line-Circle)
      const result = intersectLineCircle(line2, circle1);
      
      if (result.points.length === 0) {
        console.warn('[IntersectionPoint2D] Circle and line do not intersect');
        return new Point2DRealization2D(new Vector3(0, 0, 1), false);
      }
      
      const point = result.points[Math.min(this.index, result.points.length - 1)];
      return new Point2DRealization2D(point, true);
      
    } else if (circle1 && circle2) {
      // Circle-Circle intersection
      const result = intersectCircleCircle(circle1, circle2);
      
      if (result.points.length === 0) {
        console.warn('[IntersectionPoint2D] Circles do not intersect:', result.type);
        return new Point2DRealization2D(new Vector3(0, 0, 1), false);
      }
      
      const point = result.points[Math.min(this.index, result.points.length - 1)];
      return new Point2DRealization2D(point, true);
      
    } else {
      console.warn(
        '[IntersectionPoint2D] Cannot compute intersection: unsupported element combination or missing realizations',
        { element1Id: this.element1Id, element2Id: this.element2Id, line1, line2, circle1, circle2 }
      );
      return new Point2DRealization2D(new Vector3(0, 0, 1), false);
    }
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
   * OPTIMIZATION: For intersections with HalfHingeLine2D, the sibling point coordinates
   * are identical to the primary's coordinates. This is because both HalfHingeLine2D
   * objects (on P_H and P_V) represent the same 3D hinge line with consistent 2D
   * representations: both at v=0, parallel to X-axis. A point at (u, 0, 1) on the
   * HalfHingeLine2D in P_H maps to the same (u, 0, 1) in P_V.
   * 
   * @param world World instance to access primary point realization
   * @returns Point2DRealization2D with same coordinates as primary
   */
  realize2D(world: World): Point2DRealization2D {
    // Get primary intersection point's 2D realization
    const primaryRealization = world.getPoint2DRealization(this.primaryIntersectionId);
    if (!primaryRealization) {
      console.warn(`[SiblingIntersectionPoint2D] Cannot get realization for primary ${this.primaryIntersectionId}`);
      return new Point2DRealization2D(new Vector3(0, 0, 1), false);
    }
    
    // Propagate infeasibility from primary
    if (!primaryRealization.feasible) {
      console.warn('[SiblingIntersectionPoint2D] Primary point is infeasible, marking sibling as infeasible');
      return new Point2DRealization2D(new Vector3(0, 0, 1), false);
    }

    // For HalfHingeLine2D intersections: both planes use the same coordinate representation
    // Point at (u, 0, 1) on hinge line in P_H → same (u, 0, 1) on hinge line in P_V
    // This works because HalfHingeLine2D on both planes have:
    //   - Same point: (0, 0, 1)
    //   - Same direction: (1, 0, 0)
    // They represent the same 3D hinge line with consistent 2D parameterization
    return new Point2DRealization2D(primaryRealization.position.clone());
  }
}

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
import { intersectLineLine, intersectLineCircle, intersectCircleCircle } from '@/domain/calculations/Intersections';

export type Point2DType = 
  | 'free' 
  | 'intersection'  // Kept temporarily for backward compatibility
  | 'line-line-intersection'
  | 'line-circle-intersection'
  | 'circle-circle-intersection'
  | 'sibling-intersection';

/**
 * Point2DRealization2D - Stores computed 2D position for a Point2D
 * 
 * @sealed - This class must not be subclassed
 * 
 * Architectural principle: Realization classes contain ONLY geometric data.
 * All behavioral differences belong in domain classes (FreePoint2D, Point2DLineLineIntersection,
 * etc.), not in realization classes. Type distinction happens at domain level, not realization level.
 * 
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
 * Intersection Point2D - Abstract base class for all intersection point types
 * 
 * The rule is: "intersection of two geometric elements"
 * Coordinates are computed and cached in Point2DRealization2D.
 * 
 * Concrete subclasses:
 * - Point2DLineLineIntersection: intersection of two lines
 * - Point2DLineCircleIntersection: intersection of a line and a circle
 * - Point2DCircleCircleIntersection: intersection of two circles
 * 
 * When intersecting with HalfHingeLine2D, a sibling point is automatically
 * created on the paired plane to maintain geometric consistency.
 */
export abstract class IntersectionPoint2D extends Point2D {
  siblingPointId?: string;  // Optional: ID of sibling point on paired plane (populated when intersecting with HalfHingeLine2D)

  constructor(
    id: string,
    planeId: string,
    label?: string
  ) {
    super(id, planeId, label);
  }

  /**
   * Calculate 2D realization - compute intersection of two geometric objects
   * Intersection is calculated in the plane's intrinsic coordinate system
   * 
   * @param world World instance to query parent realizations
   * @returns Point2DRealization2D with intersection point, or infeasible if computation fails
   */
  abstract realize2D(world: World): Point2DRealization2D;
}

/**
 * Line-Line Intersection Point2D - intersection of two lines
 * 
 * The rule is: "intersection of line1 and line2"
 * Line-line intersection produces at most one point (or none if parallel/coincident).
 */
export class Point2DLineLineIntersection extends IntersectionPoint2D {
  readonly type: 'line-line-intersection' = 'line-line-intersection';
  line1Id: string;  // ID of first line
  line2Id: string;  // ID of second line

  constructor(
    id: string,
    line1Id: string,
    line2Id: string,
    planeId: string,
    label?: string
  ) {
    super(id, planeId, label);
    this.line1Id = line1Id;
    this.line2Id = line2Id;
  }

  clone(): Point2DLineLineIntersection {
    const cloned = new Point2DLineLineIntersection(
      this.id,
      this.line1Id,
      this.line2Id,
      this.planeId,
      this.label
    );
    if (this.siblingPointId) {
      cloned.siblingPointId = this.siblingPointId;
    }
    return cloned;
  }

  /**
   * Calculate 2D realization - compute intersection of two lines
   * 
   * @param world World instance to query parent realizations
   * @returns Point2DRealization2D with intersection point, or infeasible if lines are parallel/coincident
   */
  realize2D(world: World): Point2DRealization2D {
    const line1 = world.getLine2DRealization(this.line1Id);
    const line2 = world.getLine2DRealization(this.line2Id);
    
    // Check if parent elements are infeasible - propagate infeasibility
    if ((line1 && !line1.feasible) || (line2 && !line2.feasible)) {
      console.warn('[Point2DLineLineIntersection] Parent element is infeasible, marking this as infeasible');
      return new Point2DRealization2D(new Vector3(0, 0, 1), false);
    }
    
    if (!line1 || !line2) {
      console.warn('[Point2DLineLineIntersection] Cannot get line realizations');
      return new Point2DRealization2D(new Vector3(0, 0, 1), false);
    }
    
    const result = intersectLineLine(line1, line2);
    
    if (result.type !== 'point' || !result.point) {
      console.warn('[Point2DLineLineIntersection] Lines do not intersect (parallel or coincident):', result.type, result.message);
      return new Point2DRealization2D(new Vector3(0, 0, 1), false);
    }
    
    return new Point2DRealization2D(result.point, true);
  }
}

/**
 * Line-Circle Intersection Point2D - intersection of a line and a circle
 * 
 * The rule is: "intersection of line and circle at index"
 * Line-circle intersection produces 0, 1 (tangent), or 2 points.
 * Points are indexed by angle from the circle's radius vector.
 */
export class Point2DLineCircleIntersection extends IntersectionPoint2D {
  readonly type: 'line-circle-intersection' = 'line-circle-intersection';
  lineId: string;    // ID of the line
  circleId: string;  // ID of the circle
  index: number;     // Index to identify which intersection (0 or 1)

  constructor(
    id: string,
    lineId: string,
    circleId: string,
    index: number,
    planeId: string,
    label?: string
  ) {
    super(id, planeId, label);
    this.lineId = lineId;
    this.circleId = circleId;
    this.index = index;
  }

  clone(): Point2DLineCircleIntersection {
    const cloned = new Point2DLineCircleIntersection(
      this.id,
      this.lineId,
      this.circleId,
      this.index,
      this.planeId,
      this.label
    );
    if (this.siblingPointId) {
      cloned.siblingPointId = this.siblingPointId;
    }
    return cloned;
  }

  /**
   * Calculate 2D realization - compute intersection of line and circle
   * 
   * @param world World instance to query parent realizations
   * @returns Point2DRealization2D with intersection point at specified index, or infeasible if no intersection
   */
  realize2D(world: World): Point2DRealization2D {
    const line = world.getLine2DRealization(this.lineId);
    const circle = world.getCircle2DRealization(this.circleId);
    
    // Check if parent elements are infeasible - propagate infeasibility
    if ((line && !line.feasible) || (circle && !circle.feasible)) {
      console.warn('[Point2DLineCircleIntersection] Parent element is infeasible, marking this as infeasible');
      return new Point2DRealization2D(new Vector3(0, 0, 1), false);
    }
    
    if (!line || !circle) {
      console.warn('[Point2DLineCircleIntersection] Cannot get line or circle realization');
      return new Point2DRealization2D(new Vector3(0, 0, 1), false);
    }
    
    const result = intersectLineCircle(line, circle);
    
    if (result.points.length === 0) {
      console.warn('[Point2DLineCircleIntersection] Line and circle do not intersect');
      return new Point2DRealization2D(new Vector3(0, 0, 1), false);
    }
    
    // Return the point at the specified index
    const point = result.points[Math.min(this.index, result.points.length - 1)];
    return new Point2DRealization2D(point, true);
  }
}

/**
 * Circle-Circle Intersection Point2D - intersection of two circles
 * 
 * The rule is: "intersection of circle1 and circle2 at index"
 * Circle-circle intersection produces 0, 1 (tangent), or 2 points.
 * Points are indexed by angle from the first circle's radius vector.
 */
export class Point2DCircleCircleIntersection extends IntersectionPoint2D {
  readonly type: 'circle-circle-intersection' = 'circle-circle-intersection';
  circle1Id: string;  // ID of first circle
  circle2Id: string;  // ID of second circle
  index: number;      // Index to identify which intersection (0 or 1)

  constructor(
    id: string,
    circle1Id: string,
    circle2Id: string,
    index: number,
    planeId: string,
    label?: string
  ) {
    super(id, planeId, label);
    this.circle1Id = circle1Id;
    this.circle2Id = circle2Id;
    this.index = index;
  }

  clone(): Point2DCircleCircleIntersection {
    const cloned = new Point2DCircleCircleIntersection(
      this.id,
      this.circle1Id,
      this.circle2Id,
      this.index,
      this.planeId,
      this.label
    );
    if (this.siblingPointId) {
      cloned.siblingPointId = this.siblingPointId;
    }
    return cloned;
  }

  /**
   * Calculate 2D realization - compute intersection of two circles
   * 
   * @param world World instance to query parent realizations
   * @returns Point2DRealization2D with intersection point at specified index, or infeasible if no intersection
   */
  realize2D(world: World): Point2DRealization2D {
    const circle1 = world.getCircle2DRealization(this.circle1Id);
    const circle2 = world.getCircle2DRealization(this.circle2Id);
    
    // Check if parent elements are infeasible - propagate infeasibility
    if ((circle1 && !circle1.feasible) || (circle2 && !circle2.feasible)) {
      console.warn('[Point2DCircleCircleIntersection] Parent element is infeasible, marking this as infeasible');
      return new Point2DRealization2D(new Vector3(0, 0, 1), false);
    }
    
    if (!circle1 || !circle2) {
      console.warn('[Point2DCircleCircleIntersection] Cannot get circle realizations');
      return new Point2DRealization2D(new Vector3(0, 0, 1), false);
    }
    
    const result = intersectCircleCircle(circle1, circle2);
    
    if (result.points.length === 0) {
      console.warn('[Point2DCircleCircleIntersection] Circles do not intersect:', result.type);
      return new Point2DRealization2D(new Vector3(0, 0, 1), false);
    }
    
    const point = result.points[Math.min(this.index, result.points.length - 1)];
    return new Point2DRealization2D(point, true);
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

// Type guards for Point2D types
export function isFreePoint2D(point: Point2D): point is FreePoint2D {
  return point.type === 'free';
}

export function isLineLineIntersection(point: Point2D): point is Point2DLineLineIntersection {
  return point.type === 'line-line-intersection';
}

export function isLineCircleIntersection(point: Point2D): point is Point2DLineCircleIntersection {
  return point.type === 'line-circle-intersection';
}

export function isCircleCircleIntersection(point: Point2D): point is Point2DCircleCircleIntersection {
  return point.type === 'circle-circle-intersection';
}

export function isIntersectionPoint2D(point: Point2D): point is IntersectionPoint2D {
  return point instanceof IntersectionPoint2D;
}

export function isSiblingIntersectionPoint2D(point: Point2D): point is SiblingIntersectionPoint2D {
  return point.type === 'sibling-intersection';
}

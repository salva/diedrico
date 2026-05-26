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
 */

import { Vector3, Vector4 } from 'three';
import type { ProjectionElementRealizationContext } from './projectionPlane/ProjectionPlaneContext';
import { intersectLineLine, intersectLineCircle, intersectCircleCircle } from '@/domain/calculations/Intersections';
import { Element2DRealization2D } from './Element2DRealization2D';
import { Element2D } from './Element2D';
import { BrokenHalfHingeLine2D } from './elements/BrokenHalfHingeLine2D';
import { applyMatrix4x3, applyMatrix3x4 } from '@/utils/threeUtils';
import { assert } from '@/utils/assert';

export const POINT_2D_TYPE = {
  FREE: 'free',
  INTERSECTION: 'intersection',  // Kept temporarily for backward compatibility
  LINE_LINE_INTERSECTION: 'line-line-intersection',
  LINE_CIRCLE_INTERSECTION: 'line-circle-intersection',
  CIRCLE_CIRCLE_INTERSECTION: 'circle-circle-intersection',
  SIBLING_INTERSECTION: 'sibling-intersection',
} as const;
export type Point2DType = typeof POINT_2D_TYPE[keyof typeof POINT_2D_TYPE];

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
export class Point2DRealization2D extends Element2DRealization2D {
  position: Vector3;  // Position in plane coordinates (u, v, 1) - ONLY NUMERIC DATA

  constructor(position: Vector3, feasible: boolean = true) {
    super(feasible);
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
 * Extends Element2D to provide common properties and interface for all 2D elements
 */
export abstract class Point2D extends Element2D {
  constructor(
    id: string,
    planeId: string,
    label?: string
  ) {
    super(id, planeId, label);
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
  abstract realize2D(world: ProjectionElementRealizationContext): Point2DRealization2D;
}

/**
 * Free Point2D - defined by its position inside the projection plane
 * The rule is: "user placed it at this position"
 */
export class FreePoint2D extends Point2D {
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
  realize2D(_world: ProjectionElementRealizationContext): Point2DRealization2D {
    return new Point2DRealization2D(this.position, true);
  }

  getDependencies(): string[] {
    return [];
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
  abstract realize2D(world: ProjectionElementRealizationContext): Point2DRealization2D;
}

/**
 * Line-Line Intersection Point2D - intersection of two lines
 * 
 * The rule is: "intersection of line1 and line2"
 * Line-line intersection produces at most one point (or none if parallel/coincident).
 */
export class Point2DLineLineIntersection extends IntersectionPoint2D {
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

  getDependencies(): string[] {
    return [this.line1Id, this.line2Id];
  }

  /**
   * Calculate 2D realization - compute intersection of two lines
   * 
   * @param world World instance to query parent realizations
   * @returns Point2DRealization2D with intersection point, or infeasible if lines are parallel/coincident or intersection falls outside segment bounds
   */
  realize2D(world: ProjectionElementRealizationContext): Point2DRealization2D {
    const plane = world.getProjectionPlaneById(this.planeId);
    assert(plane, `[Point2DLineLineIntersection] plane ${this.planeId} not found for point ${this.id}`);
    const l1 = plane.getLine(this.line1Id);
    const l2 = plane.getLine(this.line2Id);
    
    assert(l1, `[Point2DLineLineIntersection] line1 ${this.line1Id} not found on plane ${this.planeId} for point ${this.id}`);
    assert(l2, `[Point2DLineLineIntersection] line2 ${this.line2Id} not found on plane ${this.planeId} for point ${this.id}`);
    
    const line1 = l1.realize2D(world);
    const line2 = l2.realize2D(world);
    
    assert(line1, `[Point2DLineLineIntersection] line1.realize2D() returned null for ${this.line1Id}`);
    assert(line2, `[Point2DLineLineIntersection] line2.realize2D() returned null for ${this.line2Id}`);
    
    // Check if parent elements are infeasible - propagate infeasibility
    if (!line1.feasible || !line2.feasible) {
      console.warn('[Point2DLineLineIntersection] Parent element is infeasible, marking this as infeasible');
      return new Point2DRealization2D(new Vector3(0, 0, 1), false);
    }
    
    const intersectionPointReal = intersectLineLine(line1, line2);
    
    if (!intersectionPointReal.feasible) {
      console.warn('[Point2DLineLineIntersection] Lines do not intersect (parallel or coincident)');
      return new Point2DRealization2D(new Vector3(0, 0, 1), false);
    }
    
    const intersectionPoint = intersectionPointReal.position;
    
    // Get the domain objects to check if they're segments
    const line1Domain = world.getLine2D(this.line1Id);
    const line2Domain = world.getLine2D(this.line2Id);
    
    // Check if intersection falls within segment bounds
    // A segment has point1.z=1 and point2.z=1 (finite endpoints)
    // An infinite line has point2.z=0 (direction vector)
    
    // Check line1 if it's a segment
    if (line1Domain && line1Domain.isBounded() && line1.point2.z === 1) {
      // Segment: check if intersection is between point1 and point2
      if (!this.isPointOnSegment(intersectionPoint, line1)) {
        console.warn('[Point2DLineLineIntersection] Intersection falls outside segment bounds (line1)');
        return new Point2DRealization2D(intersectionPoint, false);
      }
    }
    
    // Check line2 if it's a segment
    if (line2Domain && line2Domain.isBounded() && line2.point2.z === 1) {
      // Segment: check if intersection is between point1 and point2
      if (!this.isPointOnSegment(intersectionPoint, line2)) {
        console.warn('[Point2DLineLineIntersection] Intersection falls outside segment bounds (line2)');
        return new Point2DRealization2D(intersectionPoint, false);
      }
    }
    
    return new Point2DRealization2D(intersectionPoint, true);
  }
  
  /**
   * Check if a point lies on a segment (between its endpoints)
   * 
   * @param point The point to check
   * @param segment The segment realization (with point1 and point2 as endpoints, z=1)
   * @returns true if point is on segment, false otherwise
   */
  private isPointOnSegment(point: Vector3, segment: import('./Line').Line2DRealization2D): boolean {
    // For a segment, point2.z should be 1 (not a direction vector)
    if (segment.point2.z !== 1) {
      return true; // Not a segment, it's an infinite line
    }
    
    // Get the direction from point1 to point2
    const segmentVector = segment.point2.clone().sub(segment.point1);
    const pointVector = point.clone().sub(segment.point1);
    
    // Project pointVector onto segmentVector
    const segmentLengthSq = segmentVector.lengthSq();
    if (segmentLengthSq === 0) {
      // Degenerate segment (point1 == point2)
      return point.distanceTo(segment.point1) < 0.0001;
    }
    
    const t = pointVector.dot(segmentVector) / segmentLengthSq;
    
    // t should be between 0 and 1 for the point to be on the segment
    // Use small epsilon for numerical tolerance
    const epsilon = 0.0001;
    return t >= -epsilon && t <= 1 + epsilon;
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

  getDependencies(): string[] {
    return [this.lineId, this.circleId];
  }

  /**
   * Calculate 2D realization - compute intersection of line and circle
   * 
   * @param world World instance to query parent realizations
   * @returns Point2DRealization2D with intersection point at specified index, or infeasible if no intersection or intersection falls outside segment bounds
   */
  realize2D(world: ProjectionElementRealizationContext): Point2DRealization2D {
    const plane = world.getProjectionPlaneById(this.planeId);
    assert(plane, `[Point2DLineCircleIntersection] plane ${this.planeId} not found for point ${this.id}`);
    const l = plane.getLine(this.lineId);
    const c = plane.getCircle(this.circleId);
    
    assert(l, `[Point2DLineCircleIntersection] line ${this.lineId} not found on plane ${this.planeId} for point ${this.id}`);
    assert(c, `[Point2DLineCircleIntersection] circle ${this.circleId} not found on plane ${this.planeId} for point ${this.id}`);
    
    const line = l.realize2D(world);
    const circle = c.realize2D(world);
    
    assert(line, `[Point2DLineCircleIntersection] line.realize2D() returned null for ${this.lineId}`);
    assert(circle, `[Point2DLineCircleIntersection] circle.realize2D() returned null for ${this.circleId}`);
    
    // Check if parent elements are infeasible - propagate infeasibility
    if (!line.feasible || !circle.feasible) {
      console.warn('[Point2DLineCircleIntersection] Parent element is infeasible, marking this as infeasible');
      return new Point2DRealization2D(new Vector3(0, 0, 1), false);
    }
    
    const intersectionPoints = intersectLineCircle(line, circle);
    
    if (intersectionPoints.length === 0) {
      console.warn('[Point2DLineCircleIntersection] Line and circle do not intersect');
      return new Point2DRealization2D(new Vector3(0, 0, 1), false);
    }
    
    // Return the point at the specified index
    const point = intersectionPoints[Math.min(this.index, intersectionPoints.length - 1)];
    
    // Check if the line is actually a segment and if intersection is within bounds
    const lineDomain = world.getLine2D(this.lineId);
    if (lineDomain && lineDomain.isBounded() && line.point2.z === 1) {
      // Segment: check if intersection is between point1 and point2
      if (!this.isPointOnSegment(point, line)) {
        console.warn('[Point2DLineCircleIntersection] Intersection falls outside segment bounds');
        return new Point2DRealization2D(point, false);
      }
    }
    
    return new Point2DRealization2D(point, true);
  }
  
  /**
   * Check if a point lies on a segment (between its endpoints)
   * 
   * @param point The point to check
   * @param segment The segment realization (with point1 and point2 as endpoints, z=1)
   * @returns true if point is on segment, false otherwise
   */
  private isPointOnSegment(point: Vector3, segment: import('./Line').Line2DRealization2D): boolean {
    // For a segment, point2.z should be 1 (not a direction vector)
    if (segment.point2.z !== 1) {
      return true; // Not a segment, it's an infinite line
    }
    
    // Get the direction from point1 to point2
    const segmentVector = segment.point2.clone().sub(segment.point1);
    const pointVector = point.clone().sub(segment.point1);
    
    // Project pointVector onto segmentVector
    const segmentLengthSq = segmentVector.lengthSq();
    if (segmentLengthSq === 0) {
      // Degenerate segment (point1 == point2)
      return point.distanceTo(segment.point1) < 0.0001;
    }
    
    const t = pointVector.dot(segmentVector) / segmentLengthSq;
    
    // t should be between 0 and 1 for the point to be on the segment
    // Use small epsilon for numerical tolerance
    const epsilon = 0.0001;
    return t >= -epsilon && t <= 1 + epsilon;
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

  getDependencies(): string[] {
    return [this.circle1Id, this.circle2Id];
  }

  /**
   * Calculate 2D realization - compute intersection of two circles
   * 
   * @param world World instance to query parent realizations
   * @returns Point2DRealization2D with intersection point at specified index, or infeasible if no intersection
   */
  realize2D(world: ProjectionElementRealizationContext): Point2DRealization2D {
    const plane = world.getProjectionPlaneById(this.planeId);
    assert(plane, `[Point2DCircleCircleIntersection] plane ${this.planeId} not found for point ${this.id}`);
    const c1 = plane.getCircle(this.circle1Id);
    const c2 = plane.getCircle(this.circle2Id);
    
    assert(c1, `[Point2DCircleCircleIntersection] circle1 ${this.circle1Id} not found on plane ${this.planeId} for point ${this.id}`);
    assert(c2, `[Point2DCircleCircleIntersection] circle2 ${this.circle2Id} not found on plane ${this.planeId} for point ${this.id}`);
    
    const circle1 = c1.realize2D(world);
    const circle2 = c2.realize2D(world);
    
    assert(circle1, `[Point2DCircleCircleIntersection] circle1.realize2D() returned null for ${this.circle1Id}`);
    assert(circle2, `[Point2DCircleCircleIntersection] circle2.realize2D() returned null for ${this.circle2Id}`);
    
    // Check if parent elements are infeasible - propagate infeasibility
    if (!circle1.feasible || !circle2.feasible) {
      console.warn('[Point2DCircleCircleIntersection] Parent element is infeasible, marking this as infeasible');
      return new Point2DRealization2D(new Vector3(0, 0, 1), false);
    }
    
    const intersectionPoints = intersectCircleCircle(circle1, circle2);
    
    if (intersectionPoints.length === 0) {
      console.warn('[Point2DCircleCircleIntersection] Circles do not intersect');
      return new Point2DRealization2D(new Vector3(0, 0, 1), false);
    }
    
    const point = intersectionPoints[Math.min(this.index, intersectionPoints.length - 1)];
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

  getDependencies(): string[] {
    return [this.primaryIntersectionId];
  }

  /**
   * Calculate 2D realization - uses coordinate cloning from primary point
   * 
   * CRITICAL REQUIREMENT: Coordinate cloning is mathematically equivalent to parametric
   * scalar transfer (R = Q + d·D pattern) ONLY when both HalfHingeLine2D objects
   * representing the same 3D HingeLine use IDENTICAL parametric representation:
   *   - Same reference point Q in local (u,v) coordinates
   *   - Same direction vector D in local (u,v) coordinates
   * 
   * When this parametric consistency holds:
   *   Primary intersection: R = Q + d·D (on primary plane)
   *   Sibling position: R' = Q' + d·D' = Q + d·D = R (coordinates identical!)
   *   Therefore: coordinate cloning ≡ parametric scalar transfer
   * 
   * This property MUST be enforced for ALL HingeLines during construction.
   * Breaking this constraint causes sibling points to compute incorrect positions silently.
   * 
   * @param world World instance to access primary point realization
   * @returns Point2DRealization2D with same coordinates as primary
   * @see HingeLine constructor must ensure parametric consistency for paired HalfHingeLine2D
   */
  realize2D(world: ProjectionElementRealizationContext): Point2DRealization2D {
    // Get primary intersection point's 2D realization
    const primaryPoint = world.getPoint2D(this.primaryIntersectionId);
    assert(primaryPoint, `[SiblingIntersectionPoint2D] Primary point ${this.primaryIntersectionId} not found for point ${this.id}`);
    const primaryRealization = primaryPoint.realize2D(world);
    assert(primaryRealization, `[SiblingIntersectionPoint2D] primaryPoint.realize2D() returned null for ${this.primaryIntersectionId}`);
    
    // Propagate infeasibility from primary
    if (!primaryRealization.feasible) {
      return new Point2DRealization2D(new Vector3(0, 0, 1), false);
    }

    // Check if primary intersection involves a BrokenHalfHingeLine2D.
    // If so, both BHHLs are 2D representations of the SAME 3D BrokenHingeLine,
    // and the twin position must be found via 3D round-trip (not coordinate cloning).
    const primaryPointDomain = world.getPoint2D(this.primaryIntersectionId);
    if (primaryPointDomain && 'line1Id' in primaryPointDomain && 'line2Id' in primaryPointDomain) {
      const intersection = primaryPointDomain as Point2DLineLineIntersection;
      const line1 = world.getLine2D(intersection.line1Id);
      const line2 = world.getLine2D(intersection.line2Id);

      const primaryBHHL = (
        line1 instanceof BrokenHalfHingeLine2D ? line1 :
        line2 instanceof BrokenHalfHingeLine2D ? line2 :
        null
      );

      if (primaryBHHL) {
        // BHHL 3D round-trip: lift the primary position to 3D and project to sibling plane.
        // This is correct because both BHHLs represent the same 3D BHL — the primary
        // intersection point on T2 and the sibling intersection on T2' are the same 3D point.
        const R = primaryRealization.position;
        const primaryPlaneReal3D = world.getProjectionPlane3DRealization(primaryBHHL.planeId);
        const siblingPlaneReal3D = world.getProjectionPlane3DRealization(this.planeId);

        if (!primaryPlaneReal3D?.feasible || !siblingPlaneReal3D?.feasible) {
          console.warn('[SiblingIntersectionPoint2D] 3D plane realization infeasible for BHHL round-trip');
          return new Point2DRealization2D(new Vector3(0, 0, 1), false);
        }

        // Lift R to 3D (Vector3 → Vector4 homogeneous)
        const R_3D = applyMatrix4x3(R, primaryPlaneReal3D.planeTo3D);
        // Project back to sibling plane 2D (Vector4 → Vector3 homogeneous)
        const R_prime = applyMatrix3x4(R_3D, siblingPlaneReal3D.threeDToPlane);

        console.log(`[SiblingIntersectionPoint2D] BHHL 3D round-trip: R=(${R.x.toFixed(2)},${R.y.toFixed(2)}) → 3D=(${R_3D.x.toFixed(2)},${R_3D.y.toFixed(2)},${R_3D.z.toFixed(2)}) → R'=(${R_prime.x.toFixed(2)},${R_prime.y.toFixed(2)})`);
        return new Point2DRealization2D(new Vector3(R_prime.x, R_prime.y, 1), true);
      }
    }

    // Regular HHL case: Coordinate cloning is correct because both HalfHingeLine2D
    // objects share identical parametric representation (same Q and D in local coords).
    //   Primary: R = Q + d·D   Sibling: R' = Q' + d·D' = Q + d·D = R
    return new Point2DRealization2D(primaryRealization.position.clone());
  }
}

// Type guards for Point2D types
export function isFreePoint2D(point: Point2D): point is FreePoint2D {
  return point instanceof FreePoint2D;
}

export function isLineLineIntersection(point: Point2D): point is Point2DLineLineIntersection {
  return point instanceof Point2DLineLineIntersection;
}

export function isLineCircleIntersection(point: Point2D): point is Point2DLineCircleIntersection {
  return point instanceof Point2DLineCircleIntersection;
}

export function isCircleCircleIntersection(point: Point2D): point is Point2DCircleCircleIntersection {
  return point instanceof Point2DCircleCircleIntersection;
}

export function isIntersectionPoint2D(point: Point2D): point is IntersectionPoint2D {
  return point instanceof IntersectionPoint2D;
}

export function isSiblingIntersectionPoint2D(point: Point2D): point is SiblingIntersectionPoint2D {
  return point instanceof SiblingIntersectionPoint2D;
}

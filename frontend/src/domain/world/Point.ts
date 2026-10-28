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

import { Vector3 } from 'three';
import type { ProjectionElementRealizationContext } from './projectionPlane/ProjectionPlaneContext';
import { intersectLineLine, intersectLineCircle, intersectCircleCircle } from '@/domain/calculations/Intersections';
import { isPointOnSegment } from '@/domain/calculations/SegmentUtils';
import { Realization } from './Realization';
import { Element2D } from './Element2D';
import { HalfHingeLine2D } from './HingeLine';
import { BrokenHalfHingeLine2D } from './elements/BrokenHalfHingeLine2D';
import { applyMatrix4x3, applyMatrix3x4 } from '@/utils/threeUtils';
import { assert } from '@/utils/assert';

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
export class Point2DRealization2D extends Realization {
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
   * @param context Realization context to query parent realizations
   */
  abstract realize2D(context: ProjectionElementRealizationContext): Point2DRealization2D;
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
  realize2D(_context: ProjectionElementRealizationContext): Point2DRealization2D {
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
   * @param context Realization context to query parent realizations
   * @returns Point2DRealization2D with intersection point, or infeasible if computation fails
   */
  abstract realize2D(context: ProjectionElementRealizationContext): Point2DRealization2D;
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
   * @param context Realization context to query parent realizations
   * @returns Point2DRealization2D with intersection point, or infeasible if lines are parallel/coincident or intersection falls outside segment bounds
   */
  realize2D(context: ProjectionElementRealizationContext): Point2DRealization2D {
    const plane = context.getProjectionPlaneById(this.planeId);
    assert(plane, `[Point2DLineLineIntersection] plane ${this.planeId} not found for point ${this.id}`);
    const l1 = plane.getLine(this.line1Id);
    const l2 = plane.getLine(this.line2Id);
    
    assert(l1, `[Point2DLineLineIntersection] line1 ${this.line1Id} not found on plane ${this.planeId} for point ${this.id}`);
    assert(l2, `[Point2DLineLineIntersection] line2 ${this.line2Id} not found on plane ${this.planeId} for point ${this.id}`);
    
    const line1 = l1.realize2D(context);
    const line2 = l2.realize2D(context);
    
    assert(line1, `[Point2DLineLineIntersection] line1.realize2D() returned null for ${this.line1Id}`);
    assert(line2, `[Point2DLineLineIntersection] line2.realize2D() returned null for ${this.line2Id}`);
    
    // Check if parent elements are infeasible - propagate infeasibility
    if (!line1.feasible || !line2.feasible) {
      return new Point2DRealization2D(new Vector3(0, 0, 1), false);
    }
    
    const intersectionPointReal = intersectLineLine(line1, line2);
    
    if (!intersectionPointReal.feasible) {
      return new Point2DRealization2D(new Vector3(0, 0, 1), false);
    }
    
    const intersectionPoint = intersectionPointReal.position;
    
    // Get the domain objects to check if they're segments
    const line1Domain = context.getLine2D(this.line1Id);
    const line2Domain = context.getLine2D(this.line2Id);
    
    // Check if intersection falls within segment bounds
    // A segment has point1.z=1 and point2.z=1 (finite endpoints)
    // An infinite line has point2.z=0 (direction vector)
    
    // Check line1 if it's a segment
    if (line1Domain && line1Domain.isBounded() && line1.point2.z === 1) {
      // Segment: check if intersection is between point1 and point2
      if (!isPointOnSegment(intersectionPoint, line1)) {
        return new Point2DRealization2D(intersectionPoint, false);
      }
    }
    
    // Check line2 if it's a segment
    if (line2Domain && line2Domain.isBounded() && line2.point2.z === 1) {
      // Segment: check if intersection is between point1 and point2
      if (!isPointOnSegment(intersectionPoint, line2)) {
        return new Point2DRealization2D(intersectionPoint, false);
      }
    }
    
    return new Point2DRealization2D(intersectionPoint, true);
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
   * @param context Realization context to query parent realizations
   * @returns Point2DRealization2D with intersection point at specified index, or infeasible if no intersection or intersection falls outside segment bounds
   */
  realize2D(context: ProjectionElementRealizationContext): Point2DRealization2D {
    const plane = context.getProjectionPlaneById(this.planeId);
    assert(plane, `[Point2DLineCircleIntersection] plane ${this.planeId} not found for point ${this.id}`);
    const l = plane.getLine(this.lineId);
    const c = plane.getCircle(this.circleId);
    
    assert(l, `[Point2DLineCircleIntersection] line ${this.lineId} not found on plane ${this.planeId} for point ${this.id}`);
    assert(c, `[Point2DLineCircleIntersection] circle ${this.circleId} not found on plane ${this.planeId} for point ${this.id}`);
    
    const line = l.realize2D(context);
    const circle = c.realize2D(context);
    
    assert(line, `[Point2DLineCircleIntersection] line.realize2D() returned null for ${this.lineId}`);
    assert(circle, `[Point2DLineCircleIntersection] circle.realize2D() returned null for ${this.circleId}`);
    
    // Check if parent elements are infeasible - propagate infeasibility
    if (!line.feasible || !circle.feasible) {
      return new Point2DRealization2D(new Vector3(0, 0, 1), false);
    }
    
    const intersectionPoints = intersectLineCircle(line, circle);
    
    if (intersectionPoints.length === 0) {
      return new Point2DRealization2D(new Vector3(0, 0, 1), false);
    }
    
    // Return the point at the specified index
    const point = intersectionPoints[Math.min(this.index, intersectionPoints.length - 1)];
    
    // Check if the line is actually a segment and if intersection is within bounds
    const lineDomain = context.getLine2D(this.lineId);
    if (lineDomain && lineDomain.isBounded() && line.point2.z === 1) {
      // Segment: check if intersection is between point1 and point2
      if (!isPointOnSegment(point, line)) {
        return new Point2DRealization2D(point, false);
      }
    }
    
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
   * @param context Realization context to query parent realizations
   * @returns Point2DRealization2D with intersection point at specified index, or infeasible if no intersection
   */
  realize2D(context: ProjectionElementRealizationContext): Point2DRealization2D {
    const plane = context.getProjectionPlaneById(this.planeId);
    assert(plane, `[Point2DCircleCircleIntersection] plane ${this.planeId} not found for point ${this.id}`);
    const c1 = plane.getCircle(this.circle1Id);
    const c2 = plane.getCircle(this.circle2Id);
    
    assert(c1, `[Point2DCircleCircleIntersection] circle1 ${this.circle1Id} not found on plane ${this.planeId} for point ${this.id}`);
    assert(c2, `[Point2DCircleCircleIntersection] circle2 ${this.circle2Id} not found on plane ${this.planeId} for point ${this.id}`);
    
    const circle1 = c1.realize2D(context);
    const circle2 = c2.realize2D(context);
    
    assert(circle1, `[Point2DCircleCircleIntersection] circle1.realize2D() returned null for ${this.circle1Id}`);
    assert(circle2, `[Point2DCircleCircleIntersection] circle2.realize2D() returned null for ${this.circle2Id}`);
    
    // Check if parent elements are infeasible - propagate infeasibility
    if (!circle1.feasible || !circle2.feasible) {
      return new Point2DRealization2D(new Vector3(0, 0, 1), false);
    }
    
    const intersectionPoints = intersectCircleCircle(circle1, circle2);
    
    if (intersectionPoints.length === 0) {
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
   * @param context Realization context to access primary point realization
   * @returns Point2DRealization2D with same coordinates as primary
   * @see HingeLine constructor must ensure parametric consistency for paired HalfHingeLine2D
   */
  realize2D(context: ProjectionElementRealizationContext): Point2DRealization2D {
    // Get primary intersection point's 2D realization
    const primaryPoint = context.getPoint2D(this.primaryIntersectionId);
    assert(primaryPoint, `[SiblingIntersectionPoint2D] Primary point ${this.primaryIntersectionId} not found for point ${this.id}`);
    const primaryRealization = primaryPoint.realize2D(context);
    assert(primaryRealization, `[SiblingIntersectionPoint2D] primaryPoint.realize2D() returned null for ${this.primaryIntersectionId}`);
    
    // Propagate infeasibility from primary
    if (!primaryRealization.feasible) {
      return new Point2DRealization2D(new Vector3(0, 0, 1), false);
    }

    // If the primary intersection involves any hinge representation, both points
    // are the same 3D point seen from different projection planes. Use a 3D
    // round-trip instead of coordinate cloning; auxiliary hinges do not always
    // share the same local 2D parametrization.
    const primaryPointDomain = context.getPoint2D(this.primaryIntersectionId);
    if (primaryPointDomain && 'line1Id' in primaryPointDomain && 'line2Id' in primaryPointDomain) {
      const intersection = primaryPointDomain as Point2DLineLineIntersection;
      const line1 = context.getLine2D(intersection.line1Id);
      const line2 = context.getLine2D(intersection.line2Id);

      const primaryHinge = (
        line1 instanceof BrokenHalfHingeLine2D || line1 instanceof HalfHingeLine2D ? line1 :
        line2 instanceof BrokenHalfHingeLine2D || line2 instanceof HalfHingeLine2D ? line2 :
        null
      );

      if (primaryHinge) {
        const R = primaryRealization.position;
        const primaryPlaneReal3D = context.getProjectionPlane3DRealization(primaryHinge.planeId);
        const siblingPlaneReal3D = context.getProjectionPlane3DRealization(this.planeId);

        if (!primaryPlaneReal3D) throw new Error(`SiblingPoint2D ${this.id}: missing 3D realization for primary plane ${primaryHinge.planeId}`);
        if (!siblingPlaneReal3D) throw new Error(`SiblingPoint2D ${this.id}: missing 3D realization for sibling plane ${this.planeId}`);
        if (!primaryPlaneReal3D.feasible || !siblingPlaneReal3D.feasible) {
          return new Point2DRealization2D(new Vector3(0, 0, 1), false);
        }

        // Lift R to 3D (Vector3 → Vector4 homogeneous)
        const R_3D = applyMatrix4x3(R, primaryPlaneReal3D.planeTo3D);
        // Project back to sibling plane 2D (Vector4 → Vector3 homogeneous)
        const R_prime = applyMatrix3x4(R_3D, siblingPlaneReal3D.threeDToPlane);
        return new Point2DRealization2D(new Vector3(R_prime.x, R_prime.y, 1), true);
      }
    }

    // Fallback for legacy non-hinge sibling points.
    return new Point2DRealization2D(primaryRealization.position.clone());
  }
}

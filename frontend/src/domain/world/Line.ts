/**
 * Line2D - Geometric line in 2D projection plane
 * 
 * Lines are infinite straight lines defined by their construction method.
 * This class represents the DEFINITION/RULE of a line, not its coordinates.
 * Actual geometric data is computed in Line2DRealization2D objects.
 * 
 * Types of 2D lines:
 * - Line through two points: defined by two point IDs
 * - Line parallel to another through a point
 * - Line perpendicular to another through a point
 * 
 * Design principles:
 * - Principle V: Coordinates computed and cached in realizations
 * 
 * @see specs/001-dihedral-learning-mvp/data-model.md#line2d
 */

import { Vector3 } from 'three';

export type Line2DType = 'by-two-points' | 'parallel' | 'perpendicular' | 'half-hinge';

/**
 * Line2DRealization2D - Stores computed line in parametric form
 * 
 * Parametric form: P(t) = point + t * direction
 * This is MUCH easier to transform than implicit equation!
 * 
 * Transformation is simple:
 * - point' = M * point (with translation)
 * - direction' = M * direction (without translation - direction is invariant)
 * 
 * Contains ONLY numeric data. Structural information (id, planeId) stays in domain objects.
 */
export class Line2DRealization2D {
  point: Vector3;      // A point on the line (x, y, 1) in homogeneous coords
  direction: Vector3;  // Direction vector (dx, dy, 0) - normalized
  
  constructor(point: Vector3, direction: Vector3) {
    this.point = point;
    // Normalize direction for consistency using vector operations
    this.direction = direction.clone().normalize();
  }
  
  /**
   * Get a point at parameter t along the line
   * P(t) = point + t * direction
   */
  getPointAt(t: number): Vector3 {
    // Vector addition: point + t * direction
    return this.point.clone().addScaledVector(this.direction, t);
  }
}

/**
 * Base Line2D class - represents the rule/definition of a line
 */
export abstract class Line2D {
  id: string;  // Unique identifier (required)
  abstract readonly type: Line2DType;
  label?: string;
  planeId: string;  // Which projection plane this line belongs to
  visible: boolean = true;  // Whether line is visible in the canvas
  
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
   * Clone this line
   */
  abstract clone(): Line2D;
  
  /**
   * Calculate the 2D realization (line equation) for this line
   * Returns line equation in the projection plane's intrinsic coordinates
   */
  abstract realize2D(getPoint: (id: string) => Vector3 | null): Line2DRealization2D | null;
}

/**
 * Line2DByTwoPoints - Line defined by passing through two points
 * The rule is: "line through point1 and point2"
 */
export class Line2DByTwoPoints extends Line2D {
  readonly type: 'by-two-points' = 'by-two-points';
  readonly point1Id: string;  // ID of first point on line
  readonly point2Id: string;  // ID of second point on line
  
  constructor(
    id: string,
    point1Id: string,
    point2Id: string,
    planeId: string,
    label?: string
  ) {
    super(id, planeId, label);
    this.point1Id = point1Id;
    this.point2Id = point2Id;
  }
  
  clone(): Line2DByTwoPoints {
    return new Line2DByTwoPoints(
      this.id,
      this.point1Id,
      this.point2Id,
      this.planeId,
      this.label
    );
  }
  
  /**
   * Calculate 2D realization - compute line in parametric form from two points
   * Parametric form: P(t) = p1 + t * (p2 - p1)
   * 
   * Much simpler than implicit equation and easier to transform!
   */
  realize2D(getPoint: (id: string) => Vector3 | null): Line2DRealization2D | null {
    // Get both points
    const p1 = getPoint(this.point1Id);
    const p2 = getPoint(this.point2Id);
    
    if (!p1 || !p2) {
      return null;  // Cannot compute line without both points
    }
    
    // Compute direction vector using vector subtraction
    const direction = p2.clone().sub(p1);
    direction.z = 0;  // Direction vector, no translation
    
    // Check for degenerate line using vector lengthSq
    if (direction.lengthSq() < 1e-10) {
      return null;  // Points are too close (degenerate line)
    }
    
    // Create parametric representation: point + direction
    return new Line2DRealization2D(p1.clone(), direction);
  }
}

/**
 * Line2DParallel - Line parallel to a reference line through a point
 * The rule is: "line parallel to referenceLineId through throughPointId"
 * 
 * TODO: Implement in later phase when parallel line tool is added
 */
export class Line2DParallel extends Line2D {
  readonly type: 'parallel' = 'parallel';
  readonly referenceLineId: string;  // Line to be parallel to
  readonly throughPointId: string;   // Point the new line passes through
  
  constructor(
    id: string,
    referenceLineId: string,
    throughPointId: string,
    planeId: string,
    label?: string
  ) {
    super(id, planeId, label);
    this.referenceLineId = referenceLineId;
    this.throughPointId = throughPointId;
  }
  
  clone(): Line2DParallel {
    return new Line2DParallel(
      this.id,
      this.referenceLineId,
      this.throughPointId,
      this.planeId,
      this.label
    );
  }
  
  realize2D(_getPoint: (id: string) => Vector3 | null): Line2DRealization2D | null {
    // TODO: Implement parallel line realization
    // Need access to reference line's realization
    return null;
  }
}

/**
 * Line2DPerpendicular - Line perpendicular to a reference line through a point
 * The rule is: "line perpendicular to referenceLineId through throughPointId"
 * 
 * TODO: Implement in later phase when perpendicular line tool is added
 */
export class Line2DPerpendicular extends Line2D {
  readonly type: 'perpendicular' = 'perpendicular';
  readonly referenceLineId: string;  // Line to be perpendicular to
  readonly throughPointId: string;   // Point the new line passes through
  
  constructor(
    id: string,
    referenceLineId: string,
    throughPointId: string,
    planeId: string,
    label?: string
  ) {
    super(id, planeId, label);
    this.referenceLineId = referenceLineId;
    this.throughPointId = throughPointId;
  }
  
  clone(): Line2DPerpendicular {
    return new Line2DPerpendicular(
      this.id,
      this.referenceLineId,
      this.throughPointId,
      this.planeId,
      this.label
    );
  }
  
  realize2D(_getPoint: (id: string) => Vector3 | null): Line2DRealization2D | null {
    // TODO: Implement perpendicular line realization
    // Need access to reference line's realization
    return null;
  }
}

/**
 * Line2D - Geometric line in 2D projection plane
 * 
 * Lines are infinite straight lines defined by their construction method.
 * This class represents the DEFINITION/RULE of a line, not its coordinates.
 * Actual geometric data is computed in Line2DRealization objects.
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

export type Line2DType = 'by-two-points' | 'parallel' | 'perpendicular';

/**
 * Line2DRealization - Stores computed line equation in 2D
 * 
 * Line equation in implicit form: ax + by + c = 0
 * Contains ONLY numeric data. Structural information (id, planeId) stays in domain objects.
 */
export class Line2DRealization {
  a: number;  // Coefficient for x
  b: number;  // Coefficient for y
  c: number;  // Constant term
  
  constructor(a: number, b: number, c: number) {
    this.a = a;
    this.b = b;
    this.c = c;
  }
  
  /**
   * Get direction vector (perpendicular to normal (a, b))
   * Returns normalized direction
   */
  getDirection(): Vector3 {
    // Direction is perpendicular to normal (a, b)
    // If normal is (a, b), direction is (-b, a) or (b, -a)
    const length = Math.sqrt(this.b * this.b + this.a * this.a);
    return new Vector3(-this.b / length, this.a / length, 0);
  }
  
  /**
   * Get a point on the line
   * Returns any point that satisfies ax + by + c = 0
   */
  getPointOnLine(): Vector3 {
    // Find a point on the line by setting one coordinate
    if (Math.abs(this.a) > Math.abs(this.b)) {
      // Use y = 0, solve for x: ax + c = 0 → x = -c/a
      return new Vector3(-this.c / this.a, 0, 1);
    } else {
      // Use x = 0, solve for y: by + c = 0 → y = -c/b
      return new Vector3(0, -this.c / this.b, 1);
    }
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
  abstract realize2D(getPoint: (id: string) => Vector3 | null): Line2DRealization | null;
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
   * Calculate 2D realization - compute line equation from two points
   * Line equation: ax + by + c = 0
   * 
   * Given two points P1(x1, y1) and P2(x2, y2):
   * Direction vector: (dx, dy) = (x2 - x1, y2 - y1)
   * Normal vector: (a, b) = (-dy, dx) = (y1 - y2, x2 - x1)
   * Line equation: a(x - x1) + b(y - y1) = 0
   *                ax + by - ax1 - by1 = 0
   *                ax + by + c = 0  where c = -ax1 - by1
   */
  realize2D(getPoint: (id: string) => Vector3 | null): Line2DRealization | null {
    // Get both points
    const p1 = getPoint(this.point1Id);
    const p2 = getPoint(this.point2Id);
    
    if (!p1 || !p2) {
      return null;  // Cannot compute line without both points
    }
    
    // Check points are distinct
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const distSq = dx * dx + dy * dy;
    
    if (distSq < 1e-10) {
      return null;  // Points are too close (degenerate line)
    }
    
    // Compute line equation: ax + by + c = 0
    // Normal vector (perpendicular to direction): (-dy, dx)
    const a = p1.y - p2.y;  // -dy
    const b = p2.x - p1.x;  // dx
    const c = -a * p1.x - b * p1.y;
    
    return new Line2DRealization(a, b, c);
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
  
  realize2D(getPoint: (id: string) => Vector3 | null): Line2DRealization | null {
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
  
  realize2D(getPoint: (id: string) => Vector3 | null): Line2DRealization | null {
    // TODO: Implement perpendicular line realization
    // Need access to reference line's realization
    return null;
  }
}

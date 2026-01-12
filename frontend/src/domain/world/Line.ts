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
import { Element2DRealization2D } from './Element2DRealization2D';
import { Element2D } from './Element2D';

export type Line2DType = 'by-two-points' | 'parallel' | 'perpendicular' | 'perpendicular-to-line' | 'half-hinge' | 'segment' | 'guide' | 'sibling-guide';

/**
 * Line2DRealization2D - Stores computed line using homogeneous coordinates
 * 
 * @sealed - This class must not be subclassed
 * 
 * Architectural principle: Realization classes contain ONLY geometric data.
 * All behavioral differences belong in domain classes (Line2D, Guide2D, etc.),
 * not in realization classes. Type distinction for rendering happens via domain
 * object type, not realization type.
 * 
 * See data-model.md §Line2D Constructions - "Unified realization type: all lines
 * use Line2DRealization2D".
 * 
 * CRITICAL: Homogeneous coordinates elegantly unify infinite lines and bounded segments.
 * Two points always define a line, but the z coordinate distinguishes the cases:
 * 
 * For Infinite Lines:
 *   point1: Finite point on line - Vector3(u, v, 1) where z=1 means "point"
 *   point2: Point at infinity (direction) - Vector3(dx, dy, 0) where z=0 means "vector"
 *   Parametric form: P(t) = point1 + t * point2 (vector addition works directly!)
 * 
 * For Bounded Segments:
 *   point1: Start point - Vector3(u1, v1, 1) where z=1 means "point"
 *   point2: End point - Vector3(u2, v2, 1) where z=1 means "point"
 *   Bounded region between two finite points
 * 
 * To distinguish:
 *   - point2.z === 0 → Infinite line (point2 is direction vector)
 *   - point2.z === 1 → Bounded segment (point2 is endpoint)
 * 
 * Contains ONLY numeric data. Structural information (id, planeId) stays in domain objects.
 */
export class Line2DRealization2D extends Element2DRealization2D {
  point1: Vector3;     // First defining point (always finite: z=1)
  point2: Vector3;     // Second defining point (z=0 for direction, z=1 for endpoint)
  
  constructor(
    point1: Vector3, 
    point2: Vector3, 
    feasible: boolean = true
  ) {
    super(feasible);
    this.point1 = point1;
    this.point2 = point2;
  }
  
  /**
   * Get direction vector (works for both lines and segments)
   * For infinite lines: point2 is already the direction (z=0)
   * For segments: direction = point2 - point1
   * 
   * NOTE: Returns NON-NORMALIZED direction to avoid expensive sqrt operation.
   * Use lengthSq() instead of length() when possible for comparisons.
   */
  getDirection(): Vector3 {
    if (this.point2.z === 0) {
      // Infinite line: point2 is already a direction vector
      return this.point2.clone();
    } else {
      // Segment: compute direction from endpoints
      const dir = this.point2.clone().sub(this.point1);
      dir.z = 0;  // Direction vectors have z=0
      return dir;
    }
  }
  
  /**
   * Check if this is a bounded segment
   * Segments have both endpoints with z=1
   */
  isBounded(): boolean {
    return this.point2.z === 1;
  }
  
  /**
   * Get segment length (only for bounded segments)
   */
  getLength(): number | undefined {
    if (!this.isBounded()) {
      return undefined;
    }
    return this.point1.distanceTo(this.point2);
  }
}

/**
 * Base Line2D class - represents the rule/definition of a line
 * Extends Element2D to provide common properties and interface for all 2D elements
 */
export abstract class Line2D extends Element2D {
  abstract readonly type: Line2DType;
  
  constructor(
    id: string,
    planeId: string,
    label?: string
  ) {
    super(id, planeId, label);
  }
  
  /**
   * Clone this line
   */
  abstract clone(): Line2D;
  
  /**
   * Calculate the 2D realization (line equation) for this line
   * Returns line equation in the projection plane's intrinsic coordinates
   */
  abstract realize2D(world: import('./World').World): Line2DRealization2D | null;
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
   * 
   * Returns infinite line representation using homogeneous coordinates:
   *   point1: finite point on line (z=1)
   *   point2: direction vector (z=0)
   */
  realize2D(world: import('./World').World): Line2DRealization2D | null {
    // Get both points from world
    const plane = world.getProjectionPlaneById(this.planeId);
    const point1 = plane?.getPoint(this.point1Id);
    const point2 = plane?.getPoint(this.point2Id);
    const p1Realization = point1?.realize2D(world);
    const p2Realization = point2?.realize2D(world);
    
    if (!p1Realization || !p2Realization) {
      return null;  // Cannot compute line without both points
    }
    
    // Check if parent points are infeasible - propagate infeasibility
    if (!p1Realization.feasible || !p2Realization.feasible) {
      // Return infeasible line with dummy geometry (point and horizontal direction)
      return new Line2DRealization2D(
        new Vector3(0, 0, 1),      // point1: arbitrary point
        new Vector3(1, 0, 0),      // point2: horizontal direction (z=0)
        false
      );
    }
    
    const p1 = p1Realization.position;
    const p2 = p2Realization.position;
    
    // Compute direction vector using vector subtraction
    const direction = p2.clone().sub(p1);
    direction.z = 0;  // Direction vectors have z=0 (point at infinity)
    
    // Check for degenerate line
    if (direction.lengthSq() < 1e-10) {
      return new Line2DRealization2D(
        p1.clone(),
        new Vector3(1, 0, 0),      // Fallback direction (z=0)
        false
      );
    }
    
    // Return infinite line: point1 (finite) + point2 (direction)
    return new Line2DRealization2D(p1.clone(), direction, true);
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
  
  realize2D(_world: import('./World').World): Line2DRealization2D | null {
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
/**
 * Line2DPerpendicularToLine - Line perpendicular to a reference line through a point
 * 
 * The rule is: "line perpendicular to referenceLineId through throughPointId"
 * 
 * Implementation notes:
 * - Uses homogeneous coordinates for perpendicular calculation per Principle V
 * - Perpendicular direction in 2D: if line has direction (dx, dy), perpendicular is (-dy, dx)
 * - This is a 90-degree rotation, which works correctly in homogeneous coords
 * 
 * This is the base class for Guide2D (guides are lines with special rendering/behavior).
 */
export class Line2DPerpendicularToLine extends Line2D {
  readonly type: Line2DType;  // Phase 52: Allow subclasses to override with their own type
  readonly referenceLineId: string;  // Line to be perpendicular to
  readonly throughPointId: string;   // Point the new line passes through
  
  constructor(
    id: string,
    referenceLineId: string,
    throughPointId: string,
    planeId: string,
    label?: string,
    type: Line2DType = 'perpendicular-to-line'  // Default type, subclasses can override
  ) {
    super(id, planeId, label);
    this.type = type;
    this.referenceLineId = referenceLineId;
    this.throughPointId = throughPointId;
  }
  
  clone(): Line2DPerpendicularToLine {
    return new Line2DPerpendicularToLine(
      this.id,
      this.referenceLineId,
      this.throughPointId,
      this.planeId,
      this.label,
      this.type
    );
  }
  
  /**
   * Calculate 2D realization - compute line perpendicular to reference line
   * 
   * Algorithm:
   * 1. Get reference line's realization (point + direction)
   * 2. Compute perpendicular direction using 90-degree rotation
   * 3. Get the through-point position
   * 4. Return line through the point with perpendicular direction
   * 
   * Perpendicular in 2D homogeneous coordinates:
   * - If line has direction (dx, dy, 0), perpendicular is (-dy, dx, 0)
   * - This is a counter-clockwise 90-degree rotation
   * - Works correctly with homogeneous coords (z=0 for direction vectors)
   */
  realize2D(world: import('./World').World): Line2DRealization2D | null {
    // Get reference line realization from world
    const plane = world.getProjectionPlaneById(this.planeId);
    const refLine = plane?.getLine(this.referenceLineId);
    const referenceLine = refLine?.realize2D(world);
    if (!referenceLine) {
      return null;  // Cannot compute line without reference line
    }

    // Check if reference line is infeasible - propagate infeasibility
    if (!referenceLine.feasible) {
      return new Line2DRealization2D(new Vector3(0, 0, 1), new Vector3(1, 0, 0), false);
    }

    // Get through-point realization from world
    const throughPoint = plane?.getPoint(this.throughPointId);
    const throughPointRealization = throughPoint?.realize2D(world);
    if (!throughPointRealization) {
      return null;  // Cannot compute line without through-point
    }

    // Check if through-point is infeasible - propagate infeasibility
    if (!throughPointRealization.feasible) {
      return new Line2DRealization2D(new Vector3(0, 0, 1), new Vector3(1, 0, 0), false);
    }

    // Compute perpendicular direction using 90-degree rotation
    // If line direction is (dx, dy, 0), perpendicular is (-dy, dx, 0)
    const lineDirection = referenceLine.getDirection();
    const perpendicularDirection = new Vector3(
      -lineDirection.y,  // -dy
      lineDirection.x,   // dx
      0                  // Direction vector, no translation
    );

    // Check for degenerate case (shouldn't happen if reference line is valid)
    if (perpendicularDirection.lengthSq() < 1e-10) {
      return new Line2DRealization2D(
        throughPointRealization.position.clone(),
        new Vector3(1, 0, 0),  // Fallback direction
        false
      );
    }

    // Return infinite line through point with perpendicular direction
    // point1 = through-point (finite), point2 = direction (infinite, z=0)
    return new Line2DRealization2D(
      throughPointRealization.position.clone(),
      perpendicularDirection,
      true
    );
  }
}

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

export type Line2DType = 'by-two-points' | 'parallel' | 'perpendicular' | 'perpendicular-to-line' | 'tangent-to-circle-through-point' | 'tangent-to-circle-parallel' | 'half-hinge' | 'segment' | 'guide' | 'sibling-guide';

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

    // CRITICAL: Parallel direction = reference direction (NO rotation)
    // This is the key difference from perpendicular lines
    const parallelDirection = referenceLine.getDirection();

    // Create parallel line realization
    // Line passes through the specified point with parallel direction
    return new Line2DRealization2D(
      throughPointRealization.position,  // Through-point (z=1)
      parallelDirection,                 // Parallel direction (z=0)
      true                                // Feasible
    );
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

/**
 * Line2DTangentToCircleThroughPoint - Line tangent to circle passing through external point
 * 
 * Phase 60: Tangent line construction through external point
 * 
 * For a point outside a circle, exactly two tangent lines exist that touch the circle.
 * The tangent index (0 or 1) is automatically determined from the mouse position when
 * creating the line, using the same angle-from-radius-vector convention as circle intersections.
 * 
 * Algorithm:
 * - Check point is outside circle: distance d = ||P - C|| > r
 * - Compute tangent angle: α = asin(r / d)
 * - Index 0: Rotate PC by +α (smaller angle from radius vector)
 * - Index 1: Rotate PC by -α (larger angle from radius vector)
 * 
 * Pattern: Follows sortPointsByAngleFromRadiusVector() indexing convention
 * 
 * @see specs/001-dihedral-learning-mvp/data-model.md#line2dtangenttocirclethroughpoint
 */
export class Line2DTangentToCircleThroughPoint extends Line2D {
  readonly type: Line2DType = 'tangent-to-circle-through-point';
  readonly circleId: string;           // Circle to be tangent to
  readonly throughPointId: string;     // External point line passes through
  readonly tangentIndex: 0 | 1;        // Disambiguates which of two tangent lines (angle-based)
  
  constructor(
    id: string,
    circleId: string,
    throughPointId: string,
    tangentIndex: 0 | 1,
    planeId: string,
    label?: string
  ) {
    super(id, planeId, label);
    this.circleId = circleId;
    this.throughPointId = throughPointId;
    this.tangentIndex = tangentIndex;
  }
  
  clone(): Line2DTangentToCircleThroughPoint {
    return new Line2DTangentToCircleThroughPoint(
      this.id,
      this.circleId,
      this.throughPointId,
      this.tangentIndex,
      this.planeId,
      this.label
    );
  }
  
  /**
   * Calculate 2D realization - compute line tangent to circle through external point
   * 
   * Algorithm (geometric derivation):
   * 1. Get circle center C and radius r
   * 2. Get external point P
   * 3. Check feasibility: distance d = ||P - C|| must be > r
   * 4. Compute tangent length: L = sqrt(d² - r²)
   * 5. Compute angle α = asin(r / d)
   * 6. Compute angle from P to C: θ_PC = atan2(dy, dx)
   * 7. For index 0: tangent angle = θ_PC + α (left tangent)
   * 8. For index 1: tangent angle = θ_PC - α (right tangent)
   * 9. Tangent point T on circle: T = C + r * (cos(angle), sin(angle))
   * 10. Line direction: from P to T
   * 
   * Index convention: Based on angle from circle's radius vector
   * - Index 0 = smaller relative angle from radius vector
   * - Index 1 = larger relative angle (counterclockwise)
   * - Same pattern as sortPointsByAngleFromRadiusVector()
   */
  realize2D(world: import('./World').World): Line2DRealization2D | null {
    // Step 1: Get containing plane
    const plane = world.getProjectionPlaneById(this.planeId);
    if (!plane) return null;
    
    // Step 2: Get circle realization
    const circle = plane.getCircle(this.circleId);
    const circleRealization = circle?.realize2D(world);
    if (!circleRealization) return null;
    
    // Step 3: Get through-point realization
    const throughPoint = plane.getPoint(this.throughPointId);
    const throughPointRealization = throughPoint?.realize2D(world);
    if (!throughPointRealization) return null;
    
    // Step 4: Check infeasibility propagation
    if (!circleRealization.feasible || !throughPointRealization.feasible) {
      return new Line2DRealization2D(new Vector3(0, 0, 1), new Vector3(1, 0, 0), false);
    }
    
    // Step 5: Compute distance from external point to circle center
    const center = circleRealization.center;  // (cx, cy, 1)
    const externalPoint = throughPointRealization.position;  // (px, py, 1)
    const radius = circleRealization.getRadius();
    
    const dx = externalPoint.x - center.x;
    const dy = externalPoint.y - center.y;
    const distanceSquared = dx * dx + dy * dy;
    const distance = Math.sqrt(distanceSquared);
    
    // Step 6: Check geometric feasibility
    // Point must be strictly outside circle (distance > radius)
    const EPSILON = 1e-6;
    if (distance <= radius + EPSILON) {
      // Point is inside or on circle boundary - no tangent lines exist
      return new Line2DRealization2D(
        externalPoint.clone(),
        new Vector3(1, 0, 0),
        false  // Mark as infeasible
      );
    }
    
    // Step 7: Compute tangent points using geometric derivation
    // Angle from external point to circle center
    const anglePtoC = Math.atan2(dy, dx);
    
    // Tangent angle (angle between PC and tangent line)
    const angleAlpha = Math.asin(radius / distance);
    
    // Two possible tangent angles:
    // Index 0: Rotate PC by +α (left tangent when viewing from P to C)
    // Index 1: Rotate PC by -α (right tangent when viewing from P to C)
    const tangentAngle = this.tangentIndex === 0 ?
      anglePtoC + angleAlpha :
      anglePtoC - angleAlpha;
    
    // Line direction: PERPENDICULAR to radius at tangent point
    // Radius direction at tangent point: (cos(tangentAngle), sin(tangentAngle))
    // Perpendicular (90° CCW rotation): (-sin(tangentAngle), cos(tangentAngle))
    const direction = new Vector3(
      -Math.sin(tangentAngle),
      Math.cos(tangentAngle),
      0  // Direction vector
    );
    
    // Note: This tangent line passes through BOTH the external point AND the tangent point
    // because the geometry ensures the line from P perpendicular to radius at T passes through P
    
    // Return infinite line through external point with tangent direction
    return new Line2DRealization2D(
      externalPoint.clone(),
      direction,
      true
    );
  }
}

/**
 * Line2DTangentToCircleParallelToLine - Line tangent to circle and parallel to reference line
 * 
 * Phase 61: Tangent line construction parallel to reference line
 * 
 * For a circle and an external line, exactly two tangent lines parallel to the reference
 * exist (one on each side). The tangent index (0 or 1) is automatically determined from
 * the mouse position when creating the line, using the same angle-from-radius-vector
 * convention as circle intersections.
 * 
 * Algorithm:
 * - Check reference line doesn't intersect circle: distance from center to line > r
 * - Compute perpendicular direction: perpDir = (-dy, dx, 0) for direction (dx, dy, 0)
 * - Index 0: Tangent point = C + r * perpDir (smaller angle from radius vector)
 * - Index 1: Tangent point = C - r * perpDir (larger angle from radius vector)
 * - Tangent line: through tangent point with same direction as reference
 * 
 * Pattern: Follows sortPointsByAngleFromRadiusVector() indexing convention
 * 
 * @see specs/001-dihedral-learning-mvp/data-model.md#line2dtangenttocircleparalleltoline
 */
export class Line2DTangentToCircleParallelToLine extends Line2D {
  readonly type: Line2DType = 'tangent-to-circle-parallel';
  readonly circleId: string;           // Circle to be tangent to
  readonly referenceLineId: string;    // Line to be parallel to
  readonly tangentIndex: 0 | 1;        // Disambiguates which of two tangent lines (angle-based)
  
  constructor(
    id: string,
    circleId: string,
    referenceLineId: string,
    tangentIndex: 0 | 1,
    planeId: string,
    label?: string
  ) {
    super(id, planeId, label);
    this.circleId = circleId;
    this.referenceLineId = referenceLineId;
    this.tangentIndex = tangentIndex;
  }
  
  clone(): Line2DTangentToCircleParallelToLine {
    return new Line2DTangentToCircleParallelToLine(
      this.id,
      this.circleId,
      this.referenceLineId,
      this.tangentIndex,
      this.planeId,
      this.label
    );
  }
  
  /**
   * Calculate 2D realization - compute line tangent to circle and parallel to reference
   * 
   * Algorithm:
   * 1. Get circle center C and radius r
   * 2. Get reference line direction d = (dx, dy, 0)
   * 3. Check feasibility: distance from C to reference line must be > r
   * 4. Compute perpendicular direction: perpDir = (-dy, dx, 0) (90° CCW)
   * 5. For index 0: tangent point = C + r * perpDir (left side)
   * 6. For index 1: tangent point = C - r * perpDir (right side)
   * 7. Return line through tangent point with direction d (parallel to reference)
   * 
   * Index convention: Based on angle from circle's radius vector
   * - Index 0 = smaller relative angle from radius vector
   * - Index 1 = larger relative angle (counterclockwise)
   * - Same pattern as sortPointsByAngleFromRadiusVector()
   */
  realize2D(world: import('./World').World): Line2DRealization2D | null {
    // Step 1: Get containing plane
    const plane = world.getProjectionPlaneById(this.planeId);
    if (!plane) return null;
    
    // Step 2: Get circle realization
    const circle = plane.getCircle(this.circleId);
    const circleRealization = circle?.realize2D(world);
    if (!circleRealization) return null;
    
    // Step 3: Get reference line realization (can be from any plane)
    const refLine = world.getLine2D(this.referenceLineId);
    if (!refLine) return null;
    
    const refLineRealization = refLine.realize2D(world);
    if (!refLineRealization) return null;
    
    // Step 4: Check infeasibility propagation
    if (!circleRealization.feasible || !refLineRealization.feasible) {
      return new Line2DRealization2D(new Vector3(0, 0, 1), new Vector3(1, 0, 0), false);
    }
    
    // Step 5: Get circle center and radius
    const center = circleRealization.center;  // (cx, cy, 1)
    const radius = circleRealization.getRadius();
    
    // Step 6: Get reference line direction (normalized for distance calculation)
    const refDirection = refLineRealization.getDirection().clone().normalize();
    
    // Step 7: Compute perpendicular direction (90° CCW rotation)
    const perpDirection = new Vector3(-refDirection.y, refDirection.x, 0);
    
    // Step 8: Check geometric feasibility
    // Reference line must not intersect circle (distance from center to line > radius)
    // Distance from point (cx, cy) to line: d = |ax + by + c| / sqrt(a² + b²)
    // For line with direction (dx, dy) passing through (px, py):
    // Line equation: -dy * x + dx * y + (dy * px - dx * py) = 0
    
    const refPoint = refLineRealization.point1;  // Point on reference line
    const a = -refDirection.y;
    const b = refDirection.x;
    const c = refDirection.y * refPoint.x - refDirection.x * refPoint.y;
    
    // Since refDirection is normalized, a² + b² = 1, so no need to divide
    const distanceToLine = Math.abs(a * center.x + b * center.y + c);
    
    const EPSILON = 1e-6;
    if (distanceToLine <= radius + EPSILON) {
      // Reference line intersects or is tangent to circle - no parallel tangent lines exist
      return new Line2DRealization2D(
        center.clone(),
        refDirection.clone(),
        false  // Mark as infeasible
      );
    }
    
    // Step 9: Compute tangent point position
    // Two parallel tangent lines exist:
    // Index 0: tangent point on "left" side (perpendicular direction)
    // Index 1: tangent point on "right" side (opposite perpendicular)
    
    const tangentPoint = this.tangentIndex === 0 ?
      new Vector3(
        center.x + radius * perpDirection.x,
        center.y + radius * perpDirection.y,
        1  // Finite point
      ) :
      new Vector3(
        center.x - radius * perpDirection.x,
        center.y - radius * perpDirection.y,
        1  // Finite point
      );
    
    // Step 10: Return infinite line through tangent point with reference direction
    // Tangent line is parallel to reference, so same direction
    return new Line2DRealization2D(
      tangentPoint,
      refDirection.clone(),
      true
    );
  }
}

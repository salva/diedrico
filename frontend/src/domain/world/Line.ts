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
import { assert } from '@/utils/assert';

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
   * Create an infeasible line realization
   * Used when parent dependencies are infeasible
   */
  static createInfeasible(): Line2DRealization2D {
    return new Line2DRealization2D(
      new Vector3(0, 0, 1),
      new Vector3(1, 0, 0),
      false
    );
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
  
  /**
   * Check if this line is bounded (finite segment) or unbounded (infinite line)
   * Geometric property: segments are bounded, lines are unbounded
   * 
   * @returns false for infinite lines (default), true for segments
   */
  isBounded(): boolean {
    return false;  // Lines are unbounded by default
  }
}

/**
 * Line2DByTwoPoints - Line defined by passing through two points
 * The rule is: "line through point1 and point2"
 */
export class Line2DByTwoPoints extends Line2D {
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
    const point1 = plane.getPoint(this.point1Id);
    const point2 = plane.getPoint(this.point2Id);
    
    // Missing points are internal errors - fail fast
    assert(point1, `[Line2DByTwoPoints] point1 ${this.point1Id} not found on plane ${this.planeId} for line ${this.id}`);
    assert(point2, `[Line2DByTwoPoints] point2 ${this.point2Id} not found on plane ${this.planeId} for line ${this.id}`);
    
    const p1Realization = point1.realize2D(world);
    const p2Realization = point2.realize2D(world);
    
    // Null realizations are also internal errors
    assert(p1Realization, `[Line2DByTwoPoints] point1.realize2D() returned null for ${this.point1Id}`);
    assert(p2Realization, `[Line2DByTwoPoints] point2.realize2D() returned null for ${this.point2Id}`);
    
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
    const refLine = plane.getLine(this.referenceLineId);
    assert(refLine, `[Line2DParallel] reference line ${this.referenceLineId} not found on plane ${this.planeId} for line ${this.id}`);
    
    const referenceLine = refLine.realize2D(world);
    assert(referenceLine, `[Line2DParallel] refLine.realize2D() returned null for ${this.referenceLineId}`);

    // Check if reference line is infeasible - propagate infeasibility
    if (!referenceLine.feasible) {
      return new Line2DRealization2D(new Vector3(0, 0, 1), new Vector3(1, 0, 0), false);
    }

    // Get through-point realization from world
    const throughPoint = plane.getPoint(this.throughPointId);
    assert(throughPoint, `[Line2DParallel] through point ${this.throughPointId} not found on plane ${this.planeId} for line ${this.id}`);
    
    const throughPointRealization = throughPoint.realize2D(world);
    assert(throughPointRealization, `[Line2DParallel] throughPoint.realize2D() returned null for ${this.throughPointId}`);

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
    assert(plane, `[Line2DPerpendicular] plane ${this.planeId} not found for line ${this.id}`);
    const refLine = plane.getLine(this.referenceLineId);
    assert(refLine, `[Line2DPerpendicular] reference line ${this.referenceLineId} not found on plane ${this.planeId} for line ${this.id}`);
    const referenceLine = refLine.realize2D(world);
    assert(referenceLine, `[Line2DPerpendicular] refLine.realize2D() returned null for ${this.referenceLineId}`);

    // Check if reference line is infeasible - propagate infeasibility
    if (!referenceLine.feasible) {
      return new Line2DRealization2D(new Vector3(0, 0, 1), new Vector3(1, 0, 0), false);
    }

    // Get through-point realization from world
    const throughPoint = plane.getPoint(this.throughPointId);
    assert(throughPoint, `[Line2DPerpendicular] through point ${this.throughPointId} not found on plane ${this.planeId} for line ${this.id}`);
    const throughPointRealization = throughPoint.realize2D(world);
    assert(throughPointRealization, `[Line2DPerpendicular] throughPoint.realize2D() returned null for ${this.throughPointId}`);

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
   * 4. In right triangle CPT (right angle at T):
   *    - Hypotenuse = d (distance from C to P)
   *    - Adjacent = r (radius, from C to T)
   *    - cos(β) = r/d, so β = acos(r/d)
   * 5. Compute angle from C to P: θ_CP = atan2(dy, dx)
   * 6. Two tangent points at angles: θ_CP ± β
   * 7. For index 0: tangent angle = θ_CP + β (counterclockwise)
   * 8. For index 1: tangent angle = θ_CP - β (clockwise)
   * 9. Tangent point T on circle: T = C + r * (cos(angle), sin(angle))
   * 10. Line direction: from P to T
   * 
   * Index Convention:
   * Given circle center A, external point B, tangent point C:
   * - Index 0: Positive angle BAC (counterclockwise from AB to AC)
   * - Index 1: Negative angle BAC (clockwise from AB to AC)
   */
  realize2D(world: import('./World').World): Line2DRealization2D | null {
    // Step 1: Get containing plane
    const plane = world.getProjectionPlaneById(this.planeId);
    
    // Step 2: Get circle realization
    const circle = plane.getCircle(this.circleId);
    assert(circle, `[TangentLineToCircleThroughPoint] circle ${this.circleId} not found on plane ${this.planeId} for line ${this.id}`);
    const circleRealization = circle.realize2D(world);
    assert(circleRealization, `[TangentLineToCircleThroughPoint] circle.realize2D() returned null for ${this.circleId}`);
    
    // Step 3: Get through-point realization
    const throughPoint = plane.getPoint(this.throughPointId);
    assert(throughPoint, `[TangentLineToCircleThroughPoint] through point ${this.throughPointId} not found on plane ${this.planeId} for line ${this.id}`);
    const throughPointRealization = throughPoint.realize2D(world);
    assert(throughPointRealization, `[TangentLineToCircleThroughPoint] throughPoint.realize2D() returned null for ${this.throughPointId}`);
    
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
    // Angle from center to external point
    const angleCP = Math.atan2(dy, dx);
    
    // In right triangle CPT (C=center, P=external point, T=tangent point):
    // - Angle at T = 90° (radius perpendicular to tangent line)
    // - CT = r (radius), CP = d (distance)
    // - cos(angle at C) = r/d
    // - Therefore: angle between CP and CT = arccos(r/d)
    const angleBeta = Math.acos(radius / distance);
    
    // Two possible tangent points (rotate CP by ±β):
    // Index 0: Rotate CP by +β (counterclockwise)
    // Index 1: Rotate CP by -β (clockwise)
    const tangentAngle = this.tangentIndex === 0 ?
      angleCP + angleBeta :
      angleCP - angleBeta;
    
    // Tangent point on circle
    const tangentPoint = new Vector3(
      center.x + radius * Math.cos(tangentAngle),
      center.y + radius * Math.sin(tangentAngle),
      1  // Finite point
    );
    
    // Line direction: from external point P to tangent point T
    // This creates a line that is tangent to the circle at T
    const direction = new Vector3(
      tangentPoint.x - externalPoint.x,
      tangentPoint.y - externalPoint.y,
      0  // Direction vector
    );
    
    // DEBUG: Log tangent line calculation
    console.log('[TangentLine] Through Point:', {
      center: { x: center.x, y: center.y },
      radius,
      externalPoint: { x: externalPoint.x, y: externalPoint.y },
      distance,
      angleCP: angleCP * 180 / Math.PI,
      angleBeta: angleBeta * 180 / Math.PI,
      tangentAngle: tangentAngle * 180 / Math.PI,
      tangentPoint: { x: tangentPoint.x, y: tangentPoint.y },
      direction: { x: direction.x, y: direction.y },
      index: this.tangentIndex
    });
    
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
   * 5. Determine signed distance from center to reference line
   * 6. For index 0: tangent closer to reference (between ref and center)
   * 7. For index 1: tangent farther from reference (center between ref and tangent)
   * 8. Return line through tangent point with direction d (parallel to reference)
   * 
   * Index Convention:
   * - Index 0: Tangent is between reference line and circle center
   * - Index 1: Circle center is between reference line and tangent
   * Order from reference: ref line → index 0 → center → index 1
   */
  realize2D(world: import('./World').World): Line2DRealization2D | null {
    // Step 1: Get containing plane
    const plane = world.getProjectionPlaneById(this.planeId);
    
    // Step 2: Get circle realization
    const circle = plane.getCircle(this.circleId);
    assert(circle, `[TangentLineToCircleParallel] circle ${this.circleId} not found on plane ${this.planeId} for line ${this.id}`);
    const circleRealization = circle.realize2D(world);
    assert(circleRealization, `[TangentLineToCircleParallel] circle.realize2D() returned null for ${this.circleId}`);
    
    // Step 3: Get reference line realization (can be from any plane)
    const refLine = world.getLine2D(this.referenceLineId);
    assert(refLine, `[TangentLineToCircleParallel] reference line ${this.referenceLineId} not found`);
    
    const refLineRealization = refLine.realize2D(world);
    assert(refLineRealization, `[TangentLineToCircleParallel] refLine.realize2D() returned null for ${this.referenceLineId}`);
    
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
    // Index 0: tangent closer to reference (between ref and center)
    // Index 1: tangent farther from reference (center between ref and tangent)
    
    // Determine signed distance to know which side of reference the center is on
    // signedDistance > 0: center is on +perpDirection side
    // signedDistance < 0: center is on -perpDirection side
    const signedDistance = a * center.x + b * center.y + c;
    
    let tangentPoint: Vector3;
    
    if (signedDistance > 0) {
      // Center on +perpDirection side: index 0 is closer (subtract), index 1 is farther (add)
      tangentPoint = this.tangentIndex === 0 ?
        new Vector3(
          center.x - radius * perpDirection.x,
          center.y - radius * perpDirection.y,
          1  // Finite point
        ) :
        new Vector3(
          center.x + radius * perpDirection.x,
          center.y + radius * perpDirection.y,
          1  // Finite point
        );
    } else {
      // Center on -perpDirection side: index 0 is closer (add), index 1 is farther (subtract)
      tangentPoint = this.tangentIndex === 0 ?
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
    }
    
    // DEBUG: Log parallel tangent calculation
    console.log('[TangentLine] Parallel to Line:', {
      center: { x: center.x, y: center.y },
      radius,
      refDirection: { x: refDirection.x, y: refDirection.y },
      perpDirection: { x: perpDirection.x, y: perpDirection.y },
      tangentPoint: { x: tangentPoint.x, y: tangentPoint.y },
      index: this.tangentIndex
    });
    
    // Step 10: Return infinite line through tangent point with reference direction
    // Tangent line is parallel to reference, so same direction
    return new Line2DRealization2D(
      tangentPoint,
      refDirection.clone(),
      true
    );
  }
}

/**
 * Segment2D - Finite line segment in 2D projection plane
 * 
 * Phase 22.5: Segments now extend Line2D base class
 * - Segments are bounded lines with endpoints
 * - Use Line2DRealization2D with point1/point2 fields set
 * - Stored in ProjectionPlane.lines Map alongside infinite lines
 * 
 * Design principles:
 * - Principle V: Segment stores DEFINITION (point IDs), realization stores computed coordinates
 * - Dependencies: Segment depends on both endpoint points
 * 
 * @see specs/001-dihedral-learning-mvp/data-model.md#line2d
 */

import { Vector3 } from 'three';
import { Line2D, Line2DRealization2D } from './Line';

export type Segment2DType = 'segment';  // Phase 22.5: Use 'segment' to match Line2DType

/**
 * Segment2DByPoints - Bounded line segment defined by two endpoint references
 * Phase 22.5: Now extends Line2D base class
 */
export class Segment2DByPoints extends Line2D {
  readonly type: 'segment' = 'segment';
  readonly point1Id: string;  // ID of first endpoint
  readonly point2Id: string;  // ID of second endpoint

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

  clone(): Segment2DByPoints {
    return new Segment2DByPoints(
      this.id,
      this.point1Id,
      this.point2Id,
      this.planeId,
      this.label
    );
  }

  /**
   * Calculate 2D realization - returns Line2DRealization2D for segment
   * 
   * Segments use two finite points:
   *   point1: start endpoint (z=1)
   *   point2: end endpoint (z=1)
   */
  realize2D(world: import('./World').World): Line2DRealization2D | null {
    // Get both endpoint realizations from world
    const plane = world.getProjectionPlaneById(this.planeId);
    const p1 = plane?.getPoint(this.point1Id);
    const p2 = plane?.getPoint(this.point2Id);
    const p1Realization = p1?.realize2D(world);
    const p2Realization = p2?.realize2D(world);

    if (!p1Realization || !p2Realization) {
      return null;  // Cannot compute segment without both endpoints
    }

    // Check if parent points are infeasible - propagate infeasibility
    if (!p1Realization.feasible || !p2Realization.feasible) {
      // Infeasible segment: arbitrary points
      const pos1 = new Vector3(0, 0, 1);
      const pos2 = new Vector3(1, 0, 1);
      return new Line2DRealization2D(pos1, pos2, false);
    }

    const pos1 = p1Realization.position;
    const pos2 = p2Realization.position;

    // Check for degenerate segment (endpoints coincident)
    if (pos1.distanceToSquared(pos2) < 1e-10) {
      return new Line2DRealization2D(pos1.clone(), pos2.clone(), false);
    }

    // Return segment: both point1 and point2 are finite (z=1)
    return new Line2DRealization2D(pos1.clone(), pos2.clone(), true);
  }
}

/**
 * Segment2DPointToLine - Perpendicular segment from point to line (Phase 74.1)
 * 
 * Defines segment from a point perpendicular to a line, endpoint on line at perpendicular foot.
 * Always bounded geometry with explicit endpoints.
 */
export class Segment2DPointToLine extends Line2D {
  readonly type: 'segment' = 'segment';
  readonly pointId: string;  // ID of the point
  readonly lineId: string;   // ID of the line (any Line2D subtype)

  constructor(
    id: string,
    pointId: string,
    lineId: string,
    planeId: string,
    label?: string
  ) {
    super(id, planeId, label);
    this.pointId = pointId;
    this.lineId = lineId;
  }

  clone(): Segment2DPointToLine {
    return new Segment2DPointToLine(
      this.id,
      this.pointId,
      this.lineId,
      this.planeId,
      this.label
    );
  }

  /**
   * Calculate 2D realization - perpendicular segment from point to line
   * 
   * Segment endpoints:
   *   point1: the given point (z=1)
   *   point2: perpendicular foot on line (z=1)
   */
  realize2D(world: import('./World').World): Line2DRealization2D | null {
    const plane = world.getProjectionPlaneById(this.planeId);
    const point = plane?.getPoint(this.pointId);
    const line = plane?.getLine(this.lineId);

    if (!point || !line) {
      return null;
    }

    const pointReal = point.realize2D(world);
    const lineReal = line.realize2D(world);

    if (!pointReal || !lineReal) {
      return null;
    }

    if (!pointReal.feasible || !lineReal.feasible) {
      // Infeasible segment
      const pos1 = new Vector3(0, 0, 1);
      const pos2 = new Vector3(1, 0, 1);
      return new Line2DRealization2D(pos1, pos2, false);
    }

    const P = pointReal.position;
    const L = lineReal.point1;
    const V = new Vector3().subVectors(lineReal.point2, lineReal.point1).normalize();

    // Compute perpendicular foot: F = L + ((P - L) · V) * V
    const PL = new Vector3().subVectors(P, L);
    const t = PL.dot(V);
    const foot = new Vector3().addVectors(L, V.multiplyScalar(t));
    foot.z = 1;  // Ensure homogeneous coordinate

    // Segment from point to foot
    return new Line2DRealization2D(P.clone(), foot, true);
  }
}

/**
 * Segment2DPointToCircleTangent - Tangent segment from point to circle (Phase 74.1)
 * 
 * Defines segment from external point tangent to circle, with endpoint at tangent touch point.
 * Two solutions exist if point is outside circle (index 0 or 1).
 */
export class Segment2DPointToCircleTangent extends Line2D {
  readonly type: 'segment' = 'segment';
  readonly pointId: string;    // ID of the point (must be outside circle)
  readonly circleId: string;   // ID of the circle
  readonly tangentIndex: 0 | 1; // Which tangent solution (0 or 1)

  constructor(
    id: string,
    pointId: string,
    circleId: string,
    tangentIndex: 0 | 1,
    planeId: string,
    label?: string
  ) {
    super(id, planeId, label);
    this.pointId = pointId;
    this.circleId = circleId;
    this.tangentIndex = tangentIndex;
  }

  clone(): Segment2DPointToCircleTangent {
    return new Segment2DPointToCircleTangent(
      this.id,
      this.pointId,
      this.circleId,
      this.tangentIndex,
      this.planeId,
      this.label
    );
  }

  /**
   * Calculate 2D realization - tangent segment from point to circle
   * 
   * Algorithm:
   * 1. Compute two tangent points from external point
   * 2. Select tangent based on tangentIndex
   * 3. Return segment from point to tangent touch point
   * 
   * Infeasible if point is inside or on circle.
   */
  realize2D(world: import('./World').World): Line2DRealization2D | null {
    const plane = world.getProjectionPlaneById(this.planeId);
    const point = plane?.getPoint(this.pointId);
    const circle = plane?.getCircle(this.circleId);

    if (!point || !circle) {
      return null;
    }

    const pointReal = point.realize2D(world);
    const circleReal = circle.realize2D(world);

    if (!pointReal || !circleReal) {
      return null;
    }

    if (!pointReal.feasible || !circleReal.feasible) {
      // Infeasible segment
      const pos1 = new Vector3(0, 0, 1);
      const pos2 = new Vector3(1, 0, 1);
      return new Line2DRealization2D(pos1, pos2, false);
    }

    const P = pointReal.position;
    const C = circleReal.center;
    const r = circleReal.getRadius();

    // Check if point is outside circle
    const distPC = P.distanceTo(C);
    if (distPC <= r + 1e-6) {
      // Point inside or on circle - no tangent exists
      const pos1 = new Vector3(0, 0, 1);
      const pos2 = new Vector3(1, 0, 1);
      return new Line2DRealization2D(pos1, pos2, false);
    }

    // Compute tangent length: L = sqrt(d² - r²)
    const tangentLength = Math.sqrt(distPC * distPC - r * r);

    // Angle from C to P
    const CP = new Vector3().subVectors(P, C);
    const angleCP = Math.atan2(CP.y, CP.x);

    // Angle of tangent: alpha = asin(r / d)
    const alpha = Math.asin(r / distPC);

    // Two tangent directions
    const angle1 = angleCP + alpha;
    const angle2 = angleCP - alpha;

    const angle = this.tangentIndex === 0 ? angle1 : angle2;

    // Tangent touch point: T = C + r * (cos(angle), sin(angle))
    const touchPoint = new Vector3(
      C.x + r * Math.cos(angle),
      C.y + r * Math.sin(angle),
      1
    );

    // Segment from point to touch point
    return new Line2DRealization2D(P.clone(), touchPoint, true);
  }
}

/**
 * Segment2DCircleToCircleExternal - External tangent segment between two circles (Phase 74.1)
 * 
 * Defines segment along external tangent to two circles, endpoints at tangent touch points.
 * Two solutions exist (tangentIndex 0 or 1), infeasible if circles overlap.
 */
export class Segment2DCircleToCircleExternal extends Line2D {
  readonly type: 'segment' = 'segment';
  readonly circle1Id: string;
  readonly circle2Id: string;
  readonly tangentIndex: 0 | 1;

  constructor(
    id: string,
    circle1Id: string,
    circle2Id: string,
    tangentIndex: 0 | 1,
    planeId: string,
    label?: string
  ) {
    super(id, planeId, label);
    this.circle1Id = circle1Id;
    this.circle2Id = circle2Id;
    this.tangentIndex = tangentIndex;
  }

  clone(): Segment2DCircleToCircleExternal {
    return new Segment2DCircleToCircleExternal(
      this.id,
      this.circle1Id,
      this.circle2Id,
      this.tangentIndex,
      this.planeId,
      this.label
    );
  }

  /**
   * Calculate 2D realization - segment along external tangent
   * Uses CircleGeometry.computeExternalTangents()
   */
  realize2D(world: import('./World').World): Line2DRealization2D | null {
    // Dynamic import to avoid circular dependencies
    const { computeExternalTangents } = require('../calculations/CircleGeometry');
    
    const plane = world.getProjectionPlaneById(this.planeId);
    const circle1 = plane?.getCircle(this.circle1Id);
    const circle2 = plane?.getCircle(this.circle2Id);

    if (!circle1 || !circle2) {
      return null;
    }

    const c1Real = circle1.realize2D(world);
    const c2Real = circle2.realize2D(world);

    if (!c1Real || !c2Real) {
      return null;
    }

    if (!c1Real.feasible || !c2Real.feasible) {
      const pos1 = new Vector3(0, 0, 1);
      const pos2 = new Vector3(1, 0, 1);
      return new Line2DRealization2D(pos1, pos2, false);
    }

    const tangents = computeExternalTangents(c1Real, c2Real);

    if (tangents.length === 0) {
      // No external tangents exist (circles overlap)
      const pos1 = new Vector3(0, 0, 1);
      const pos2 = new Vector3(1, 0, 1);
      return new Line2DRealization2D(pos1, pos2, false);
    }

    const selected = tangents[this.tangentIndex];
    if (!selected) {
      // Index out of range
      const pos1 = new Vector3(0, 0, 1);
      const pos2 = new Vector3(1, 0, 1);
      return new Line2DRealization2D(pos1, pos2, false);
    }

    // Segment from touch point on circle1 to touch point on circle2
    const touch1 = new Vector3(selected.touch1.x, selected.touch1.y, 1);
    const touch2 = new Vector3(selected.touch2.x, selected.touch2.y, 1);

    return new Line2DRealization2D(touch1, touch2, true);
  }
}

/**
 * Segment2DCircleToCircleInternal - Internal tangent segment between two circles (Phase 74.1)
 * 
 * Defines segment along internal (crossing) tangent to two circles.
 * Two solutions exist (tangentIndex 0 or 1), infeasible if circles overlap significantly.
 */
export class Segment2DCircleToCircleInternal extends Line2D {
  readonly type: 'segment' = 'segment';
  readonly circle1Id: string;
  readonly circle2Id: string;
  readonly tangentIndex: 0 | 1;

  constructor(
    id: string,
    circle1Id: string,
    circle2Id: string,
    tangentIndex: 0 | 1,
    planeId: string,
    label?: string
  ) {
    super(id, planeId, label);
    this.circle1Id = circle1Id;
    this.circle2Id = circle2Id;
    this.tangentIndex = tangentIndex;
  }

  clone(): Segment2DCircleToCircleInternal {
    return new Segment2DCircleToCircleInternal(
      this.id,
      this.circle1Id,
      this.circle2Id,
      this.tangentIndex,
      this.planeId,
      this.label
    );
  }

  realize2D(world: import('./World').World): Line2DRealization2D | null {
    const { computeInternalTangents } = require('../calculations/CircleGeometry');
    
    const plane = world.getProjectionPlaneById(this.planeId);
    const circle1 = plane?.getCircle(this.circle1Id);
    const circle2 = plane?.getCircle(this.circle2Id);

    if (!circle1 || !circle2) {
      return null;
    }

    const c1Real = circle1.realize2D(world);
    const c2Real = circle2.realize2D(world);

    if (!c1Real || !c2Real) {
      return null;
    }

    if (!c1Real.feasible || !c2Real.feasible) {
      const pos1 = new Vector3(0, 0, 1);
      const pos2 = new Vector3(1, 0, 1);
      return new Line2DRealization2D(pos1, pos2, false);
    }

    const tangents = computeInternalTangents(c1Real, c2Real);

    if (tangents.length === 0) {
      const pos1 = new Vector3(0, 0, 1);
      const pos2 = new Vector3(1, 0, 1);
      return new Line2DRealization2D(pos1, pos2, false);
    }

    const selected = tangents[this.tangentIndex];
    if (!selected) {
      const pos1 = new Vector3(0, 0, 1);
      const pos2 = new Vector3(1, 0, 1);
      return new Line2DRealization2D(pos1, pos2, false);
    }

    const touch1 = new Vector3(selected.touch1.x, selected.touch1.y, 1);
    const touch2 = new Vector3(selected.touch2.x, selected.touch2.y, 1);

    return new Line2DRealization2D(touch1, touch2, true);
  }
}

/**
 * Segment2DCircleToCirclePerpendicular - Perpendicular segment between circles (Phase 74.1)
 * 
 * Defines segment perpendicular to center line, at midpoint.
 * Always feasible for distinct circles.
 */
export class Segment2DCircleToCirclePerpendicular extends Line2D {
  readonly type: 'segment' = 'segment';
  readonly circle1Id: string;
  readonly circle2Id: string;

  constructor(
    id: string,
    circle1Id: string,
    circle2Id: string,
    planeId: string,
    label?: string
  ) {
    super(id, planeId, label);
    this.circle1Id = circle1Id;
    this.circle2Id = circle2Id;
  }

  clone(): Segment2DCircleToCirclePerpendicular {
    return new Segment2DCircleToCirclePerpendicular(
      this.id,
      this.circle1Id,
      this.circle2Id,
      this.planeId,
      this.label
    );
  }

  realize2D(world: import('./World').World): Line2DRealization2D | null {
    const { computePerpendicularLine } = require('../calculations/CircleGeometry');
    
    const plane = world.getProjectionPlaneById(this.planeId);
    const circle1 = plane?.getCircle(this.circle1Id);
    const circle2 = plane?.getCircle(this.circle2Id);

    if (!circle1 || !circle2) {
      return null;
    }

    const c1Real = circle1.realize2D(world);
    const c2Real = circle2.realize2D(world);

    if (!c1Real || !c2Real) {
      return null;
    }

    if (!c1Real.feasible || !c2Real.feasible) {
      const pos1 = new Vector3(0, 0, 1);
      const pos2 = new Vector3(1, 0, 1);
      return new Line2DRealization2D(pos1, pos2, false);
    }

    const lineResult = computePerpendicularLine(c1Real, c2Real);

    if (!lineResult) {
      // Circles have same center
      const pos1 = new Vector3(0, 0, 1);
      const pos2 = new Vector3(1, 0, 1);
      return new Line2DRealization2D(pos1, pos2, false);
    }

    // For segment, we need bounded endpoints
    // Use point on line and direction to create finite segment
    const P = lineResult.point;
    const V = lineResult.direction;
    
    // Create segment with arbitrary length (e.g., sum of radii)
    const r1 = c1Real.getRadius();
    const r2 = c2Real.getRadius();
    const segmentHalfLength = (r1 + r2) / 2;

    const point1 = new Vector3(
      P.x - V.x * segmentHalfLength,
      P.y - V.y * segmentHalfLength,
      1
    );
    const point2 = new Vector3(
      P.x + V.x * segmentHalfLength,
      P.y + V.y * segmentHalfLength,
      1
    );

    return new Line2DRealization2D(point1, point2, true);
  }
}

/**
 * Segment2DCircleToCircleThroughCenters - Segment through circle centers (Phase 74.1)
 * 
 * Defines segment connecting the two circle centers.
 * Always feasible for distinct circles.
 */
export class Segment2DCircleToCircleThroughCenters extends Line2D {
  readonly type: 'segment' = 'segment';
  readonly circle1Id: string;
  readonly circle2Id: string;

  constructor(
    id: string,
    circle1Id: string,
    circle2Id: string,
    planeId: string,
    label?: string
  ) {
    super(id, planeId, label);
    this.circle1Id = circle1Id;
    this.circle2Id = circle2Id;
  }

  clone(): Segment2DCircleToCircleThroughCenters {
    return new Segment2DCircleToCircleThroughCenters(
      this.id,
      this.circle1Id,
      this.circle2Id,
      this.planeId,
      this.label
    );
  }

  realize2D(world: import('./World').World): Line2DRealization2D | null {
    const { computeThroughCentersLine } = require('../calculations/CircleGeometry');
    
    const plane = world.getProjectionPlaneById(this.planeId);
    const circle1 = plane?.getCircle(this.circle1Id);
    const circle2 = plane?.getCircle(this.circle2Id);

    if (!circle1 || !circle2) {
      return null;
    }

    const c1Real = circle1.realize2D(world);
    const c2Real = circle2.realize2D(world);

    if (!c1Real || !c2Real) {
      return null;
    }

    if (!c1Real.feasible || !c2Real.feasible) {
      const pos1 = new Vector3(0, 0, 1);
      const pos2 = new Vector3(1, 0, 1);
      return new Line2DRealization2D(pos1, pos2, false);
    }

    const lineResult = computeThroughCentersLine(c1Real, c2Real);

    if (!lineResult) {
      // Circles have same center
      const pos1 = new Vector3(0, 0, 1);
      const pos2 = new Vector3(1, 0, 1);
      return new Line2DRealization2D(pos1, pos2, false);
    }

    // Segment from center1 to center2
    const center1 = new Vector3(c1Real.center.x, c1Real.center.y, 1);
    const center2 = new Vector3(c2Real.center.x, c2Real.center.y, 1);

    return new Line2DRealization2D(center1, center2, true);
  }
}

// Export legacy type alias for backward compatibility during migration
export type Segment2D = Segment2DByPoints;

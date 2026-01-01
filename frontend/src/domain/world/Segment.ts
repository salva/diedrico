/**
 * Segment2D - Finite line segment in 2D projection plane
 * 
 * Segments are defined by two endpoint references. Unlike infinite lines,
 * segments render ONLY between their endpoints.
 * 
 * Design principles:
 * - Principle V: Segment stores DEFINITION (point IDs), realization stores computed coordinates
 * - Dependencies: Segment depends on both endpoint points
 * 
 * @see specs/001-dihedral-learning-mvp/data-model.md#segment2d
 */

import { Vector3 } from 'three';

export type Segment2DType = 'by-points';

/**
 * Segment2DRealization - Stores computed endpoints for a Segment2D
 * Contains ONLY numeric data. Structural information (id, planeId, pointIds) stays in domain objects.
 */
export class Segment2DRealization {
  point1: Vector3;  // First endpoint in plane coordinates (u, v, 1)
  point2: Vector3;  // Second endpoint in plane coordinates (u, v, 1)

  constructor(point1: Vector3, point2: Vector3) {
    this.point1 = point1;
    this.point2 = point2;
  }

  /**
   * Get first endpoint
   */
  getPoint1(): Vector3 {
    return this.point1;
  }

  /**
   * Get second endpoint
   */
  getPoint2(): Vector3 {
    return this.point2;
  }

  /**
   * Calculate segment length in plane coordinates
   */
  getLength(): number {
    return this.point1.distanceTo(this.point2);
  }
}

/**
 * Base Segment2D class - represents the rule/definition of a segment
 */
export abstract class Segment2D {
  id: string;  // Unique identifier (required)
  abstract readonly type: Segment2DType;
  label?: string;
  planeId: string;  // Which projection plane this segment belongs to

  constructor(
    id: string,
    planeId: string,
    label?: string
  ) {
    this.id = id;
    this.planeId = planeId;
    this.label = label;
  }

  /**
   * Clone this segment
   */
  abstract clone(): Segment2D;

  /**
   * Calculate the 2D realization (endpoints) for this segment
   * Returns endpoints in the projection plane's intrinsic coordinates
   * @param getPoint Function to retrieve point positions by ID
   */
  abstract realize2D(getPoint: (id: string) => Vector3 | null): Segment2DRealization | null;
}

/**
 * Segment2DByPoints - Segment defined by two endpoint references
 * The rule is: "segment from point1 to point2"
 */
export class Segment2DByPoints extends Segment2D {
  readonly type: 'by-points' = 'by-points';
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
   * Calculate 2D realization - get endpoints from point realizations
   */
  realize2D(getPoint: (id: string) => Vector3 | null): Segment2DRealization | null {
    // Get both endpoint positions
    const p1 = getPoint(this.point1Id);
    const p2 = getPoint(this.point2Id);

    if (!p1 || !p2) {
      return null;  // Cannot compute segment without both endpoints
    }

    // Check for degenerate segment (endpoints coincident)
    if (p1.distanceToSquared(p2) < 1e-10) {
      console.warn(`Segment ${this.id}: endpoints are coincident`);
      return null;  // Degenerate segment
    }

    return new Segment2DRealization(p1.clone(), p2.clone());
  }
}

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
 * @deprecated Phase 22.5: Use Line2DRealization2D instead
 * Kept temporarily for backward compatibility during migration
 */
export class Segment2DRealization2D {
  point1: Vector3;
  point2: Vector3;
  feasible: boolean;

  constructor(point1: Vector3, point2: Vector3, feasible: boolean = true) {
    this.point1 = point1;
    this.point2 = point2;
    this.feasible = feasible;
  }

  getPoint1(): Vector3 {
    return this.point1;
  }

  getPoint2(): Vector3 {
    return this.point2;
  }

  getLength(): number {
    return this.point1.distanceTo(this.point2);
  }
}

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
    const p1Realization = world.getPoint2DRealization(this.point1Id);
    const p2Realization = world.getPoint2DRealization(this.point2Id);

    if (!p1Realization || !p2Realization) {
      return null;  // Cannot compute segment without both endpoints
    }

    // Check if parent points are infeasible - propagate infeasibility
    if (!p1Realization.feasible || !p2Realization.feasible) {
      console.warn('[Segment2DByPoints] Parent point is infeasible, marking segment as infeasible');
      // Infeasible segment: arbitrary points
      const p1 = new Vector3(0, 0, 1);
      const p2 = new Vector3(1, 0, 1);
      return new Line2DRealization2D(p1, p2, false);
    }

    const p1 = p1Realization.position;
    const p2 = p2Realization.position;

    // Check for degenerate segment (endpoints coincident)
    if (p1.distanceToSquared(p2) < 1e-10) {
      console.warn(`Segment ${this.id}: endpoints are coincident`);
      return new Line2DRealization2D(p1.clone(), p2.clone(), false);
    }

    // Return segment: both point1 and point2 are finite (z=1)
    return new Line2DRealization2D(p1.clone(), p2.clone(), true);
  }
}

// Export legacy type alias for backward compatibility during migration
export type Segment2D = Segment2DByPoints;

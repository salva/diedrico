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
 */

import type { ProjectionElementRealizationContext } from './projectionPlane/ProjectionPlaneContext';
import { Vector3 } from 'three';
import { Line2D, Line2DRealization2D } from './Line';

export const SEGMENT_2D_TYPE = {
  SEGMENT: 'segment',
} as const;
export type Segment2DType = typeof SEGMENT_2D_TYPE[keyof typeof SEGMENT_2D_TYPE];  // Phase 22.5: Use 'segment' to match Line2DType

/**
 * Segment2DByPoints - Bounded line segment defined by two endpoint references
 * Phase 22.5: Now extends Line2D base class
 */
export class Segment2DByPoints extends Line2D {
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

  getDependencies(): string[] {
    return [this.point1Id, this.point2Id];
  }
  
  /**
   * Override isBounded() - segments are bounded by definition
   */
  override isBounded(): boolean {
    return true;  // Segments are always bounded
  }

  /**
   * Calculate 2D realization - returns Line2DRealization2D for segment
   * 
   * Segments use two finite points:
   *   point1: start endpoint (z=1)
   *   point2: end endpoint (z=1)
   * 
   * Phase 76: Always returns realization (never null). Uses feasible flag for geometric failures.
   */
  realize2D(world: ProjectionElementRealizationContext): Line2DRealization2D {
    // Get both endpoint realizations from world
    const plane = world.getProjectionPlaneById(this.planeId);
    if (!plane) {
      throw new Error(`[Segment2DByPoints] Plane ${this.planeId} not found for segment ${this.id}`);
    }
    const p1 = plane.getPoint(this.point1Id);
    const p2 = plane.getPoint(this.point2Id);
    
    if (!p1) {
      throw new Error(`[Segment2DByPoints] Point ${this.point1Id} not found in plane ${this.planeId} for segment ${this.id}`);
    }
    if (!p2) {
      throw new Error(`[Segment2DByPoints] Point ${this.point2Id} not found in plane ${this.planeId} for segment ${this.id}`);
    }
    
    const p1Realization = p1.realize2D(world);
    const p2Realization = p2.realize2D(world);

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

// Public alias retained for call sites that use the shorter domain name.
export type Segment2D = Segment2DByPoints;

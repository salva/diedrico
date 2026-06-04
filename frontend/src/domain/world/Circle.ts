/**
 * Circle2D - Geometric circle in 2D projection plane
 * 
 * Circles can be defined by:
 * - Center point + radius (most common)
 * - Center point + point on circumference
 * - Three points on circumference
 * 
 * Design principles:
 * - Principle V: Circle stores DEFINITION (point IDs, radius), realization stores computed geometry
 * - Dependencies: Circle depends on center point (and optionally other points)
 * 
 */

import type { ProjectionElementRealizationContext } from './projectionPlane/ProjectionPlaneContext';
import { Vector3 } from 'three';
import { Realization } from './Realization';
import { Element2D } from './Element2D';

export const CIRCLE_2D_TYPE = {
  BY_CENTER_AND_POINT: 'by-center-and-point',
  BY_THREE_POINTS: 'by-three-points',
} as const;
export type Circle2DType = typeof CIRCLE_2D_TYPE[keyof typeof CIRCLE_2D_TYPE];

/**
 * Circle2DRealization2D - Stores computed geometry for a Circle2D
 * 
 * @sealed - This class must not be subclassed
 * 
 * Architectural principle: Realization classes contain ONLY geometric data.
 * All behavioral differences belong in domain classes (Circle2DByCenterAndPoint,
 * Circle2DByThreePoints, etc.), not in realization classes. Type distinction happens
 * at domain level, not realization level.
 * 
 * CRITICAL: Stores radius as a VECTOR (not scalar) pointing from center to edge point.
 * This defines angle 0 for the circle and preserves the construction.
 * 
 * - center: Center point in plane coordinates (u, v, 1)
 * - radiusVector: Vector from center to edge point (u, v, 0) - defines radius and angle 0
 * 
 * Benefits:
 * - Scalar radius = radiusVector.length() (computed when needed, no normalization)
 * - Angle 0 = direction of radiusVector (preserves construction semantics)
 * - Transform-friendly: both center and radiusVector transform consistently
 * 
 * Contains ONLY numeric data. Structural information (id, planeId, pointIds) stays in domain objects.
 */
export class Circle2DRealization2D extends Realization {
  center: Vector3;        // Center in plane coordinates (u, v, 1) - finite point
  radiusVector: Vector3;  // Vector from center to edge point (u, v, 0) - defines radius and angle 0

  constructor(center: Vector3, radiusVector: Vector3, feasible: boolean = true) {
    super(feasible);
    this.center = center;
    this.radiusVector = radiusVector;
  }

  /**
   * Get radius as scalar (computed from vector length - not cached)
   */
  getRadius(): number {
    return this.radiusVector.length();
  }

  /**
   * Get squared radius (cheaper than getRadius() - no sqrt)
   */
  getRadiusSquared(): number {
    return this.radiusVector.lengthSq();
  }
}

/**
 * Base Circle2D class - represents the rule/definition of a circle
 * Extends Element2D to provide common properties and interface for all 2D elements
 */
export abstract class Circle2D extends Element2D {
  constructor(id: string, planeId: string, label?: string) {
    super(id, planeId, label);
  }

  abstract clone(): Circle2D;

  /**
   * Calculate 2D realization - compute center and radius
   * @param world World instance to access element realizations
   */
  abstract realize2D(world: ProjectionElementRealizationContext): Circle2DRealization2D | null;
}

/**
 * Circle2DByCenterAndPoint - Circle defined by center and point on circumference
 * The rule is: "circle with center at centerId passing through pointId"
 * Radius is computed as distance from center to circumference point.
 */
export class Circle2DByCenterAndPoint extends Circle2D {
  readonly centerPointId: string;        // ID of center point
  readonly circumferencePointId: string; // ID of point on circumference

  constructor(
    id: string,
    centerPointId: string,
    circumferencePointId: string,
    planeId: string,
    label?: string
  ) {
    super(id, planeId, label);
    this.centerPointId = centerPointId;
    this.circumferencePointId = circumferencePointId;
  }

  clone(): Circle2DByCenterAndPoint {
    return new Circle2DByCenterAndPoint(
      this.id,
      this.centerPointId,
      this.circumferencePointId,
      this.planeId,
      this.label
    );
  }

  getDependencies(): string[] {
    return [this.centerPointId, this.circumferencePointId];
  }

  /**
   * Calculate 2D realization - compute radius vector from center to circumference point
   * 
   * The edge point (circumferencePointId) defines:
   * - Radius magnitude: distance from center
   * - Angle 0: direction from center to edge point
   * 
   * Phase 76: Always returns realization (never null). Uses feasible flag for geometric failures.
   */
  realize2D(world: ProjectionElementRealizationContext): Circle2DRealization2D {
    // Get both point realizations from world
    const plane = world.getProjectionPlaneById(this.planeId);
    if (!plane) {
      throw new Error(`[Circle2DByCenterAndPoint] Plane ${this.planeId} not found for circle ${this.id}`);
    }
    const centerPoint = plane.getPoint(this.centerPointId);
    const circumferencePoint = plane.getPoint(this.circumferencePointId);
    
    // Missing points are internal errors (fail fast)
    if (!centerPoint) {
      throw new Error(`[Circle2DByCenterAndPoint] Center point ${this.centerPointId} not found on plane ${this.planeId} for circle ${this.id}`);
    }
    if (!circumferencePoint) {
      throw new Error(`[Circle2DByCenterAndPoint] Circumference point ${this.circumferencePointId} not found on plane ${this.planeId} for circle ${this.id}`);
    }
    
    const centerRealization = centerPoint.realize2D(world);
    const circumferenceRealization = circumferencePoint.realize2D(world);

    // Check if parent points are infeasible - propagate infeasibility
    if (!centerRealization.feasible || !circumferenceRealization.feasible) {
      // Return infeasible circle with dummy radius vector
      return new Circle2DRealization2D(new Vector3(0, 0, 1), new Vector3(1, 0, 0), false);
    }

    // Compute radius vector: edge_point - center
    const radiusVector = circumferenceRealization.position.clone().sub(centerRealization.position);
    radiusVector.z = 0;  // Vectors have z=0 in homogeneous coordinates

    // Check for degenerate circle (center coincides with circumference point)
    if (radiusVector.lengthSq() < 1e-20) {  // Use squared length - cheaper than length
      return new Circle2DRealization2D(
        centerRealization.position.clone(),
        new Vector3(1, 0, 0),  // Fallback radius vector
        false
      );
    }

    return new Circle2DRealization2D(centerRealization.position.clone(), radiusVector, true);
  }
}

/**
 * Circle2DByThreePoints - Circle passing through three points
 * The rule is: "circle through point1Id, point2Id, and point3Id"
 * Center and radius computed from circumcircle of the three points.
 * 
 * Note: This is a more complex construction and may be implemented in a future phase.
 * For MVP, we focus on simpler circle definitions.
 */
export class Circle2DByThreePoints extends Circle2D {
  readonly point1Id: string;
  readonly point2Id: string;
  readonly point3Id: string;

  constructor(
    id: string,
    point1Id: string,
    point2Id: string,
    point3Id: string,
    planeId: string,
    label?: string
  ) {
    super(id, planeId, label);
    this.point1Id = point1Id;
    this.point2Id = point2Id;
    this.point3Id = point3Id;
  }

  getDependencies(): string[] {
    return [this.point1Id, this.point2Id, this.point3Id];
  }

  clone(): Circle2DByThreePoints {
    return new Circle2DByThreePoints(
      this.id,
      this.point1Id,
      this.point2Id,
      this.point3Id,
      this.planeId,
      this.label
    );
  }

  /**
   * Calculate 2D realization - compute circumcircle through three points
   * 
   * The first point (point1Id) defines angle 0 for the resulting circle.
   * 
   * Algorithm:
   * 1. Find perpendicular bisectors of two sides
   * 2. Find intersection = center
   * 3. Radius vector = point1 - center (defines both radius and angle 0)
   * 
   * Phase 76: Always returns realization (never null). Uses feasible flag for geometric failures.
   */
  realize2D(world: ProjectionElementRealizationContext): Circle2DRealization2D {
    // Get all three point realizations from world
    const plane = world.getProjectionPlaneById(this.planeId);
    if (!plane) {
      throw new Error(`[Circle2DByThreePoints] Plane ${this.planeId} not found for circle ${this.id}`);
    }
    const point1 = plane.getPoint(this.point1Id);
    const point2 = plane.getPoint(this.point2Id);
    const point3 = plane.getPoint(this.point3Id);
    
    // Missing points are internal errors (fail fast)
    if (!point1) {
      throw new Error(`[Circle2DByThreePoints] Point1 ${this.point1Id} not found on plane ${this.planeId} for circle ${this.id}`);
    }
    if (!point2) {
      throw new Error(`[Circle2DByThreePoints] Point2 ${this.point2Id} not found on plane ${this.planeId} for circle ${this.id}`);
    }
    if (!point3) {
      throw new Error(`[Circle2DByThreePoints] Point3 ${this.point3Id} not found on plane ${this.planeId} for circle ${this.id}`);
    }
    
    const p1Realization = point1.realize2D(world);
    const p2Realization = point2.realize2D(world);
    const p3Realization = point3.realize2D(world);

    // Check if parent points are infeasible - propagate infeasibility
    if (!p1Realization.feasible || !p2Realization.feasible || !p3Realization.feasible) {
      return new Circle2DRealization2D(new Vector3(0, 0, 1), new Vector3(1, 0, 0), false);
    }

    const p1 = p1Realization.position;
    const p2 = p2Realization.position;
    const p3 = p3Realization.position;

    // Check for collinearity (degenerate case)
    // Use cross product: if (p2-p1) × (p3-p1) ≈ 0, points are collinear
    const v12 = p2.clone().sub(p1);
    const v13 = p3.clone().sub(p1);
    
    // In 2D, cross product magnitude is |x1*y2 - x2*y1|
    const crossMag = Math.abs(v12.x * v13.y - v12.y * v13.x);
    if (crossMag < 1e-10) {
      return new Circle2DRealization2D(p1.clone(), new Vector3(1, 0, 0), false);  // Infeasible circle
    }

    // Calculate circumcenter using perpendicular bisectors
    // Midpoint of p1-p2: m12 = (p1 + p2) / 2
    const m12 = p1.clone().add(p2).multiplyScalar(0.5);
    // Midpoint of p2-p3: m23 = (p2 + p3) / 2
    const m23 = p2.clone().add(p3).multiplyScalar(0.5);

    // Direction perpendicular to p1-p2: rotate 90° = (-dy, dx)
    const dir12 = new Vector3(-v12.y, v12.x, 0);
    
    // Direction p2-p3
    const v23 = p3.clone().sub(p2);
    // Direction perpendicular to p2-p3
    const dir23 = new Vector3(-v23.y, v23.x, 0);

    // Find intersection of two perpendicular bisectors
    // Line 1: m12 + t * dir12
    // Line 2: m23 + s * dir23
    // Solve: m12 + t * dir12 = m23 + s * dir23
    
    // This becomes: t * dir12 - s * dir23 = m23 - m12
    // In matrix form: [dir12 -dir23] * [t; s] = [m23 - m12]
    
    const diff = m23.clone().sub(m12);
    
    // Solve 2x2 system using Cramer's rule
    const det = dir12.x * (-dir23.y) - dir12.y * (-dir23.x);
    
    if (Math.abs(det) < 1e-10) {
      // Lines are parallel (should not happen if points are not collinear)
      return new Circle2DRealization2D(p1.clone(), new Vector3(1, 0, 0), false);
    }
    
    const t = (diff.x * (-dir23.y) - diff.y * (-dir23.x)) / det;
    
    // Calculate center
    const center = m12.clone().add(dir12.clone().multiplyScalar(t));
    center.z = 1;  // Center is a finite point
    
    // Calculate radius vector from center to point1 (defines angle 0)
    const radiusVector = p1.clone().sub(center);
    radiusVector.z = 0;  // Vectors have z=0
    
    return new Circle2DRealization2D(center, radiusVector, true);
  }
}

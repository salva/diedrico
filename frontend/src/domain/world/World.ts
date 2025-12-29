/**
 * World - Root container for all geometric elements
 * 
 * The World class stores all geometric entities (points, lines, segments, circles, planes, etc.)
 * in the dihedral drawing system. It serves as the central data structure that holds the 
 * complete state of a construction.
 * 
 * Design principles (from Constitution):
 * - Principle I: Domain layer - pure business logic, no UI dependencies
 * - Principle V: All points stored in plane intrinsic coordinates (homogeneous)
 * 
 * @see specs/001-dihedral-learning-mvp/data-model.md#world-entity
 */

import { Point2D, FreePoint2D, Point2DRealization } from './Point';
import { Plane3D } from './Plane';

export class World {
  private points: Map<string, Point2D>;
  private planes: Map<string, Plane3D>;
  private pointRealizations: Map<string, Point2DRealization>;  // Cache of computed coordinates
  private nextId: number;

  // Fixed elements (always present)
  originPoint?: [number, number, number, number];  // O at (0,0,0) [x, y, z, 1]
  hingeLineHV?: {         // HL_HV along X-axis
    start: [number, number, number, number];
    end: [number, number, number, number];
  };

  constructor() {
    this.points = new Map();
    this.planes = new Map();
    this.pointRealizations = new Map();
    this.nextId = 1;
    
    // Initialize fixed elements
    this.initializeFixedElements();
  }

  /**
   * Initialize fixed elements: P_V, P_H, origin O, and hinge line HL_HV
   * These are always present and cannot be deleted.
   */
  initializeFixedElements(): void {
    // Create P_H and P_V projection planes
    const planeH = Plane3D.createPH();
    planeH.id = 'plane_H';
    this.planes.set('plane_H', planeH);

    const planeV = Plane3D.createPV();
    planeV.id = 'plane_V';
    this.planes.set('plane_V', planeV);

    // Origin projections O_H and O_V
    // These are the 2D projections of the 3D origin point O
    // O_H on P_H: local coordinates (0, -200) — on the hinge line
    // O_V on P_V: local coordinates (0, 200) — on the hinge line
    const pointOH = new FreePoint2D([0, -200, 1], planeH);
    pointOH.id = 'O_H';
    pointOH.locked = true;
    this.points.set('O_H', pointOH);

    const pointOV = new FreePoint2D([0, 200, 1], planeV);
    pointOV.id = 'O_V';
    pointOV.locked = true;
    this.points.set('O_V', pointOV);

    // Origin point O at (0,0,0) in 3D space is defined by O_H and O_V
    this.originPoint = [0, 0, 0, 1];

    // Hinge line HL_HV along X-axis
    // Extends from -∞ to +∞, but we'll use large finite values for rendering
    this.hingeLineHV = {
      start: [-10000, 0, 0, 1],
      end: [10000, 0, 0, 1]
    };
  }

  /**
   * Add a point to the world and compute its initial realization
   * @param point Point to add
   * @returns The added point with assigned ID if it didn't have one
   */
  addPoint(point: Point2D): Point2D {
    if (!point.id) {
      point.id = `point_${this.nextId++}`;
    }
    this.points.set(point.id, point);
    
    // Create initial realization
    this.realizePoint(point);
    
    return point;
  }

  /**
   * Compute and cache the realization (coordinates) for a point
   */
  private realizePoint(point: Point2D): void {
    if (!point.id) return;
    
    let coordinates: [number, number, number];
    
    if (point instanceof FreePoint2D) {
      // Free point: coordinates are directly from its position
      coordinates = point.position;
    } else {
      // Intersection point: would need to compute intersection
      // For now, return origin (this will be implemented properly later)
      coordinates = [0, 0, 1];
    }
    
    const realization = new Point2DRealization(
      point.id,
      coordinates,
      point.planeId
    );
    
    this.pointRealizations.set(point.id, realization);
  }

  /**
   * Get the realization (computed coordinates) for a point
   */
  getPointRealization(pointId: string): Point2DRealization | undefined {
    return this.pointRealizations.get(pointId);
  }

  /**
   * Remove a point from the world
   * @param id Point ID to remove
   * @returns true if point was removed, false if not found
   */
  removePoint(id: string): boolean {
    this.pointRealizations.delete(id);  // Remove cached realization
    return this.points.delete(id);
  }

  /**
   * Get a point by ID
   * @param id Point ID
   * @returns Point if found, undefined otherwise
   */
  getPointById(id: string): Point2D | undefined {
    return this.points.get(id);
  }

  /**
   * Get all points in the world
   * @returns Array of all points
   */
  getAllPoints(): Point[] {
    return Array.from(this.points.values());
  }

  /**
   * Clear all elements from the world
   */
  clear(): void {
    this.points.clear();
    this.planes.clear();
    this.nextId = 1;
    // Reinitialize fixed elements
    this.initializeFixedElements();
  }

  /**
   * Get total number of points
   */
  getPointCount(): number {
    return this.points.size;
  }

  /**
   * Add a plane to the world
   */
  addPlane(plane: Plane3D): Plane3D {
    if (!plane.id) {
      plane.id = `plane_${this.nextId++}`;
    }
    this.planes.set(plane.id, plane);
    return plane;
  }

  /**
   * Get a plane by ID
   */
  getPlaneById(id: string): Plane3D | undefined {
    return this.planes.get(id);
  }

  /**
   * Get all planes
   */
  getAllPlanes(): Plane3D[] {
    return Array.from(this.planes.values());
  }

  /**
   * Get P_H plane
   */
  getPH(): Plane3D | undefined {
    return this.planes.get('plane_H');
  }

  /**
   * Get P_V plane
   */
  getPV(): Plane3D | undefined {
    return this.planes.get('plane_V');
  }
}

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

import { Point } from './Point';

export class World {
  private points: Map<string, Point>;
  private nextId: number;

  constructor() {
    this.points = new Map();
    this.nextId = 1;
  }

  /**
   * Add a point to the world
   * @param point Point to add
   * @returns The added point with assigned ID if it didn't have one
   */
  addPoint(point: Point): Point {
    if (!point.id) {
      point.id = `point_${this.nextId++}`;
    }
    this.points.set(point.id, point);
    return point;
  }

  /**
   * Remove a point from the world
   * @param id Point ID to remove
   * @returns true if point was removed, false if not found
   */
  removePoint(id: string): boolean {
    return this.points.delete(id);
  }

  /**
   * Get a point by ID
   * @param id Point ID
   * @returns Point if found, undefined otherwise
   */
  getPointById(id: string): Point | undefined {
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
    this.nextId = 1;
  }

  /**
   * Get total number of points
   */
  getPointCount(): number {
    return this.points.size;
  }
}

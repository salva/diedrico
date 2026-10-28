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
 * World is storage-only. It owns geometry maps and exposes direct storage
 * mutations/lookups; cross-storage queries live in explicit lookup helpers.
 */

import { Vector4 } from 'three';
import { HingeLine } from './HingeLine';
import { Plane3D } from './Plane';
import { ProjectionPlane } from './projectionPlane/ProjectionPlane';

import type { Point3D } from './Point3D';
import type { Line3D } from './Line3D';
import type { Segment3D } from './Segment3D';

export class World {
  private hingeLines: Map<string, HingeLine>;
  private planes3D: Map<string, Plane3D>;        // All 3D planes (base P_H, P_V + user-created)
  private projectionPlanes: Map<string, ProjectionPlane>;  // All projection planes (base + auxiliary)
  
  private points3D: Map<string, Point3D>;        // User-created 3D points from projections
  private lines3D: Map<string, Line3D>;          // User-created 3D lines from projections
  private segments3D: Map<string, Segment3D>;    // User-created 3D segments
  
  // Fixed elements (always present)
  originPoint?: Vector4;  // O at (0,0,0) in 3D space

  constructor() {
    this.hingeLines = new Map();
    this.planes3D = new Map();
    this.projectionPlanes = new Map();
    
    this.points3D = new Map();
    this.lines3D = new Map();
    this.segments3D = new Map();
    
    // Initialization is an explicit application use case so command history
    // orchestration stays outside this domain storage container.
  }

  /**
   * Clear all elements (for loading projects)
   * Resets world to initial state with only fixed elements
   */
  clear(): void {
    for (const plane of this.projectionPlanes.values()) {
      plane.clear();
    }
    
    this.points3D.clear();
    this.lines3D.clear();
    this.segments3D.clear();
    this.planes3D.clear();
    this.projectionPlanes.clear();
    this.hingeLines.clear();
    this.originPoint = undefined;
  }
  putProjectionPlane(plane: ProjectionPlane): void {
    this.projectionPlanes.set(plane.id, plane);
  }

  deleteProjectionPlane(id: string): boolean {
    return this.projectionPlanes.delete(id);
  }

  putHingeLine(hingeLine: HingeLine): void {
    this.hingeLines.set(hingeLine.id, hingeLine);
  }

  deleteHingeLine(id: string): boolean {
    return this.hingeLines.delete(id);
  }

  /**
   * Get projection plane by ID
   */
  getProjectionPlaneById(id: string): ProjectionPlane | undefined {
    return this.projectionPlanes.get(id);
  }

  hasProjectionPlane(id: string): boolean {
    return this.projectionPlanes.has(id);
  }

  /**
   * Get all projection planes
   * @returns Array of all ProjectionPlane objects
   */
  getAllProjectionPlanes(): ProjectionPlane[] {
    return Array.from(this.projectionPlanes.values());
  }

  /**
   * Get all 3D planes (base + user-created)
   */
  getAllPlanes(): Plane3D[] {
    return Array.from(this.planes3D.values());
  }

  // ========================================
  // HingeLine Methods
  // ========================================

  /**
   * Get a hinge line by ID
   */
  getHingeLineById(id: string): HingeLine | undefined {
    return this.hingeLines.get(id);
  }

  /**
   * Get all hinge lines
   */
  getAllHingeLines(): HingeLine[] {
    return Array.from(this.hingeLines.values());
  }

  // ========================================
  // 3D Element Storage and Access
  // ========================================

  /**
   * Get 3D point by ID
   */
  get3DPoint(id: string): Point3D | undefined {
    return this.points3D.get(id);
  }

  /**
   * Get all 3D points
   */
  getAll3DPoints(): Point3D[] {
    return Array.from(this.points3D.values());
  }

  /**
   * Get 3D line by ID
   */
  get3DLine(id: string): Line3D | undefined {
    return this.lines3D.get(id);
  }

  /**
   * Get all 3D lines
   */
  getAll3DLines(): Line3D[] {
    return Array.from(this.lines3D.values());
  }

  /**
   * Get 3D segment by ID
   */
  get3DSegment(id: string): Segment3D | undefined {
    return this.segments3D.get(id);
  }

  /**
   * Get all 3D segments
   */
  getAll3DSegments(): Segment3D[] {
    return Array.from(this.segments3D.values());
  }

  /**
   * Get 3D plane by ID (base or user-created)
   */
  get3DPlane(id: string): Plane3D | undefined {
    return this.planes3D.get(id);
  }

  putPoint3D(point: Point3D): void {
    this.points3D.set(point.id, point);
  }

  deletePoint3D(id: string): boolean {
    return this.points3D.delete(id);
  }

  putLine3D(line: Line3D): void {
    this.lines3D.set(line.id, line);
  }

  deleteLine3D(id: string): boolean {
    return this.lines3D.delete(id);
  }

  putSegment3D(segment: Segment3D): void {
    this.segments3D.set(segment.id, segment);
  }

  deleteSegment3D(id: string): boolean {
    return this.segments3D.delete(id);
  }

  putPlane3D(plane: Plane3D): void {
    this.planes3D.set(plane.id, plane);
  }

  deletePlane3D(id: string): boolean {
    return this.planes3D.delete(id);
  }

}

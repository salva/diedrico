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

import { Vector3, Vector4 } from 'three';
import { Point2D, FreePoint2D, Point2DRealization, Point3DRealization } from './Point';
import { Line2D, Line2DRealization } from './Line';
import { Segment2D, Segment2DRealization } from './Segment';
import { Circle2D, Circle2DRealization } from './Circle';
import { Guide2D, Guide2DRealization } from './Guide';
import { Plane3D } from './Plane';
import { ProjectionPlane, BaseProjectionPlane, ProjectionPlaneRealization2D, ProjectionPlaneRealization3D } from './ProjectionPlane';
import { ProcessTree } from '../processTree/ProcessTree';

export class World {
  private points: Map<string, Point2D>;
  private lines: Map<string, Line2D>;
  private segments: Map<string, Segment2D>;
  private circles: Map<string, Circle2D>;
  private guides: Map<string, Guide2D>;
  private planes: Map<string, Plane3D>;
  projectionPlanes: Map<string, ProjectionPlane>;  // 2D projection planes (public for rendering)
  
  // Construction history
  private processTree: ProcessTree;
  
  // Realization caches - organized by object type for extensibility
  private pointRealizations2D: Map<string, Point2DRealization>;  // Computed 2D point positions
  private pointRealizations3D: Map<string, Point3DRealization>;  // Computed 3D point positions
  private lineRealizations2D: Map<string, Line2DRealization>;    // Computed 2D line equations
  private segmentRealizations2D: Map<string, Segment2DRealization>;  // Computed 2D segment endpoints
  private circleRealizations2D: Map<string, Circle2DRealization>;  // Computed 2D circle geometry
  private guideRealizations2D: Map<string, Guide2DRealization>;  // Computed 2D guide line geometry
  private projectionPlaneRealizations2D: Map<string, ProjectionPlaneRealization2D>;  // Computed plane 2D transforms
  private projectionPlaneRealizations3D: Map<string, ProjectionPlaneRealization3D>;  // Computed plane 3D transforms
  
  private nextId: number;

  // Fixed elements (always present)
  originPoint?: Vector4;  // O at (0,0,0) in 3D space
  hingeLineHV?: {         // HL_HV along X-axis
    start: Vector4;
    end: Vector4;
  };

  constructor() {
    this.points = new Map();
    this.lines = new Map();
    this.segments = new Map();
    this.circles = new Map();
    this.guides = new Map();
    this.planes = new Map();
    this.projectionPlanes = new Map();
    this.pointRealizations2D = new Map();
    this.pointRealizations3D = new Map();
    this.lineRealizations2D = new Map();
    this.segmentRealizations2D = new Map();
    this.circleRealizations2D = new Map();
    this.guideRealizations2D = new Map();
    this.projectionPlaneRealizations2D = new Map();
    this.projectionPlaneRealizations3D = new Map();
    this.nextId = 1;
    this.processTree = new ProcessTree();
    
    // Initialize fixed elements
    this.initializeFixedElements();
  }

  /**
   * Initialize fixed elements: P_V, P_H, origin O, and hinge line HL_HV
   * These are always present and cannot be deleted.
   */
  initializeFixedElements(): void {
    // Create P_H and P_V 3D planes
    const planeH = Plane3D.createPH();
    planeH.id = 'plane_H';
    this.planes.set('plane_H', planeH);

    const planeV = Plane3D.createPV();
    planeV.id = 'plane_V';
    this.planes.set('plane_V', planeV);

    // Create base projection planes for P_H and P_V
    const projPlaneH = BaseProjectionPlane.createPH();
    projPlaneH.id = 'proj_plane_H';
    projPlaneH.plane3DId = 'plane_H';
    this.projectionPlanes.set('proj_plane_H', projPlaneH);

    const projPlaneV = BaseProjectionPlane.createPV();
    projPlaneV.id = 'proj_plane_V';
    projPlaneV.plane3DId = 'plane_V';
    this.projectionPlanes.set('proj_plane_V', projPlaneV);

    // Origin projections O_H and O_V
    // These are the 2D projections of the 3D origin point O
    // O_H on P_H: local coordinates (0, -200) — on the hinge line
    // O_V on P_V: local coordinates (0, 200) — on the hinge line
    const pointOH = new FreePoint2D('O_H', new Vector3(0, -200, 1), planeH.id!);
    pointOH.locked = true;
    this.points.set('O_H', pointOH);

    const pointOV = new FreePoint2D('O_V', new Vector3(0, 200, 1), planeV.id!);
    pointOV.locked = true;
    this.points.set('O_V', pointOV);

    // Origin point O at (0,0,0) in 3D space is defined by O_H and O_V
    this.originPoint = new Vector4(0, 0, 0, 1);

    // Hinge line HL_HV along X-axis
    // Extends from -∞ to +∞, but we'll use large finite values for rendering
    this.hingeLineHV = {
      start: new Vector4(-10000, 0, 0, 1),
      end: new Vector4(10000, 0, 0, 1)
    };
  }

  /**
   * Generate a unique ID for a new point
   */
  generatePointId(): string {
    return `point_${this.nextId++}`;
  }

  /**
   * Add a point to the world
   * Point must already have an ID assigned
   * @param point Point to add
   * @returns The added point
   */
  addPoint(point: Point2D): Point2D {
    this.points.set(point.id, point);
    
    // Realization will be computed lazily on first access via getPoint2DRealization()
    
    return point;
  }

  /**
   * Get the 2D realization for a point (cached or computed on-demand)
   * Implements RealizationContext interface for recursive realization lookup
   */
  getPoint2DRealization(pointId: string): Point2DRealization | undefined {
    // Check cache first
    let realization = this.pointRealizations2D.get(pointId);
    if (realization) {
      return realization;
    }

    // Not cached - compute it
    const point = this.points.get(pointId);
    if (!point) {
      return undefined;
    }

    // Helper to get line realizations for intersection points
    const getLine = (lineId: string): Line2DRealization | null => {
      const lineRealization = this.getLine2DRealization(lineId);
      return lineRealization || null;
    };

    // Call realize2D() on the point with getLine callback
    realization = point.realize2D(getLine);
    
    // Cache the result
    this.pointRealizations2D.set(pointId, realization);
    
    return realization;
  }

  /**
   * Get the 3D realization for a point (cached or computed on-demand)
   * Computes 3D position by transforming the 2D realization using the projection plane's 3D transform
   */
  getPoint3DRealization(pointId: string): Point3DRealization | undefined {
    // Check cache first
    let realization = this.pointRealizations3D.get(pointId);
    if (realization) {
      return realization;
    }

    // Not cached - compute it
    const point = this.points.get(pointId);
    if (!point) {
      return undefined;
    }

    // Get the point's 2D realization (intrinsic plane coordinates)
    const realization2D = this.getPoint2DRealization(pointId);
    if (!realization2D) {
      return undefined;
    }

    // Get the projection plane's 3D transformation
    const planeRealization3D = this.getProjectionPlane3DRealization(point.planeId!);
    if (!planeRealization3D) {
      return undefined;
    }

    // Transform 2D plane coordinates to 3D space coordinates
    // [x, y, z, 1] = planeTo3D * [u, v, 1]
    const pos3D = realization2D.position.clone().applyMatrix3(planeRealization3D.planeTo3D);
    const position3D = new Vector4(pos3D.x, pos3D.y, pos3D.z, 1);
    
    realization = new Point3DRealization(position3D);
    
    // Cache the result
    this.pointRealizations3D.set(pointId, realization);
    
    return realization;
  }

  /**
   * Get the 2D realization for a projection plane (cached or computed on-demand)
   * Consistent pattern with getPoint2DRealization()
   */
  getProjectionPlane2DRealization(planeId: string): ProjectionPlaneRealization2D | undefined {
    // Check cache first
    let realization = this.projectionPlaneRealizations2D.get(planeId);
    if (realization) {
      return realization;
    }

    // Not cached - compute it
    const plane = this.projectionPlanes.get(planeId);
    if (!plane) {
      return undefined;
    }

    // Call realize2D() on the plane (same pattern as points)
    realization = plane.realize2D();
    
    // Cache the result
    this.projectionPlaneRealizations2D.set(planeId, realization);
    
    return realization;
  }

  /**
   * Get the 3D realization for a projection plane (cached or computed on-demand)
   * Returns the 3D transformation matrix for converting plane coordinates to 3D space
   */
  getProjectionPlane3DRealization(planeId: string): ProjectionPlaneRealization3D | undefined {
    // Check cache first
    let realization = this.projectionPlaneRealizations3D.get(planeId);
    if (realization) {
      return realization;
    }

    // Not cached - compute it
    const plane = this.projectionPlanes.get(planeId);
    if (!plane) {
      return undefined;
    }

    // Call realize3D() on the plane
    try {
      realization = plane.realize3D();
      
      // Cache the result
      this.projectionPlaneRealizations3D.set(planeId, realization);
      
      return realization;
    } catch (error) {
      // 3D realization not yet implemented for this plane type
      return undefined;
    }
  }

  /**
   * Invalidate cached realizations for a point and all dependent points
   * Call this when a point's definition changes (e.g., user moves a point)
   */
  invalidateRealization(pointId: string): void {
    this.pointRealizations2D.delete(pointId);
    this.pointRealizations3D.delete(pointId);
    
    // TODO: Also invalidate dependent points
    // Need to track dependency graph to know which points depend on this one
  }

  /**
   * Remove a point from the world
   * @param id Point ID to remove
   * @returns true if point was removed, false if not found
   */
  removePoint(id: string): boolean {
    // Remove cached realizations
    this.pointRealizations2D.delete(id);
    this.pointRealizations3D.delete(id);
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
  getAllPoints(): Point2D[] {
    return Array.from(this.points.values());
  }

  /**
   * Clear all elements from the world
   */
  clear(): void {
    this.points.clear();
    this.lines.clear();
    this.planes.clear();
    this.projectionPlanes.clear();
    this.pointRealizations2D.clear();
    this.pointRealizations3D.clear();
    this.lineRealizations2D.clear();
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

  // ========================================
  // Line management
  // ========================================

  /**
   * Add a line to the world
   * @param line Line to add
   * @returns The added line
   */
  addLine(line: Line2D): Line2D {
    this.lines.set(line.id, line);
    // Realization will be computed lazily on first access via getLine2DRealization()
    return line;
  }

  /**
   * Get 2D realization (line equation) for a line
   * Computes and caches the line equation in 2D plane coordinates
   * 
   * @param lineId ID of line to get realization for
   * @returns Line2DRealization if line exists and can be computed, undefined otherwise
   */
  getLine2DRealization(lineId: string): Line2DRealization | undefined {
    console.log('[World] getLine2DRealization called for:', lineId);
    // Check cache first
    if (this.lineRealizations2D.has(lineId)) {
      console.log('[World] Returning cached realization');
      return this.lineRealizations2D.get(lineId);
    }

    // Get line definition
    const line = this.lines.get(lineId);
    console.log('[World] Line from map:', line);
    if (!line) {
      console.log('[World] Line not found in map');
      return undefined;
    }

    // Helper to get point position - lines need 2D point positions as Vector3
    const getPoint = (pointId: string): Vector3 | null => {
      const pointRealization = this.getPoint2DRealization(pointId);
      console.log('[World] getPoint2DRealization for', pointId, ':', pointRealization);
      if (!pointRealization) {
        return null;
      }
      // Return position Vector3 directly - no coordinate decomposition
      return pointRealization.position;
    };

    // Compute realization from line definition
    console.log('[World] Calling line.realize2D...');
    const realization = line.realize2D(getPoint);
    console.log('[World] line.realize2D returned:', realization);
    if (!realization) {
      console.log('[World] Cannot compute realization');
      return undefined;  // Cannot compute (e.g., missing dependency points)
    }

    // Cache for future use
    this.lineRealizations2D.set(lineId, realization);
    console.log('[World] Cached realization');
    return realization;
  }

  /**
   * Invalidate line realization cache for a specific line
   * Call this when the line's dependencies change
   */
  invalidateLineRealization(lineId: string): void {
    this.lineRealizations2D.delete(lineId);
    // TODO: Also invalidate dependent elements (points on line, etc.)
  }

  /**
   * Remove a line from the world
   * @param id ID of line to remove
   * @returns true if line was removed, false if not found
   */
  removeLine(id: string): boolean {
    const removed = this.lines.delete(id);
    if (removed) {
      this.lineRealizations2D.delete(id);
    }
    return removed;
  }

  /**
   * Get a line by ID
   * @param id Line ID
   * @returns Line if found, undefined otherwise
   */
  getLineById(id: string): Line2D | undefined {
    return this.lines.get(id);
  }

  /**
   * Get all lines in the world
   * @returns Array of all lines
   */
  getAllLines(): Line2D[] {
    return Array.from(this.lines.values());
  }

  /**
   * Get total number of lines
   */
  getLineCount(): number {
    return this.lines.size;
  }

  /**
   * Generate a unique line ID
   */
  generateLineId(): string {
    return `line_${this.nextId++}`;
  }

  /**
   * Add a segment to the world
   * @param segment Segment to add (must have ID already set)
   * @returns The added segment
   */
  addSegment(segment: Segment2D): Segment2D {
    this.segments.set(segment.id, segment);
    return segment;
  }

  /**
   * Remove a segment from the world
   * @param id ID of segment to remove
   * @returns true if segment was removed, false if not found
   */
  removeSegment(id: string): boolean {
    const removed = this.segments.delete(id);
    if (removed) {
      this.segmentRealizations2D.delete(id);
    }
    return removed;
  }

  /**
   * Get a segment by ID
   * @param id Segment ID
   * @returns Segment if found, undefined otherwise
   */
  getSegmentById(id: string): Segment2D | undefined {
    return this.segments.get(id);
  }

  /**
   * Get all segments in the world
   * @returns Array of all segments
   */
  getAllSegments(): Segment2D[] {
    return Array.from(this.segments.values());
  }

  /**
   * Get total number of segments
   */
  getSegmentCount(): number {
    return this.segments.size;
  }

  /**
   * Generate a unique segment ID
   */
  generateSegmentId(): string {
    return `segment_${this.nextId++}`;
  }

  /**
   * Get the 2D realization for a segment (cached or computed on-demand)
   * Computes segment endpoints from point realizations
   */
  getSegment2DRealization(segmentId: string): Segment2DRealization | undefined {
    // Check cache first
    let realization = this.segmentRealizations2D.get(segmentId);
    if (realization) {
      return realization;
    }

    // Not cached - compute it
    const segment = this.segments.get(segmentId);
    if (!segment) {
      return undefined;
    }

    // Get point positions for segment realization
    const getPointPosition = (pointId: string): Vector3 | null => {
      const pointRealization = this.getPoint2DRealization(pointId);
      return pointRealization ? pointRealization.position : null;
    };

    // Call realize2D() on the segment
    realization = segment.realize2D(getPointPosition);
    
    if (realization) {
      // Cache the result
      this.segmentRealizations2D.set(segmentId, realization);
    }
    
    return realization;
  }

  // ========================================
  // CIRCLE METHODS
  // ========================================

  /**
   * Add a circle to the world
   */
  addCircle(circle: Circle2D): Circle2D {
    this.circles.set(circle.id, circle);
    // Invalidate cached realization
    this.circleRealizations2D.delete(circle.id);
    return circle;
  }

  /**
   * Remove a circle from the world
   */
  removeCircle(circleId: string): Circle2D | undefined {
    const circle = this.circles.get(circleId);
    if (circle) {
      this.circles.delete(circleId);
      this.circleRealizations2D.delete(circleId);
    }
    return circle;
  }

  /**
   * Get a circle by ID
   */
  getCircleById(circleId: string): Circle2D | undefined {
    return this.circles.get(circleId);
  }

  /**
   * Get all circles
   */
  getAllCircles(): Circle2D[] {
    return Array.from(this.circles.values());
  }

  /**
   * Generate a unique circle ID
   */
  generateCircleId(): string {
    return `circle-${this.nextId++}`;
  }

  /**
   * Get the 2D realization of a circle (with caching)
   * Returns circle geometry (center and radius) in plane coordinates
   */
  getCircle2DRealization(circleId: string): Circle2DRealization | undefined {
    // Check cache first
    let realization = this.circleRealizations2D.get(circleId);
    if (realization) {
      return realization;
    }

    // Not cached - compute it
    const circle = this.circles.get(circleId);
    if (!circle) {
      return undefined;
    }

    // Get point positions for circle realization
    const getPointPosition = (pointId: string): Vector3 | null => {
      const pointRealization = this.getPoint2DRealization(pointId);
      return pointRealization ? pointRealization.position : null;
    };

    // Call realize2D() on the circle
    realization = circle.realize2D(getPointPosition) ?? undefined;
    
    if (realization) {
      // Cache the result
      this.circleRealizations2D.set(circleId, realization);
    }
    
    return realization;
  }

  // ========================================
  // Guide Methods
  // ========================================

  /**
   * Add a guide to the world
   */
  addGuide(guide: Guide2D): Guide2D {
    this.guides.set(guide.id, guide);
    // Invalidate cached realization
    this.guideRealizations2D.delete(guide.id);
    return guide;
  }

  /**
   * Remove a guide from the world
   */
  removeGuide(guideId: string): Guide2D | undefined {
    const guide = this.guides.get(guideId);
    if (guide) {
      this.guides.delete(guideId);
      this.guideRealizations2D.delete(guideId);
    }
    return guide;
  }

  /**
   * Get a guide by ID
   */
  getGuideById(guideId: string): Guide2D | undefined {
    return this.guides.get(guideId);
  }

  /**
   * Get all guides
   */
  getAllGuides(): Guide2D[] {
    return Array.from(this.guides.values());
  }

  /**
   * Generate a unique guide ID
   */
  generateGuideId(): string {
    return `guide-${this.nextId++}`;
  }

  /**
   * Get the 2D realization of a guide (with caching)
   * Returns guide line geometry in plane coordinates
   */
  getGuide2DRealization(guideId: string): Guide2DRealization | undefined {
    // Check cache first
    let realization = this.guideRealizations2D.get(guideId);
    if (realization) {
      return realization;
    }

    // Not cached - compute it
    const guide = this.guides.get(guideId);
    if (!guide) {
      return undefined;
    }

    // Get line and point realizations for guide computation
    const getLineRealization = (lineId: string): Line2DRealization | null => {
      const lineRealization = this.getLine2DRealization(lineId);
      return lineRealization ?? null;
    };

    const getPointPosition = (pointId: string): Vector3 | null => {
      const pointRealization = this.getPoint2DRealization(pointId);
      return pointRealization ? pointRealization.position : null;
    };

    // Call realize2D() on the guide
    realization = guide.realize2D(getLineRealization, getPointPosition) ?? undefined;
    
    if (realization) {
      // Cache the result
      this.guideRealizations2D.set(guideId, realization);
    }
    
    return realization;
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

  /**
   * Get the process tree (construction history)
   */
  getProcessTree(): ProcessTree {
    return this.processTree;
  }
}

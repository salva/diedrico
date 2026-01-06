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
import { applyMatrix4x3 } from '@/utils/threeUtils';
import { Point2D, FreePoint2D, IntersectionPoint2D, SiblingIntersectionPoint2D, Point2DRealization2D, Point3DRealization3D } from './Point';
import { Line2D, Line2DByTwoPoints, Line2DRealization2D } from './Line';
import { Segment2D, Segment2DByPoints, Segment2DRealization2D } from './Segment';
import { Circle2D, Circle2DByCenterAndRadius, Circle2DRealization2D } from './Circle';
import { Guide2D, Guide2DPerpendicularToLine, Guide2DRealization2D } from './Guide';
import { HingeLine, HalfHingeLine2D } from './HingeLine';
import { Plane3D } from './Plane';
import { ProjectionPlane, BaseProjectionPlane, ProjectionPlaneRealization2D, ProjectionPlaneRealization3D } from './ProjectionPlane';
import { ProcessTree } from '../processTree/ProcessTree';
import { DependencyService } from '@/services/DependencyService';

export class World {
  private points: Map<string, Point2D>;
  private lines: Map<string, Line2D>;
  private segments: Map<string, Segment2D>;
  private circles: Map<string, Circle2D>;
  private guides: Map<string, Guide2D>;
  private hingeLines: Map<string, HingeLine>;
  private planes: Map<string, Plane3D>;
  projectionPlanes: Map<string, ProjectionPlane>;  // 2D projection planes (public for rendering)
  
  // Construction history
  private processTree: ProcessTree;
  
  // Dependency tracking
  private dependencyService: DependencyService;
  
  // Realization caches - organized by object type for extensibility
  private pointRealizations2D: Map<string, Point2DRealization2D>;  // Computed 2D point positions
  private pointRealizations3D: Map<string, Point3DRealization3D>;  // Computed 3D point positions
  private lineRealizations2D: Map<string, Line2DRealization2D>;    // Computed 2D line equations
  private segmentRealizations2D: Map<string, Segment2DRealization2D>;  // Computed 2D segment endpoints
  private circleRealizations2D: Map<string, Circle2DRealization2D>;  // Computed 2D circle geometry
  private guideRealizations2D: Map<string, Guide2DRealization2D>;  // Computed 2D guide line geometry
  private projectionPlaneRealizations2D: Map<string, ProjectionPlaneRealization2D>;  // Computed plane 2D transforms
  private projectionPlaneRealizations3D: Map<string, ProjectionPlaneRealization3D>;  // Computed plane 3D transforms
  
  private nextId: number;
  private _version: number = 0;  // For tracking changes and triggering UI updates

  // Fixed elements (always present)
  originPoint?: Vector4;  // O at (0,0,0) in 3D space

  constructor() {
    this.points = new Map();
    this.lines = new Map();
    this.segments = new Map();
    this.circles = new Map();
    this.guides = new Map();
    this.hingeLines = new Map();
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
    this.dependencyService = new DependencyService(this.processTree);
    
    // Initialize fixed elements
    this.initializeFixedElements();
  }

  /**
   * Get current version number for change tracking
   */
  getVersion(): number {
    return this._version;
  }

  /**
   * Notify that world has changed (increment version)
   */
  private notifyChange(): void {
    this._version++;
  }

  /**
   * Clear all elements (for loading projects)
   * Resets world to initial state with only fixed elements
   */
  clear(): void {
    this.points.clear();
    this.lines.clear();
    this.segments.clear();
    this.circles.clear();
    this.guides.clear();
    this.hingeLines.clear();
    this.planes.clear();
    this.projectionPlanes.clear();
    this.pointRealizations2D.clear();
    this.pointRealizations3D.clear();
    this.lineRealizations2D.clear();
    this.segmentRealizations2D.clear();
    this.circleRealizations2D.clear();
    this.guideRealizations2D.clear();
    this.projectionPlaneRealizations2D.clear();
    this.projectionPlaneRealizations3D.clear();
    this.nextId = 1;
    this._version = 0;
    this.processTree = new ProcessTree();
    this.dependencyService = new DependencyService(this.processTree);
    
    // Reinitialize fixed elements
    this.initializeFixedElements();
    
    // Notify UI of change
    this.notifyChange();
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
    // These are the 2D projections of the 3D origin point O at (0,0,0)
    // O is at the intersection of HL_HV with the origin
    // O_H on P_H: v=0 (where HL is), u=0 (at origin along X-axis)
    // O_V on P_V: v=0 (where HL is), u=0 (at origin along X-axis)
    const pointOH = new FreePoint2D('O_H', new Vector3(0, 0, 1), 'proj_plane_H');
    pointOH.locked = true;
    this.points.set('O_H', pointOH);

    const pointOV = new FreePoint2D('O_V', new Vector3(0, 0, 1), 'proj_plane_V');
    pointOV.locked = true;
    this.points.set('O_V', pointOV);

    // Origin point O at (0,0,0) in 3D space is defined by O_H and O_V
    this.originPoint = new Vector4(0, 0, 0, 1);

    // Create hinge line HL_HV connecting P_H and P_V
    const hingeLineHV = new HingeLine('HL_HV', 'HL_HV', 'proj_plane_H', 'proj_plane_V');
    this.hingeLines.set('HL_HV', hingeLineHV);

    // Create HalfHingeLine2D objects for HL_HV (one per plane)
    // HL_HV appears at v=0 on both P_H and P_V (horizontal line)
    // These are Line2D entities stored in World.lines
    const halfHingeHV_onPH = new HalfHingeLine2D(
      'half_HL_HV_on_PH',
      'HL_HV',
      'proj_plane_H',
      new Vector3(0, 0, 1),      // Point at origin
      new Vector3(1, 0, 0)       // Horizontal direction (parallel to X-axis)
    );
    this.lines.set(halfHingeHV_onPH.id, halfHingeHV_onPH);

    const halfHingeHV_onPV = new HalfHingeLine2D(
      'half_HL_HV_on_PV',
      'HL_HV',
      'proj_plane_V',
      new Vector3(0, 0, 1),      // Point at origin
      new Vector3(1, 0, 0)       // Horizontal direction (parallel to X-axis)
    );
    this.lines.set(halfHingeHV_onPV.id, halfHingeHV_onPV);
  }

  /**
   * Generate a unique ID for a new point
   */
  generatePoint2DId(): string {
    return `point2d_${this.nextId++}`;
  }

  /**
   * Add a point to the world
   * Point must already have an ID assigned
   * @param point Point to add
   * @returns The added point
   */
  addPoint2D(point: Point2D): Point2D {
    this.points.set(point.id, point);
    this.notifyChange();
    
    // Realization will be computed lazily on first access via getPoint2DRealization()
    
    return point;
  }

  /**
   * Get the 2D realization for a point (cached or computed on-demand)
   * Implements RealizationContext interface for recursive realization lookup
   */
  getPoint2DRealization(pointId: string): Point2DRealization2D | undefined {
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

    // Call realize2D() on the point with world context
    // Point will query world for parent line/circle realizations as needed
    realization = point.realize2D(this);
    
    // Cache the result
    this.pointRealizations2D.set(pointId, realization);
    
    return realization;
  }

  /**
   * Get the 3D realization for a point (cached or computed on-demand)
   * Computes 3D position by transforming the 2D realization using the projection plane's 3D transform
   */
  getPoint3DRealization(pointId: string): Point3DRealization3D | undefined {
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
    // [x, y, z, w] = planeTo3D (Matrix4x3) * [u, v, 1]
    const pos3D = applyMatrix4x3(realization2D.position, planeRealization3D.planeTo3D);
    
    realization = new Point3DRealization3D(pos3D);
    
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
    // Use dependency service to cascade invalidation to all dependents
    this.dependencyService.invalidateCascade(pointId, (id: string) => {
      // Clear realization caches for all element types
      this.pointRealizations2D.delete(id);
      this.pointRealizations3D.delete(id);
      this.lineRealizations2D.delete(id);
      this.segmentRealizations2D.delete(id);
      this.circleRealizations2D.delete(id);
      this.guideRealizations2D.delete(id);
    });
    
    // Rebuild dependency maps to reflect any changes
    this.dependencyService.rebuildDependencyMaps();
  }

  /**
   * Remove a point from the world (generic version - prefer removePoint2D factory method)
   * @param id Point ID to remove
   * @returns true if point was removed, false if not found
   */
  removePoint2DGeneric(id: string): boolean {
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
  getPoint2DById(id: string): Point2D | undefined {
    return this.points.get(id);
  }

  /**
   * Get all points in the world
   * @returns Array of all points
   */
  getAllPoints2D(): Point2D[] {
    return Array.from(this.points.values());
  }

  /**
   * Get all points on a specific plane
   * @param planeId Plane ID to filter by
   * @returns Array of points on the specified plane
   */
  getPoints2DByPlane(planeId: string): Point2D[] {
    return this.getAllPoints2D().filter(p => p.planeId === planeId);
  }

  /**
   * Get total number of points
   */
  getPoint2DCount(): number {
    return this.points.size;
  }

  /**
   * Toggle visibility of a point
   * @param id Point ID
   * @returns true if visibility was toggled, false if point not found
   */
  togglePoint2DVisibility(id: string): boolean {
    const point = this.points.get(id);
    if (!point) return false;
    point.visible = !point.visible;
    this.notifyChange();
    return true;
  }

  /**
   * Set visibility of a point
   * @param id Point ID
   * @param visible Visibility state
   * @returns true if successful, false if point not found
   */
  setPoint2DVisibility(id: string, visible: boolean): boolean {
    const point = this.points.get(id);
    if (!point) return false;
    point.visible = visible;
    this.notifyChange();
    return true;
  }

  // ========================================
  // Line management
  // ========================================

  /**
   * Add a line to the world
   * @param line Line to add
   * @returns The added line
   */
  addLine2D(line: Line2D): Line2D {
    this.lines.set(line.id, line);
    this.notifyChange();
    // Realization will be computed lazily on first access via getLine2DRealization()
    return line;
  }

  /**
   * Get 2D realization (line equation) for a line
   * Computes and caches the line equation in 2D plane coordinates
   * 
   * @param lineId ID of line to get realization for
   * @returns Line2DRealization2D if line exists and can be computed, undefined otherwise
   */
  getLine2DRealization(lineId: string): Line2DRealization2D | undefined {
    // Check cache first
    if (this.lineRealizations2D.has(lineId)) {
      return this.lineRealizations2D.get(lineId);
    }

    // Get line definition
    const line = this.lines.get(lineId);
    if (!line) {
      return undefined;
    }

    // Compute realization from line definition
    // Line will query world for parent point realizations
    const realization = line.realize2D(this);
    if (!realization) {
      return undefined;  // Cannot compute (e.g., missing dependency points)
    }

    // Cache for future use
    this.lineRealizations2D.set(lineId, realization);
    return realization;
  }

  /**
   * Invalidate line realization cache for a specific line
   * Call this when the line's dependencies change
   */
  invalidateLineRealization(lineId: string): void {
    // Use dependency service to cascade invalidation to all dependents
    this.dependencyService.invalidateCascade(lineId, (id: string) => {
      // Clear realization caches for all element types
      this.pointRealizations2D.delete(id);
      this.pointRealizations3D.delete(id);
      this.lineRealizations2D.delete(id);
      this.segmentRealizations2D.delete(id);
      this.circleRealizations2D.delete(id);
      this.guideRealizations2D.delete(id);
    });
    
    // Rebuild dependency maps to reflect any changes
    this.dependencyService.rebuildDependencyMaps();
  }

  /**
   * Remove a line from the world (generic version - prefer removeLine2D factory method)
   * @param id ID of line to remove
   * @returns true if line was removed, false if not found
   */
  removeLine2DGeneric(id: string): boolean {
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
  getLine2DById(id: string): Line2D | undefined {
    return this.lines.get(id);
  }

  /**
   * Get all lines in the world
   * @returns Array of all lines
   */
  getAllLines2D(): Line2D[] {
    return Array.from(this.lines.values());
  }

  /**
   * Get all lines on a specific plane (includes HalfHingeLine2D)
   * @param planeId Plane ID to filter by
   * @returns Array of lines on the specified plane
   */
  getLines2DByPlane(planeId: string): Line2D[] {
    return this.getAllLines2D().filter(l => l.planeId === planeId);
  }

  /**
   * Get total number of lines
   */
  getLine2DCount(): number {
    return this.lines.size;
  }

  /**
   * Toggle visibility of a line
   * @param id Line ID
   * @returns true if visibility was toggled, false if line not found
   */
  toggleLine2DVisibility(id: string): boolean {
    const line = this.lines.get(id);
    if (!line) return false;
    line.visible = !line.visible;
    this.notifyChange();
    return true;
  }

  /**
   * Set visibility of a line
   * @param id Line ID
   * @param visible Visibility state
   * @returns true if successful, false if line not found
   */
  setLine2DVisibility(id: string, visible: boolean): boolean {
    const line = this.lines.get(id);
    if (!line) return false;
    line.visible = visible;
    this.notifyChange();
    return true;
  }

  /**
   * Generate a unique line ID
   */
  generateLine2DId(): string {
    return `line2d_${this.nextId++}`;
  }

  /**
   * Add a segment to the world (generic version - prefer addSegment2DBetweenPoints factory method)
   * @param segment Segment to add (must have ID already set)
   * @returns The added segment
   */
  addSegment2D(segment: Segment2D): Segment2D {
    this.segments.set(segment.id, segment);
    this.notifyChange();
    return segment;
  }

  /**
   * Remove a segment from the world (generic version - prefer removeSegment2D factory method)
   * @param id ID of segment to remove
   * @returns true if segment was removed, false if not found
   */
  removeSegment2DGeneric(id: string): boolean {
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
  getSegment2DById(id: string): Segment2D | undefined {
    return this.segments.get(id);
  }

  /**
   * Get all segments in the world
   * @returns Array of all segments
   */
  getAllSegments2D(): Segment2D[] {
    return Array.from(this.segments.values());
  }

  /**
   * Get all segments on a specific plane
   * @param planeId Plane ID to filter by
   * @returns Array of segments on the specified plane
   */
  getSegments2DByPlane(planeId: string): Segment2D[] {
    return this.getAllSegments2D().filter(s => s.planeId === planeId);
  }

  /**
   * Get total number of segments
   */
  getSegment2DCount(): number {
    return this.segments.size;
  }

  /**
   * Toggle visibility of a segment
   * @param id Segment ID
   * @returns true if visibility was toggled, false if segment not found
   */
  toggleSegment2DVisibility(id: string): boolean {
    const segment = this.segments.get(id);
    if (!segment) return false;
    segment.visible = !segment.visible;
    this.notifyChange();
    return true;
  }

  /**
   * Set visibility of a segment
   * @param id Segment ID
   * @param visible Visibility state
   * @returns true if successful, false if segment not found
   */
  setSegment2DVisibility(id: string, visible: boolean): boolean {
    const segment = this.segments.get(id);
    if (!segment) return false;
    segment.visible = visible;
    this.notifyChange();
    return true;
  }

  /**
   * Generate a unique segment ID
   */
  generateSegment2DId(): string {
    return `segment2d_${this.nextId++}`;
  }

  /**
   * Get the 2D realization for a segment (cached or computed on-demand)
   * Computes segment endpoints from point realizations
   */
  getSegment2DRealization(segmentId: string): Segment2DRealization2D | undefined {
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

    // Call realize2D() on the segment with world context
    // Segment will query world for parent point realizations
    realization = segment.realize2D(this) ?? undefined;
    
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
  addCircle2D(circle: Circle2D): Circle2D {
    this.circles.set(circle.id, circle);
    this.notifyChange();
    // Invalidate cached realization
    this.circleRealizations2D.delete(circle.id);
    return circle;
  }

  /**
   * Remove a circle from the world (generic version - prefer removeCircle2D factory method)
   */
  removeCircle2DGeneric(circleId: string): Circle2D | undefined {
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
  getCircle2DById(circleId: string): Circle2D | undefined {
    return this.circles.get(circleId);
  }

  /**
   * Get all circles
   */
  getAllCircles2D(): Circle2D[] {
    return Array.from(this.circles.values());
  }

  /**
   * Get all circles on a specific plane
   * @param planeId Plane ID to filter by
   * @returns Array of circles on the specified plane
   */
  getCircles2DByPlane(planeId: string): Circle2D[] {
    return this.getAllCircles2D().filter(c => c.planeId === planeId);
  }

  /**
   * Toggle visibility of a circle
   * @param id Circle ID
   * @returns true if visibility was toggled, false if circle not found
   */
  toggleCircle2DVisibility(id: string): boolean {
    const circle = this.circles.get(id);
    if (!circle) return false;
    circle.visible = !circle.visible;
    this.notifyChange();
    return true;
  }

  /**
   * Set visibility of a circle
   * @param id Circle ID
   * @param visible Visibility state
   * @returns true if successful, false if circle not found
   */
  setCircle2DVisibility(id: string, visible: boolean): boolean {
    const circle = this.circles.get(id);
    if (!circle) return false;
    circle.visible = visible;
    this.notifyChange();
    return true;
  }

  /**
   * Generate a unique circle ID
   */
  generateCircle2DId(): string {
    return `circle2d_${this.nextId++}`;
  }

  /**
   * Get the 2D realization of a circle (with caching)
   * Returns circle geometry (center and radius) in plane coordinates
   */
  getCircle2DRealization(circleId: string): Circle2DRealization2D | undefined {
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

    // Call realize2D() on the circle with world context
    // Circle will query world for parent point realizations
    realization = circle.realize2D(this) ?? undefined;
    
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
   * Add a guide to the world (generic version - prefer addGuide2D factory method)
   */
  addGuide2DGeneric(guide: Guide2D): Guide2D {
    this.guides.set(guide.id, guide);
    this.notifyChange();
    // Invalidate cached realization
    this.guideRealizations2D.delete(guide.id);
    return guide;
  }

  /**
   * Remove a guide from the world (generic version - prefer removeGuide2D factory method)
   */
  removeGuide2DGeneric(guideId: string): Guide2D | undefined {
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
  getGuide2DById(guideId: string): Guide2D | undefined {
    return this.guides.get(guideId);
  }

  /**
   * Get all guides
   */
  getAllGuides2D(): Guide2D[] {
    return Array.from(this.guides.values());
  }

  /**
   * Toggle visibility of a guide
   * @param id Guide ID
   * @returns true if visibility was toggled, false if guide not found
   */
  toggleGuide2DVisibility(id: string): boolean {
    const guide = this.guides.get(id);
    if (!guide) return false;
    guide.visible = !guide.visible;
    this.notifyChange();
    return true;
  }

  /**
   * Set visibility of a guide
   * @param id Guide ID
   * @param visible Visibility state
   * @returns true if successful, false if guide not found
   */
  setGuide2DVisibility(id: string, visible: boolean): boolean {
    const guide = this.guides.get(id);
    if (!guide) return false;
    guide.visible = visible;
    this.notifyChange();
    return true;
  }

  /**
   * Generate a unique guide ID
   */
  generateGuide2DId(): string {
    return `guide2d_${this.nextId++}`;
  }

  /**
   * Get the 2D realization of a guide (with caching)
   * Returns guide line geometry in plane coordinates
   */
  getGuide2DRealization(guideId: string): Guide2DRealization2D | undefined {
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

    // Call realize2D() on the guide with world context
    // Guide will query world for parent line and point realizations
    realization = guide.realize2D(this) ?? undefined;
    
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
   * Get projection plane by ID
   */
  getProjectionPlaneById(id: string): ProjectionPlane | undefined {
    return this.projectionPlanes.get(id);
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

  /**
   * Get the dependency service
   */
  getDependencyService(): DependencyService {
    return this.dependencyService;
  }

  /**
   * Add an action to the process tree and update dependency tracking
   * Use this instead of getProcessTree().addAction() directly
   */
  addAction(action: any, groupName?: string): any {
    const result = this.processTree.addAction(action, groupName);
    // Rebuild dependency maps to include the new action
    this.dependencyService.rebuildDependencyMaps();
    return result;
  }

  // ========================================
  // Factory Methods for Point2D
  // ========================================

  /**
   * Factory method to create and add a FreePoint2D to the world
   * 
   * @param planeId ID of the projection plane this point belongs to
   * @param position Position in plane intrinsic coordinates (u, v, 1)
   * @param id Optional ID for redo operations. If not provided, generates a new one.
   * @returns The created FreePoint2D
   * @throws Error if planeId is invalid
   */
  addFreePoint2D(planeId: string, position: Vector3, id?: string): FreePoint2D {
    // Validate plane exists
    if (!this.projectionPlanes.has(planeId)) {
      throw new Error(`Invalid planeId: ${planeId}. Plane does not exist.`);
    }

    // Generate unique ID if not provided
    if (!id) {
      id = this.generatePoint2DId();
    }

    // Create the point
    const point = new FreePoint2D(id, position, planeId);
    
    // Add to world storage using addPoint2D (which calls notifyChange)
    this.addPoint2D(point);
    
    return point;
  }

  /**
   * Factory method to create and add an IntersectionPoint2D to the world
   * 
   * @param planeId ID of the projection plane this point belongs to
   * @param line1Id ID of the first line
   * @param line2Id ID of the second line
   * @param index Index to identify which intersection (0 for first, 1 for second, etc.)
   * @param id Optional ID for redo operations. If not provided, generates a new one.
   * @returns The created IntersectionPoint2D
   * @throws Error if validation fails (invalid plane, missing lines, lines not on same plane, lines parallel)
   */
  /**
   * Add an intersection point between two geometric elements (lines or circles)
   * 
   * @param planeId ID of the plane where intersection is created
   * @param element1Id ID of first element (line or circle)
   * @param element2Id ID of second element (line or circle)
   * @param index Intersection index (0 for first/only point, 1 for second point in multiple intersections)
   * @param id Optional ID for redo operations
   * @returns The created IntersectionPoint2D
   */
  addIntersectionPoint2D(
    planeId: string,
    element1Id: string,
    element2Id: string,
    index: number,
    id?: string
  ): IntersectionPoint2D {
    // Validate plane exists
    if (!this.projectionPlanes.has(planeId)) {
      throw new Error(`Invalid planeId: ${planeId}. Plane does not exist.`);
    }

    // Try to get elements (could be lines, guides, or circles)
    const element1 = this.lines.get(element1Id) || this.guides.get(element1Id) || this.circles.get(element1Id);
    const element2 = this.lines.get(element2Id) || this.guides.get(element2Id) || this.circles.get(element2Id);
    
    if (!element1) {
      throw new Error(`Invalid element1Id: ${element1Id}. Element does not exist.`);
    }
    if (!element2) {
      throw new Error(`Invalid element2Id: ${element2Id}. Element does not exist.`);
    }

    // Validate elements are on the same plane
    if (element1.planeId !== element2.planeId) {
      throw new Error(`Elements must be on the same plane. Element1 is on ${element1.planeId}, Element2 is on ${element2.planeId}.`);
    }

    // Validate elements are on the specified plane
    if (element1.planeId !== planeId) {
      throw new Error(`Elements are on plane ${element1.planeId}, but intersection point is being created on plane ${planeId}.`);
    }

    // Generate unique ID if not provided
    if (!id) {
      id = this.generatePoint2DId();
    }

    // Create the intersection point
    const point = new IntersectionPoint2D(id, element1Id, element2Id, index, planeId);
    
    // Add to world storage using addPoint2D (which calls notifyChange)
    this.addPoint2D(point);
    
    return point;
  }

  /**
   * Create intersection point with automatic sibling when intersecting with HalfHingeLine2D
   * 
   * When one of the intersecting elements is a HalfHingeLine2D, this method automatically:
   * 1. Creates the primary IntersectionPoint2D on the specified plane
   * 2. Creates a SiblingIntersectionPoint2D on the paired plane
   * 3. Links them together via siblingPointId
   * 
   * This maintains geometric consistency: a 3D point intersecting with the hinge line
   * has projections on BOTH planes.
   * 
   * @param planeId ID of the plane where primary intersection is created
   * @param element1Id ID of first element (line, circle, etc.)
   * @param element2Id ID of second element
   * @param index Intersection index (for multiple intersections)
   * @param primaryId Optional ID for primary point (for redo)
   * @param siblingId Optional ID for sibling point (for redo)
   * @returns Object with primary and sibling points (sibling is undefined if not HHL intersection)
   */
  addIntersectionPoint2DWithSibling(
    planeId: string,
    element1Id: string,
    element2Id: string,
    index: number,
    primaryId?: string,
    siblingId?: string
  ): { primary: IntersectionPoint2D; sibling?: SiblingIntersectionPoint2D } {
    // Check if either element is a HalfHingeLine2D
    // Note: Only lines can be HalfHingeLine2D, not guides or circles
    const element1 = this.lines.get(element1Id);
    const element2 = this.lines.get(element2Id);
    
    const isElement1HHL = element1 instanceof HalfHingeLine2D;
    const isElement2HHL = element2 instanceof HalfHingeLine2D;
    const isHHLIntersection = isElement1HHL || isElement2HHL;

    // Create primary intersection point using existing method
    const primary = this.addIntersectionPoint2D(planeId, element1Id, element2Id, index, primaryId);

    // If not intersecting with HHL, return just the primary
    if (!isHHLIntersection) {
      return { primary };
    }

    // Determine sibling plane ID
    // For MVP: proj_plane_H ↔ proj_plane_V
    const siblingPlaneId = planeId === 'proj_plane_H' ? 'proj_plane_V' : 'proj_plane_H';

    // Generate sibling ID if not provided
    if (!siblingId) {
      siblingId = this.generatePoint2DId();
    }

    // Create sibling point
    const sibling = new SiblingIntersectionPoint2D(
      siblingId,
      primary.id,
      siblingPlaneId,
      primary.label  // Use same label as primary
    );

    // Link primary to sibling
    primary.siblingPointId = siblingId;

    // Add sibling to world storage using addPoint2D (which calls notifyChange)
    this.addPoint2D(sibling);

    return { primary, sibling };
  }

  // ========================================
  // Factory Methods for Line2D
  // ========================================

  /**
   * Factory method to create and add a Line2DByTwoPoints to the world
   * 
   * @param planeId ID of the projection plane this line belongs to
   * @param point1Id ID of the first point
   * @param point2Id ID of the second point
   * @param id Optional ID for redo operations. If not provided, generates a new one.
   * @returns The created Line2DByTwoPoints
   * @throws Error if validation fails (invalid plane, missing points, points not on same plane, points identical)
   */
  addLine2DBetweenTwoPoints(
    planeId: string,
    point1Id: string,
    point2Id: string,
    id?: string
  ): Line2DByTwoPoints {
    // Validate plane exists
    if (!this.projectionPlanes.has(planeId)) {
      throw new Error(`Invalid planeId: ${planeId}. Plane does not exist.`);
    }

    // Validate points exist
    const point1 = this.points.get(point1Id);
    const point2 = this.points.get(point2Id);
    
    if (!point1) {
      throw new Error(`Invalid point1Id: ${point1Id}. Point does not exist.`);
    }
    if (!point2) {
      throw new Error(`Invalid point2Id: ${point2Id}. Point does not exist.`);
    }

    // Validate points are on the same plane
    if (point1.planeId !== point2.planeId) {
      throw new Error(`Points must be on the same plane. Point1 is on ${point1.planeId}, Point2 is on ${point2.planeId}.`);
    }

    // Validate points are on the specified plane
    if (point1.planeId !== planeId) {
      throw new Error(`Points are on plane ${point1.planeId}, but line is being created on plane ${planeId}.`);
    }

    // Validate points are distinct (not the same point)
    if (point1Id === point2Id) {
      throw new Error(`Cannot create line from a point to itself. point1Id and point2Id must be different.`);
    }

    // Validate points have distinct positions
    const point1Realization = this.getPoint2DRealization(point1Id);
    const point2Realization = this.getPoint2DRealization(point2Id);
    
    if (!point1Realization || !point2Realization) {
      throw new Error(`Cannot compute point realizations. Points may depend on missing elements.`);
    }

    const distance = point1Realization.position.distanceTo(point2Realization.position);
    if (distance < 1e-10) {
      throw new Error(`Points ${point1Id} and ${point2Id} are too close (distance: ${distance}). Cannot create line.`);
    }

    // Generate unique ID if not provided
    if (!id) {
      id = this.generateLine2DId();
    }

    // Create the line
    const line = new Line2DByTwoPoints(id, point1Id, point2Id, planeId);
    
    // Add to world storage using addLine2D (which calls notifyChange)
    this.addLine2D(line);
    
    return line;
  }

  // ========================================
  // Factory Methods for Segment2D
  // ========================================

  /**
   * Factory method to create and add a Segment2DByPoints to the world
   * 
   * @param planeId ID of the projection plane this segment belongs to
   * @param point1Id ID of the first endpoint
   * @param point2Id ID of the second endpoint
   * @param id Optional ID for redo operations. If not provided, generates a new one.
   * @returns The created Segment2DByPoints
   * @throws Error if validation fails (same validation as lines)
   */
  addSegment2DBetweenPoints(
    planeId: string,
    point1Id: string,
    point2Id: string,
    id?: string
  ): Segment2DByPoints {
    // Validate plane exists
    if (!this.projectionPlanes.has(planeId)) {
      throw new Error(`Invalid planeId: ${planeId}. Plane does not exist.`);
    }

    // Validate points exist
    const point1 = this.points.get(point1Id);
    const point2 = this.points.get(point2Id);
    
    if (!point1) {
      throw new Error(`Invalid point1Id: ${point1Id}. Point does not exist.`);
    }
    if (!point2) {
      throw new Error(`Invalid point2Id: ${point2Id}. Point does not exist.`);
    }

    // Validate points are on the same plane
    if (point1.planeId !== point2.planeId) {
      throw new Error(`Points must be on the same plane. Point1 is on ${point1.planeId}, Point2 is on ${point2.planeId}.`);
    }

    // Validate points are on the specified plane
    if (point1.planeId !== planeId) {
      throw new Error(`Points are on plane ${point1.planeId}, but segment is being created on plane ${planeId}.`);
    }

    // Validate points are distinct
    if (point1Id === point2Id) {
      throw new Error(`Cannot create segment from a point to itself. point1Id and point2Id must be different.`);
    }

    // Generate unique ID if not provided
    if (!id) {
      id = this.generateSegment2DId();
    }

    // Create the segment
    const segment = new Segment2DByPoints(id, point1Id, point2Id, planeId);
    
    // Add to world storage using addSegment2D (which calls notifyChange)
    this.addSegment2D(segment);
    
    return segment;
  }

  // ========================================
  // Factory Methods for Circle2D
  // ========================================

  /**
   * Factory method to create and add a Circle2DByCenterAndRadius to the world
   * 
   * @param planeId ID of the projection plane this circle belongs to
   * @param centerPointId ID of the center point
   * @param radius Radius in plane intrinsic units
   * @param id Optional ID for redo operations. If not provided, generates a new one.
   * @returns The created Circle2DByCenterAndRadius
   * @throws Error if validation fails (invalid plane, missing center point, invalid radius)
   */
  addCircle2DByCenter(
    planeId: string,
    centerPointId: string,
    radius: number,
    id?: string
  ): Circle2DByCenterAndRadius {
    // Validate plane exists
    if (!this.projectionPlanes.has(planeId)) {
      throw new Error(`Invalid planeId: ${planeId}. Plane does not exist.`);
    }

    // Validate center point exists
    const centerPoint = this.points.get(centerPointId);
    if (!centerPoint) {
      throw new Error(`Invalid centerPointId: ${centerPointId}. Point does not exist.`);
    }

    // Validate center point is on the specified plane
    if (centerPoint.planeId !== planeId) {
      throw new Error(`Center point is on plane ${centerPoint.planeId}, but circle is being created on plane ${planeId}.`);
    }

    // Validate radius is positive
    if (radius <= 0) {
      throw new Error(`Radius must be positive. Got: ${radius}`);
    }

    // Generate unique ID if not provided
    if (!id) {
      id = this.generateCircle2DId();
    }

    // Create the circle
    const circle = new Circle2DByCenterAndRadius(id, centerPointId, radius, planeId);
    
    // Add to world storage using addCircle2D (which calls notifyChange)
    this.addCircle2D(circle);
    
    return circle;
  }

  // ========================================
  // Factory Methods for Guide2D
  // ========================================

  /**
   * Factory method to create and add a Guide2DPerpendicularToLine to the world
   * 
   * @param planeId ID of the projection plane this guide belongs to
   * @param referenceLineId ID of the line to be perpendicular to
   * @param throughPointId ID of the point the guide passes through
   * @param id Optional ID for redo operations. If not provided, generates a new one.
   * @returns The created Guide2DPerpendicularToLine
   * @throws Error if validation fails (invalid plane, missing line/point)
   */
  addGuide2D(
    planeId: string,
    referenceLineId: string,
    throughPointId: string,
    id?: string
  ): Guide2DPerpendicularToLine {
    // Validate plane exists
    if (!this.projectionPlanes.has(planeId)) {
      throw new Error(`Invalid planeId: ${planeId}. Plane does not exist.`);
    }

    // Validate reference line exists
    const referenceLine = this.lines.get(referenceLineId);
    if (!referenceLine) {
      throw new Error(`Invalid referenceLineId: ${referenceLineId}. Line does not exist.`);
    }

    // Validate through point exists
    const throughPoint = this.points.get(throughPointId);
    if (!throughPoint) {
      throw new Error(`Invalid throughPointId: ${throughPointId}. Point does not exist.`);
    }

    // Validate point is on the specified plane
    if (throughPoint.planeId !== planeId) {
      throw new Error(`Through point is on plane ${throughPoint.planeId}, but guide is being created on plane ${planeId}.`);
    }

    // Generate unique ID if not provided
    if (!id) {
      id = this.generateGuide2DId();
    }

    // Create the guide
    const guide = new Guide2DPerpendicularToLine(id, referenceLineId, throughPointId, planeId);
    
    // Add to world storage using addGuide2DGeneric (which calls notifyChange)
    this.addGuide2DGeneric(guide);
    
    return guide;
  }

  // ========================================
  // Removal Factory Methods
  // ========================================

  /**
   * Factory method to remove a Point2D from the world
   * 
   * @param planeId ID of the projection plane (for consistency with add methods)
   * @param id ID of the point to remove
   * @returns The removed point (for undo), or null if not found
   * @throws Error if point has dependents
   */
  removePoint2D(planeId: string, id: string): Point2D | null {
    const point = this.points.get(id);
    if (!point) {
      return null;
    }

    // Validate planeId matches
    if (point.planeId !== planeId) {
      throw new Error(`Point ${id} is on plane ${point.planeId}, not ${planeId}.`);
    }

    // TODO: Check for dependents
    // For now, we'll allow removal. In the future, should check:
    // - Lines that reference this point
    // - Segments that reference this point
    // - Circles that reference this point
    // - Other points that depend on this point (intersection points)

    // T055k: Handle sibling point deletion cascading
    // If deleting a primary intersection point with sibling, delete sibling first
    if ('siblingPointId' in point && point.siblingPointId) {
      const siblingPoint = this.points.get(point.siblingPointId);
      if (siblingPoint) {
        const siblingPlaneId = siblingPoint.planeId;
        this.points.delete(point.siblingPointId);
        this.pointRealizations2D.delete(point.siblingPointId);
        this.pointRealizations3D.delete(point.siblingPointId);
      }
    }
    
    // If deleting a sibling intersection point, also delete the primary
    if ('primaryIntersectionId' in point && point.primaryIntersectionId) {
      const primaryPoint = this.points.get(point.primaryIntersectionId);
      if (primaryPoint) {
        const primaryPlaneId = primaryPoint.planeId;
        this.points.delete(point.primaryIntersectionId);
        this.pointRealizations2D.delete(point.primaryIntersectionId);
        this.pointRealizations3D.delete(point.primaryIntersectionId);
      }
    }

    // Remove from storage
    this.points.delete(id);
    
    // Clean caches
    this.pointRealizations2D.delete(id);
    this.pointRealizations3D.delete(id);
    
    return point;
  }

  /**
   * Factory method to remove a Line2D from the world
   * 
   * @param planeId ID of the projection plane (for consistency)
   * @param id ID of the line to remove
   * @returns The removed line (for undo), or null if not found
   * @throws Error if line has dependents
   */
  removeLine2D(planeId: string, id: string): Line2D | null {
    const line = this.lines.get(id);
    if (!line) {
      return null;
    }

    // Validate planeId matches
    if (line.planeId !== planeId) {
      throw new Error(`Line ${id} is on plane ${line.planeId}, not ${planeId}.`);
    }

    // TODO: Check for dependents (intersection points, parallel/perpendicular lines, guides)

    // Remove from storage
    this.lines.delete(id);
    
    // Clean caches
    this.lineRealizations2D.delete(id);
    
    return line;
  }

  /**
   * Factory method to remove a Segment2D from the world
   */
  removeSegment2D(planeId: string, id: string): Segment2D | null {
    const segment = this.segments.get(id);
    if (!segment) {
      return null;
    }

    // Validate planeId matches
    if (segment.planeId !== planeId) {
      throw new Error(`Segment ${id} is on plane ${segment.planeId}, not ${planeId}.`);
    }

    // Remove from storage
    this.segments.delete(id);
    
    // Clean caches
    this.segmentRealizations2D.delete(id);
    
    return segment;
  }

  /**
   * Factory method to remove a Circle2D from the world
   */
  removeCircle2D(planeId: string, id: string): Circle2D | null {
    const circle = this.circles.get(id);
    if (!circle) {
      return null;
    }

    // Validate planeId matches
    if (circle.planeId !== planeId) {
      throw new Error(`Circle ${id} is on plane ${circle.planeId}, not ${planeId}.`);
    }

    // Remove from storage
    this.circles.delete(id);
    
    // Clean caches
    this.circleRealizations2D.delete(id);
    
    return circle;
  }

  /**
   * Factory method to remove a Guide2D from the world
   */
  removeGuide2D(planeId: string, id: string): Guide2D | null {
    const guide = this.guides.get(id);
    if (!guide) {
      return null;
    }

    // Validate planeId matches
    if (guide.planeId !== planeId) {
      throw new Error(`Guide ${id} is on plane ${guide.planeId}, not ${planeId}.`);
    }

    // Remove from storage
    this.guides.delete(id);
    
    // Clean caches
    this.guideRealizations2D.delete(id);
    
    return guide;
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

  /**
   * Get all HalfHingeLine2D for a specific projection plane
   * Returns the 2D representations of hinge lines that belong to the specified plane.
   * 
   * @param planeId ID of the projection plane
   * @returns Array of HalfHingeLine2D objects for that plane
   */
  getHalfHingeLines2D(planeId: string): HalfHingeLine2D[] {
    return this.getAllLines2D()
      .filter((line): line is HalfHingeLine2D => 
        line.type === 'half-hinge' && line.planeId === planeId
      );
  }

  /**
   * Get the 2D realization of a hinge line on a specific plane
   * @deprecated Use getLine2DRealization with HalfHingeLine2D ID instead
   */
  getHingeLineRealization2D(hingeLineId: string, planeId: string): Line2DRealization2D | null {
    // Fallback: Look for HalfHingeLine2D in the plane
    const halfHinges = this.getHalfHingeLines2D(planeId);
    const halfHinge = halfHinges.find(hh => hh.hingeLineId === hingeLineId);
    if (halfHinge) {
      const result = this.getLine2DRealization(halfHinge.id);
      return result || null;
    }
    
    return null;
  }
}


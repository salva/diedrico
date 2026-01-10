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
import { Circle2D, Circle2DByCenterAndPoint, Circle2DRealization2D } from './Circle';
import { Guide2D, Guide2DRealization2D } from './Guide';
import { HingeLine, HalfHingeLine2D } from './HingeLine';
import { Plane3D } from './Plane';
import { ProjectionPlane, BaseProjectionPlane, ProjectionPlaneRealization2D, ProjectionPlaneRealization3D } from './ProjectionPlane';
import { ProcessTree } from '../processTree/ProcessTree';
import { DependencyService } from '@/services/DependencyService';

export class World {
  // Phase 22.5.3: Element storage removed - now stored in ProjectionPlane only
  private hingeLines: Map<string, HingeLine>;
  private planes: Map<string, Plane3D>;
  projectionPlanes: Map<string, ProjectionPlane>;  // 2D projection planes (public for rendering)
  
  // Construction history
  private processTree: ProcessTree;
  
  // Dependency tracking
  private dependencyService: DependencyService;
  
  // Realization caches - Phase 22.5.3: 2D element realizations now cached in ProjectionPlane
  private pointRealizations3D: Map<string, Point3DRealization3D>;  // Computed 3D point positions
  private projectionPlaneRealizations2D: Map<string, ProjectionPlaneRealization2D>;  // Computed plane 2D transforms
  private projectionPlaneRealizations3D: Map<string, ProjectionPlaneRealization3D>;  // Computed plane 3D transforms
  
  private nextId: number;
  private _version: number = 0;  // For tracking changes and triggering UI updates

  // Fixed elements (always present)
  originPoint?: Vector4;  // O at (0,0,0) in 3D space

  constructor() {
    // Phase 22.5.3: Element storage removed - stored in ProjectionPlane
    this.hingeLines = new Map();
    this.planes = new Map();
    this.projectionPlanes = new Map();
    this.pointRealizations3D = new Map();
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
    // Phase 22.5.3: Clear plane storage instead of World storage
    for (const plane of this.projectionPlanes.values()) {
      plane.clear();
    }
    
    this.hingeLines.clear();
    this.planes.clear();
    this.projectionPlanes.clear();
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
    // Phase 22.5.3: Store in plane instead of World
    projPlaneH.addPoint(pointOH);

    const pointOV = new FreePoint2D('O_V', new Vector3(0, 0, 1), 'proj_plane_V');
    pointOV.locked = true;
    // Phase 22.5.3: Store in plane instead of World
    projPlaneV.addPoint(pointOV);

    // Origin point O at (0,0,0) in 3D space is defined by O_H and O_V
    this.originPoint = new Vector4(0, 0, 0, 1);

    // Create hinge line HL_HV connecting P_H and P_V
    const hingeLineHV = new HingeLine('HL_HV', 'HL_HV', 'proj_plane_H', 'proj_plane_V');
    this.hingeLines.set('HL_HV', hingeLineHV);

    // Create HalfHingeLine2D objects for HL_HV (one per plane)
    // HL_HV appears at v=0 on both P_H and P_V (horizontal line)
    // These are Line2D entities stored in ProjectionPlane
    const halfHingeHV_onPH = new HalfHingeLine2D(
      'half_HL_HV_on_PH',
      'HL_HV',
      'proj_plane_H',
      new Vector3(0, 0, 1),      // Point at origin
      new Vector3(1, 0, 0)       // Horizontal direction (parallel to X-axis)
    );
    projPlaneH.addLine(halfHingeHV_onPH);

    const halfHingeHV_onPV = new HalfHingeLine2D(
      'half_HL_HV_on_PV',
      'HL_HV',
      'proj_plane_V',
      new Vector3(0, 0, 1),      // Point at origin
      new Vector3(1, 0, 0)       // Horizontal direction (parallel to X-axis)
    );
    projPlaneV.addLine(halfHingeHV_onPV);
  }

  /**
   * Get next unique ID counter value (for element ID generation)
   * ProjectionPlane uses this to generate element IDs
   */
  getNextId(): number {
    return this.nextId++;
  }

  /**
   * Helper method to find which plane owns an element
   * @param elementId ID of element to find
   * @returns ProjectionPlane that owns the element, or undefined if not found
   */
  private getPlaneForElement(elementId: string): ProjectionPlane | undefined {
    for (const plane of this.projectionPlanes.values()) {
      if (plane.getPoint(elementId) || plane.getLine(elementId) || plane.getCircle(elementId)) {
        return plane;
      }
    }
    return undefined;
  }

  /**
   * Get a point by searching all planes
   * @param pointId ID of point to get
   * @returns Point if found, undefined otherwise
   */
  private getPoint2DFromPlanes(pointId: string): Point2D | undefined {
    for (const plane of this.projectionPlanes.values()) {
      const point = plane.getPoint(pointId);
      if (point) return point;
    }
    return undefined;
  }

  /**
   * Get a line by searching all planes
   * @param lineId ID of line to get
   * @returns Line if found, undefined otherwise
   */
  private getLine2DFromPlanes(lineId: string): Line2D | undefined {
    for (const plane of this.projectionPlanes.values()) {
      const line = plane.getLine(lineId);
      if (line) return line;
    }
    return undefined;
  }

  /**
   * Get a circle by searching all planes
   * @param circleId ID of circle to get
   * @returns Circle if found, undefined otherwise
   */
  private getCircle2DFromPlanes(circleId: string): Circle2D | undefined {
    for (const plane of this.projectionPlanes.values()) {
      const circle = plane.getCircle(circleId);
      if (circle) return circle;
    }
    return undefined;
  }

  /**
   * Add a point to the world
   * Point must already have an ID assigned
   * @param point Point to add
   * @returns The added point
   * 
   * Phase 22.5: Dual storage - stores in both World and ProjectionPlane during migration
   */
  addPoint2D(point: Point2D): Point2D {
    // Phase 22.5.3: Store ONLY in ProjectionPlane (plane-only storage)
    const plane = this.projectionPlanes.get(point.planeId);
    if (plane) {
      plane.addPoint(point);
    } else {
      console.warn(`Cannot add point ${point.id} to plane ${point.planeId}: plane not found`);
    }
    
    this.notifyChange();
    
    // Realization will be computed lazily on first access via getPoint2DRealization()
    
    return point;
  }

  /**
   * Get the 2D realization for a point (cached or computed on-demand)
   * Implements RealizationContext interface for recursive realization lookup
   */
  getPoint2DRealization(pointId: string): Point2DRealization2D | undefined {
    // Phase 22.5.3: Use plane-only storage
    // Get point from planes
    const point = this.getPoint2DFromPlanes(pointId);
    if (!point) {
      return undefined;
    }

    // Delegate to ProjectionPlane for computation and caching
    const plane = this.projectionPlanes.get(point.planeId);
    if (plane) {
      return plane.realizePoint2D(point, this);
    }

    // Fallback: compute directly if plane not found (shouldn't happen)
    return point.realize2D(this);
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
    // Phase 22.5.3: Clear realizations from ProjectionPlane caches
    // Use dependency service to cascade invalidation to all dependents
    this.dependencyService.invalidateCascade(pointId, (id: string) => {
      // Clear 3D realization cache (still at World level)
      this.pointRealizations3D.delete(id);
      
      // Clear 2D realization caches in all planes
      for (const plane of this.projectionPlanes.values()) {
        plane.clearPointRealization2D(id);
        plane.clearLineRealization2D(id);
        plane.clearCircleRealization2D(id);
      }
    });
    
    // Rebuild dependency maps to reflect any changes
    this.dependencyService.rebuildDependencyMaps();
  }

  // ========================================
  // Line management
  // ========================================

  /**
   * Add a line to the world
   * @param line Line to add
   * @returns The added line
   * 
   * Phase 22.5.3: Plane-only storage - lines stored in ProjectionPlane
   */
  addLine2D(line: Line2D): Line2D {
    // Phase 22.5.3: Store ONLY in ProjectionPlane (plane-only storage)
    const plane = this.projectionPlanes.get(line.planeId);
    if (plane) {
      plane.addLine(line);
    } else {
      console.warn(`Cannot add line ${line.id} to plane ${line.planeId}: plane not found`);
    }
    
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
    // Phase 22.5.3: Use plane-only storage
    // Get line from planes
    const line = this.getLine2DFromPlanes(lineId);
    if (!line) {
      return undefined;
    }

    // Delegate to ProjectionPlane for computation and caching
    const plane = this.projectionPlanes.get(line.planeId);
    if (plane) {
      return plane.realizeLine2D(line, this);
    }

    // Fallback: compute directly if plane not found (shouldn't happen)
    return line.realize2D(this);
  }

  /**
   * Invalidate line realization cache for a specific line
   * Call this when the line's dependencies change
   */
  invalidateLineRealization(lineId: string): void {
    // Phase 22.5.3: Clear realizations from ProjectionPlane caches
    // Use dependency service to cascade invalidation to all dependents
    this.dependencyService.invalidateCascade(lineId, (id: string) => {
      // Clear 3D realization cache (still at World level)
      this.pointRealizations3D.delete(id);
      
      // Clear 2D realization caches in all planes
      for (const plane of this.projectionPlanes.values()) {
        plane.clearPointRealization2D(id);
        plane.clearLineRealization2D(id);
        plane.clearCircleRealization2D(id);
      }
    });
    
    // Rebuild dependency maps to reflect any changes
    this.dependencyService.rebuildDependencyMaps();
  }



  /**
   * Add a segment to the world (generic version - prefer addSegment2DBetweenPoints factory method)
   * @param segment Segment to add (must have ID already set)
   * @returns The added segment
   * 
   * Phase 22.5: Segments are now Line2D - store in both segments (old) and lines (unified) maps
   */
  addSegment2D(segment: Segment2D): Segment2D {
    // Phase 22.5.3: Store ONLY in ProjectionPlane (plane-only storage)
    // Segments are Line2D now, use addLine()
    const plane = this.projectionPlanes.get(segment.planeId);
    if (plane) {
      plane.addLine(segment);  // Segments are Line2D, use addLine()
    } else {
      console.warn(`Cannot add segment ${segment.id} to plane ${segment.planeId}: plane not found`);
    }
    
    this.notifyChange();
    return segment;
  }



  // ========================================
  // CIRCLE METHODS
  // ========================================

  /**
   * Add a circle to the world
   * 
   * Phase 22.5.3: Plane-only storage - circles stored in ProjectionPlane
   */
  addCircle2D(circle: Circle2D): Circle2D {
    // Phase 22.5.3: Store ONLY in ProjectionPlane (plane-only storage)
    const plane = this.projectionPlanes.get(circle.planeId);
    if (plane) {
      plane.addCircle(circle);
    } else {
      console.warn(`Cannot add circle ${circle.id} to plane ${circle.planeId}: plane not found`);
    }
    
    this.notifyChange();
    return circle;
  }

  /**
   * Remove a circle from the world (generic version - prefer removeCircle2D factory method)
   */
  removeCircle2DGeneric(circleId: string): Circle2D | undefined {
    // Phase 22.5.3: Remove from plane storage
    const plane = this.getPlaneForElement(circleId);
    if (plane) {
      const circle = plane.getCircle(circleId);
      plane.removeCircle(circleId);
      return circle;
    }
    return undefined;
  }



  /**
   * Get the 2D realization of a circle (with caching)
   * Returns circle geometry (center and radius) in plane coordinates
   * Phase 22.5: Delegates to ProjectionPlane for computation
   */
  getCircle2DRealization(circleId: string): Circle2DRealization2D | undefined {
    // Phase 22.5.3: Use plane-only storage
    // Get circle from planes
    const circle = this.getCircle2DFromPlanes(circleId);
    if (!circle) {
      return undefined;
    }

    // Delegate to ProjectionPlane for computation and caching
    const plane = this.projectionPlanes.get(circle.planeId);
    if (plane) {
      return plane.realizeCircle2D(circle, this);
    }

    // Fallback: compute directly if plane not found (shouldn't happen)
    return circle.realize2D(this);
  }

  // ========================================
  // Guide Methods
  // ========================================

  /**
   * Add a guide to the world (generic version - prefer addGuide2D factory method)
   */
  addGuide2DGeneric(guide: Guide2D): Guide2D {
    // Phase 22.5.3: Store ONLY in ProjectionPlane (plane-only storage)
    // Guides are Line2D now, use addLine()
    const plane = this.projectionPlanes.get(guide.planeId);
    if (plane) {
      plane.addLine(guide);  // Guides are Line2D, use addLine()
    } else {
      console.warn(`Cannot add guide ${guide.id} to plane ${guide.planeId}: plane not found`);
    }
    
    this.notifyChange();
    return guide;
  }



  // ========================================
  // Plane Methods
  // ========================================

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

    const plane = this.projectionPlanes.get(planeId)!;
    const point = plane.addFreePoint2D(
      position,
      this,
      id
    );
    
    this.notifyChange();
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

    // Validate elements exist and are on same plane (search all planes)
    const element1 = this.getLine2DFromPlanes(element1Id) || this.getCircle2DFromPlanes(element1Id);
    const element2 = this.getLine2DFromPlanes(element2Id) || this.getCircle2DFromPlanes(element2Id);
    
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

    const plane = this.projectionPlanes.get(planeId)!;
    const point = plane.addIntersectionPoint2D(
      element1Id,
      element2Id,
      index,
      this,
      id
    );
    
    this.notifyChange();
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
    // Phase 22.5.3: Search planes
    const element1 = this.getLine2DFromPlanes(element1Id);
    const element2 = this.getLine2DFromPlanes(element2Id);
    
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
      const plane = this.projectionPlanes.get(siblingPlaneId)!;
      siblingId = plane.generatePoint2DId(this);
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

    const plane = this.projectionPlanes.get(planeId)!;
    const line = plane.addLine2DBetweenTwoPoints(
      point1Id,
      point2Id,
      this,
      id
    );
    
    this.notifyChange();
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

    const plane = this.projectionPlanes.get(planeId)!;
    const segment = plane.addSegment2DBetweenPoints(
      point1Id,
      point2Id,
      this,
      id
    );
    
    this.notifyChange();
    return segment;
  }

  // ========================================
  // ========================================
  // Factory Methods for Guide2D
  // ========================================

  /**
   * Factory method to create and add a Guide2D to the world
   * 
   * @param planeId ID of the projection plane this guide belongs to
   * @param referenceLineId ID of the line to be perpendicular to
   * @param throughPointId ID of the point the guide passes through
   * @param id Optional ID for redo operations. If not provided, generates a new one.
   * @returns The created Guide2D
   * @throws Error if validation fails (invalid plane, missing line/point)
   */
  addGuide2D(
    planeId: string,
    referenceLineId: string,
    throughPointId: string,
    id?: string
  ): Guide2D {
    // Validate plane exists
    if (!this.projectionPlanes.has(planeId)) {
      throw new Error(`Invalid planeId: ${planeId}. Plane does not exist.`);
    }

    const plane = this.projectionPlanes.get(planeId)!;
    const guide = plane.addGuide2D(
      referenceLineId,
      throughPointId,
      this,
      id
    );
    
    this.notifyChange();
    return guide;
  }

  // ========================================
  // Factory Methods for Circle2D
  // ========================================

  /**
   * Factory method to create and add a Circle2DByCenterAndPoint to the world
   * 
   * @param planeId ID of the projection plane this circle belongs to
   * @param centerPointId ID of center point
   * @param circumferencePointId ID of point on circumference
   * @param id Optional ID for redo operations
   * @returns The created Circle2DByCenterAndPoint
   */
  addCircle2DByCenterAndPoint(
    planeId: string,
    centerPointId: string,
    circumferencePointId: string,
    id?: string
  ): Circle2DByCenterAndPoint {
    // Validate plane exists
    if (!this.projectionPlanes.has(planeId)) {
      throw new Error(`Invalid planeId: ${planeId}. Plane does not exist.`);
    }

    const plane = this.projectionPlanes.get(planeId)!;
    const circle = plane.addCircle2DByCenterAndPoint(
      centerPointId,
      circumferencePointId,
      this,
      id
    );
    
    this.notifyChange();
    return circle;
  }

  /**
   * Factory method to create circle by center and radius (placeholder)
   * NOTE: This is a temporary stub. AddCircleOp should be refactored to use addCircle2DByCenterAndPoint.
   * 
   * @param _planeId ID of the projection plane
   * @param _centerPointId ID of center point
   * @param _radius Radius value
   * @param _id Optional ID for redo operations
   * @throws Error - not implemented
   */
  addCircle2DByCenter(
    _planeId: string,
    _centerPointId: string,
    _radius: number,
    _id?: string
  ): Circle2DByCenterAndPoint {
    throw new Error('addCircle2DByCenter not implemented. Refactor AddCircleOp to use addCircle2DByCenterAndPoint instead.');
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
    // Phase 22.5.3: Get point from planes
    const point = this.getPoint2DFromPlanes(id);
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
      const siblingPoint = this.getPoint2DFromPlanes(point.siblingPointId);
      if (siblingPoint) {
        const siblingPlane = this.projectionPlanes.get(siblingPoint.planeId);
        if (siblingPlane) {
          siblingPlane.removePoint(point.siblingPointId);
        }
      }
    }
    
    // If deleting a sibling intersection point, also delete the primary
    if ('primaryIntersectionId' in point && point.primaryIntersectionId) {
      const primaryPoint = this.getPoint2DFromPlanes(point.primaryIntersectionId);
      if (primaryPoint) {
        const primaryPlane = this.projectionPlanes.get(primaryPoint.planeId);
        if (primaryPlane) {
          primaryPlane.removePoint(point.primaryIntersectionId);
        }
      }
    }

    // Remove from plane storage
    const plane = this.projectionPlanes.get(point.planeId);
    if (plane) {
      plane.removePoint(id);
    }
    
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
    // Phase 22.5.3: Get from planes
    const line = this.getLine2DFromPlanes(id);
    if (!line) {
      return null;
    }

    // Validate planeId matches
    if (line.planeId !== planeId) {
      throw new Error(`Line ${id} is on plane ${line.planeId}, not ${planeId}.`);
    }

    // TODO: Check for dependents (intersection points, parallel/perpendicular lines, guides)

    // Remove from plane storage
    const plane = this.projectionPlanes.get(planeId);
    if (plane) {
      plane.removeLine(id);
    }
    
    return line;
  }

  /**
   * Factory method to remove a Segment2D from the world
   */
  removeSegment2D(planeId: string, id: string): Segment2D | null {
    // Phase 22.5.3: Segments are Line2D, get from plane
    const plane = this.projectionPlanes.get(planeId);
    if (!plane) {
      return null;
    }
    
    const line = plane.getLine(id);
    const segment = line && line.type === 'segment' ? line as Segment2D : null;
    
    if (!segment) {
      return null;
    }

    // Remove from plane storage (segments stored as lines)
    plane.removeLine(id);
    
    return segment;
  }

  /**
   * Factory method to remove a Circle2D from the world
   */
  removeCircle2D(planeId: string, id: string): Circle2D | null {
    // Phase 22.5.3: Get from planes
    const circle = this.getCircle2DFromPlanes(id);
    if (!circle) {
      return null;
    }

    // Validate planeId matches
    if (circle.planeId !== planeId) {
      throw new Error(`Circle ${id} is on plane ${circle.planeId}, not ${planeId}.`);
    }

    // Remove from plane storage
    const plane = this.projectionPlanes.get(planeId);
    if (plane) {
      plane.removeCircle(id);
    }
    
    return circle;
  }

  /**
   * Factory method to remove a Guide2D from the world
   */
  removeGuide2D(planeId: string, id: string): Guide2D | null {
    // Phase 22.5.3: Guides are Line2D, get from planes
    const plane = this.projectionPlanes.get(planeId);
    if (!plane) {
      return null;
    }
    
    const guide = plane.getLine(id);
    if (!guide || guide.type !== 'perpendicular-to-line') {
      return null;
    }

    // Validate planeId matches
    if (guide.planeId !== planeId) {
      throw new Error(`Guide ${id} is on plane ${guide.planeId}, not ${planeId}.`);
    }

    // Remove from plane storage (guides stored as lines)
    plane.removeLine(id);
    
    return guide as Guide2D;
  }

  // ========================================
  // Restore Methods (for undo operations)
  // ========================================

  /**
   * Restore a previously removed Point2D (for undo)
   */
  restorePoint2D(planeId: string, point: Point2D): void {
    // Phase 22.5.3: Use plane storage
    const plane = this.projectionPlanes.get(planeId);
    if (plane) {
      plane.addPoint(point);
    }
    this.notifyChange();
  }

  /**
   * Restore a previously removed Line2D (for undo)
   */
  restoreLine2D(planeId: string, line: Line2D): void {
    // Phase 22.5.3: Use plane storage
    const plane = this.projectionPlanes.get(planeId);
    if (plane) {
      plane.addLine(line);
    }
    this.notifyChange();
  }

  /**
   * Restore a previously removed Segment2D (for undo)
   */
  restoreSegment2D(planeId: string, segment: Segment2D): void {
    // Phase 22.5.3: Use plane storage (segments are lines)
    const plane = this.projectionPlanes.get(planeId);
    if (plane) {
      plane.addLine(segment);
    }
    this.notifyChange();
  }

  /**
   * Restore a previously removed Circle2D (for undo)
   */
  restoreCircle2D(planeId: string, circle: Circle2D): void {
    // Phase 22.5.3: Use plane storage
    const plane = this.projectionPlanes.get(planeId);
    if (plane) {
      plane.addCircle(circle);
    }
    this.notifyChange();
  }

  /**
   * Restore a previously removed Guide2D (for undo)
   */
  restoreGuide2D(planeId: string, guide: Guide2D): void {
    // Phase 22.5.3: Use plane storage (guides are lines)
    const plane = this.projectionPlanes.get(planeId);
    if (plane) {
      plane.addLine(guide);
    }
    this.notifyChange();
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
    // Search the specific plane for half hinge lines
    const plane = this.projectionPlanes.get(planeId);
    if (!plane) return [];
    
    const allLines = plane.getAllLines();
    return allLines.filter((line): line is HalfHingeLine2D => 
      line.type === 'half-hinge'
    );
  }
}


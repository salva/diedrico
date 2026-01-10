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
import { Point2D, FreePoint2D, Point2DRealization2D, Point3DRealization3D } from './Point';
import { Line2D, Line2DRealization2D } from './Line';
import { Segment2D } from './Segment';
import { Circle2D, Circle2DRealization2D } from './Circle';
import { Guide2D } from './Guide';
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
    const point = this.getPoint2DFromPlanes(pointId);
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

  // ========================================
  // Convenience Getter Methods for UI
  // These methods aggregate data from all ProjectionPlanes
  // ========================================

  /**
   * Get all points from all projection planes
   * @returns Array of all Point2D objects
   */
  getAllPoints2D(): Point2D[] {
    const allPoints: Point2D[] = [];
    for (const plane of this.projectionPlanes.values()) {
      allPoints.push(...plane.getAllPoints());
    }
    return allPoints;
  }

  /**
   * Get all lines from all projection planes
   * @returns Array of all Line2D objects
   */
  getAllLines2D(): Line2D[] {
    const allLines: Line2D[] = [];
    for (const plane of this.projectionPlanes.values()) {
      allLines.push(...plane.getAllLines());
    }
    return allLines;
  }

  /**
   * Get a point by ID (searches all planes)
   * @param pointId ID of the point
   * @returns Point if found, undefined otherwise
   */
  getPoint2DById(pointId: string): Point2D | undefined {
    return this.getPoint2DFromPlanes(pointId);
  }

  /**
   * Get a line by ID (searches all planes)
   * @param lineId ID of the line
   * @returns Line if found, undefined otherwise
   */
  getLine2DById(lineId: string): Line2D | undefined {
    return this.getLine2DFromPlanes(lineId);
  }
}


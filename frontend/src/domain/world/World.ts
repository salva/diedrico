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
 * ## Architecture: Element Access Patterns (Phase 48)
 * 
 * **Ownership Hierarchy**: World → ProjectionPlane → Element2D
 * - 2D elements (points, lines, circles, etc.) are stored in and owned by ProjectionPlane
 * - World provides high-level access methods but does NOT store 2D elements directly
 * - This ensures proper encapsulation and clear ownership boundaries
 * 
 * **How to Access Elements**:
 * 
 * 1. **Via Hierarchical ID** (Phase 45 - preferred for known IDs):
 *    ```typescript
 *    const point = world.getPoint2D(pointId);        // Returns Point2D | undefined
 *    const line = world.getLine2D(lineId);           // Returns Line2D | undefined
 *    const circle = world.getCircle2D(circleId);     // Returns Circle2D | undefined
 *    const element = world.getElement2D(elementId);  // Returns Element2D | undefined
 *    ```
 *    These methods use hierarchical IDs (e.g., "proj_plane_1:point_5") to find the 
 *    correct plane and retrieve the element. Type-safe and fast.
 * 
 * 2. **Via ProjectionPlane** (when you already have the plane):
 *    ```typescript
 *    const plane = world.getProjectionPlaneById(planeId);
 *    const point = plane.getPoint(pointId);
 *    const line = plane.getLine(lineId);
 *    ```
 * 
 * 3. **Getting Realizations** (computed geometric data):
 *    ```typescript
 *    const plane = world.getProjectionPlaneById(planeId);
 *    const point = plane.getPoint(pointId);
 *    const realization = point?.realize2D(world);  // Get computed coordinates
 *    ```
 *    Realizations contain the actual computed positions/geometry. The domain object
 *    stores the construction definition (e.g., "intersection of line A and circle B"),
 *    while the realization stores the computed result (e.g., actual [x, y] coordinates).
 * 
 * 4. **Iterating All Elements** (for operations like select-all, export):
 *    ```typescript
 *    for (const plane of world.getAllProjectionPlanes()) {
 *      for (const point of plane.getAllPoints()) {
 *        // Process each point
 *      }
 *    }
 *    ```
 * 
 * 5. **Semantic Access** (Phase 46 - for fixed initial planes):
 *    ```typescript
 *    const horizontalPlane = world.getHorizontalPlane();
 *    const verticalPlane = world.getVerticalPlane();
 *    const origin = world.getHorizontalOrigin();
 *    const hingeLine = world.getMainHingeLine();
 *    ```
 * 
 * **Why Facade Methods Were Removed** (Phase 48):
 * 
 * Previous versions had convenience methods like `world.getPoint2DRealization(id)` that
 * bypassed ProjectionPlane ownership. These were removed because:
 * - **Violated encapsulation**: World shouldn't know about ProjectionPlane's internal storage
 * - **Tight coupling**: Client code became dependent on World instead of ProjectionPlane
 * - **Inconsistent patterns**: Some code used facade, some used proper ownership
 * - **Maintenance burden**: World had to mirror ProjectionPlane's interface
 * 
 * The current architecture enforces proper ownership: ProjectionPlane owns its elements,
 * World provides semantic access and ID-based lookup.
 * 
 * @see specs/001-dihedral-learning-mvp/data-model.md#world-entity
 * @see Phase 45: Hierarchical Element IDs
 * @see Phase 46: Semantic Accessors
 * @see Phase 48: Remove World Facade Methods
 */

import { Vector4 } from 'three';
import { applyMatrix4x3 } from '@/utils/threeUtils';
import { Point2D, FreePoint2D, Point3DRealization3D } from './Point';
import { Line2D } from './Line';
import { Segment2D } from './Segment';
import { Circle2D } from './Circle';
import { Guide2D } from './Guide';
import { HingeLine, HalfHingeLine2D } from './HingeLine';
import { Plane3D } from './Plane';
import { ProjectionPlane, ProjectionPlaneRealization2D, ProjectionPlaneRealization3D, BaseProjectionPlane } from './ProjectionPlane';
import { ProcessTree } from '../processTree/ProcessTree';
import { DependencyService } from '@/services/DependencyService';
import { Element2D } from './Element2D';
import { getContainerIdFromElementId } from './ElementId';
import { Command } from '@/commands/Command';
import { buildWorldInitialization } from '@/commands/factories/InitializationSequenceFactory';

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

  // Phase 46: Semantic references to initial entities (track by role, not hardcoded ID)
  // These are set during initialization and provide semantic access to the initial planes
  private horizontalPlaneId!: string;    // ID of horizontal projection plane (formerly 'proj_plane_H')
  private verticalPlaneId!: string;      // ID of vertical projection plane (formerly 'proj_plane_V')
  private horizontalOriginId!: string;   // ID of origin point on horizontal plane
  private verticalOriginId!: string;     // ID of origin point on vertical plane
  private mainHingeLineId!: string;      // ID of main hinge line connecting the two planes
  private activePlaneId!: string;        // ID of currently active projection plane (set by initialization factory)
  
  // Phase 46: ID generation counters for automatic ID assignment
  private projPlaneCounter: number = 0;
  private planeCounter: number = 0;
  private hingeLineCounter: number = 0;

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
    
    // Phase 47: Initialize fixed elements using factory + Command
    // Factory pattern: Operations are added directly to Command by factory
    // This avoids Command subclasses while maintaining initialization logic
    const initCmd = new Command('Initialize World', this);
    buildWorldInitialization(this, initCmd);
    initCmd.commit();
    // Note: Not pushed to CommandStack - initialization is non-undoable
    
    this.notifyChange();
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
    
    // Phase 47: Reinitialize fixed elements using factory + Command
    const initCmd = new Command('Initialize World', this);
    buildWorldInitialization(this, initCmd);
    initCmd.commit();
    // Note: Not pushed to CommandStack - initialization is non-undoable
    
    // Notify UI of change
    this.notifyChange();
  }



  /**
   * Get next unique ID counter value (for element ID generation)
   * ProjectionPlane uses this to generate element IDs
   */
  getNextId(): number {
    return this.nextId++;
  }

  /**
   * Phase 46: Generate unique projection plane ID
   * @returns Unique projection plane ID (e.g., 'proj_plane_1', 'proj_plane_2')
   */
  generateProjPlaneId(): string {
    return `proj_plane_${++this.projPlaneCounter}`;
  }

  /**
   * Phase 46: Generate unique 3D plane ID
   * @returns Unique plane ID (e.g., 'plane_1', 'plane_2')
   */
  generatePlaneId(): string {
    return `plane_${++this.planeCounter}`;
  }

  /**
   * Phase 46: Generate unique hinge line ID
   * @returns Unique hinge line ID (e.g., 'HL_1', 'HL_2')
   */
  generateHingeLineId(): string {
    return `HL_${++this.hingeLineCounter}`;
  }

  /**
   * Element factory: Create 3D plane
   * 
   * Creates a 3D plane (horizontal or vertical) and adds it to World.
   * If planeId is not provided, generates a new ID.
   * 
   * @param orientation - 'horizontal' or 'vertical'
   * @param planeId - Optional ID (for redo support)
   * @returns Created Plane3D instance
   */
  addPlane3D(orientation: 'horizontal' | 'vertical', planeId?: string): Plane3D {
    const id = planeId || this.generatePlaneId();
    
    const plane = orientation === 'horizontal' 
      ? Plane3D.createPH() 
      : Plane3D.createPV();
    
    plane.id = id;
    this.planes.set(id, plane);
    
    return plane;
  }

  /**
   * Element factory: Create projection plane
   * 
   * Creates a projection plane associated with a 3D plane and adds it to World.
   * If projPlaneId is not provided, generates a new ID.
   * Sets semantic references (horizontalPlaneId/verticalPlaneId) on World.
   * 
   * @param plane3DId - ID of associated 3D plane
   * @param orientation - 'horizontal' or 'vertical'
   * @param projPlaneId - Optional ID (for redo support)
   * @returns Created ProjectionPlane instance
   */
  addProjectionPlane(
    plane3DId: string, 
    orientation: 'horizontal' | 'vertical', 
    projPlaneId?: string
  ): ProjectionPlane {
    const id = projPlaneId || this.generateProjPlaneId();
    
    const projPlane = orientation === 'horizontal'
      ? BaseProjectionPlane.createPH()
      : BaseProjectionPlane.createPV();
    
    projPlane.id = id;
    projPlane.plane3DId = plane3DId;
    
    this.projectionPlanes.set(id, projPlane);
    
    // Set semantic reference on World
    if (orientation === 'horizontal') {
      this.horizontalPlaneId = id;
    } else {
      this.verticalPlaneId = id;
    }
    
    return projPlane;
  }

  /**
   * Element factory: Create hinge line (3D object only)
   * 
   * Creates a 3D HingeLine object connecting two projection planes.
   * Does NOT create the 2D half hinge lines - those are separate operations.
   * If hingeLineId is not provided, generates a new ID.
   * Sets mainHingeLineId semantic reference on World.
   * 
   * @param horizontalPlaneId - ID of horizontal projection plane
   * @param verticalPlaneId - ID of vertical projection plane
   * @param hingeLineId - Optional ID (for redo support)
   * @returns Created HingeLine instance
   */
  addHingeLine(
    horizontalPlaneId: string,
    verticalPlaneId: string,
    hingeLineId?: string
  ): HingeLine {
    const id = hingeLineId || this.generateHingeLineId();
    
    const hingeLine = new HingeLine(
      id,
      id, // label same as ID
      horizontalPlaneId,
      verticalPlaneId
    );
    
    this.hingeLines.set(id, hingeLine);
    this.mainHingeLineId = id;
    
    return hingeLine;
  }

  /**
   * Get active projection plane ID
   * @returns ID of currently active projection plane
   */
  getActivePlaneId(): string {
    return this.activePlaneId;
  }

  /**
   * Set active projection plane (used by operations)
   * @param planeId ID of plane to make active
   */
  setActivePlaneId(planeId: string): void {
    if (!this.projectionPlanes.has(planeId)) {
      throw new Error(`[World] Cannot set active plane: plane ${planeId} does not exist`);
    }
    this.activePlaneId = planeId;
    this.notifyChange();
  }

  /**
   * Phase 46: Get horizontal projection plane (semantic access)
   * @returns Horizontal projection plane
   */
  getHorizontalPlane(): ProjectionPlane {
    const plane = this.projectionPlanes.get(this.horizontalPlaneId);
    if (!plane) {
      throw new Error('[World] Horizontal plane not initialized');
    }
    return plane;
  }

  /**
   * Phase 46: Get vertical projection plane (semantic access)
   * @returns Vertical projection plane
   */
  getVerticalPlane(): ProjectionPlane {
    const plane = this.projectionPlanes.get(this.verticalPlaneId);
    if (!plane) {
      throw new Error('[World] Vertical plane not initialized');
    }
    return plane;
  }

  /**
   * Phase 46: Get horizontal origin point (semantic access)
   * @returns Origin point on horizontal plane
   */
  getHorizontalOrigin(): FreePoint2D {
    const plane = this.getHorizontalPlane();
    const point = plane.getPoint(this.horizontalOriginId);
    if (!point || !(point instanceof FreePoint2D)) {
      throw new Error('[World] Horizontal origin not found');
    }
    return point;
  }

  /**
   * Phase 46: Get vertical origin point (semantic access)
   * @returns Origin point on vertical plane
   */
  getVerticalOrigin(): FreePoint2D {
    const plane = this.getVerticalPlane();
    const point = plane.getPoint(this.verticalOriginId);
    if (!point || !(point instanceof FreePoint2D)) {
      throw new Error('[World] Vertical origin not found');
    }
    return point;
  }

  /**
   * Phase 46: Get main hinge line (semantic access)
   * @returns Main hinge line connecting horizontal and vertical planes
   */
  getMainHingeLine(): HingeLine {
    const hingeLine = this.hingeLines.get(this.mainHingeLineId);
    if (!hingeLine) {
      throw new Error('[World] Main hinge line not found');
    }
    return hingeLine;
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
    const realization2D = point.realize2D(this);
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
   * Get all projection planes
   * @returns Array of all ProjectionPlane objects
   */
  getAllProjectionPlanes(): ProjectionPlane[] {
    return Array.from(this.projectionPlanes.values());
  }

  /**
   * Get any 2D element by hierarchical ID (Phase 45)
   * Parses ID to find container plane and retrieve element
   * 
   * @param id Hierarchical ID in format "{planeId}/{localId}"
   * @returns Element2D (Point2D, Line2D, or Circle2D) or undefined if not found
   * 
   * @example
   * world.getElement2D("proj_plane_H/point2d_1") // FreePoint2D
   * world.getElement2D("proj_plane_V/line2d_5")   // Line2DByTwoPoints
   */
  getElement2D(id: string): Element2D | undefined {
    try {
      const containerId = getContainerIdFromElementId(id);
      const plane = this.getProjectionPlaneById(containerId);
      
      if (!plane) {
        return undefined;
      }
      
      // Try each element type
      return plane.getPoint(id) ||
             plane.getLine(id) ||
             plane.getCircle(id);
    } catch (error) {
      // Invalid ID format
      return undefined;
    }
  }

  /**
   * Get Point2D by hierarchical ID (Phase 45)
   * Type-safe variant of getElement2D() for points
   * 
   * @param id Hierarchical ID in format "{planeId}/{localId}"
   * @returns Point2D or undefined if not found or not a point
   */
  getPoint2D(id: string): Point2D | undefined {
    try {
      const containerId = getContainerIdFromElementId(id);
      const plane = this.getProjectionPlaneById(containerId);
      return plane?.getPoint(id);
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Get Line2D by hierarchical ID (Phase 45)
   * Type-safe variant of getElement2D() for lines
   * 
   * @param id Hierarchical ID in format "{planeId}/{localId}"
   * @returns Line2D or undefined if not found or not a line
   */
  getLine2D(id: string): Line2D | undefined {
    try {
      const containerId = getContainerIdFromElementId(id);
      const plane = this.getProjectionPlaneById(containerId);
      return plane?.getLine(id);
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Get Circle2D by hierarchical ID (Phase 45)
   * Type-safe variant of getElement2D() for circles
   * 
   * @param id Hierarchical ID in format "{planeId}/{localId}"
   * @returns Circle2D or undefined if not found or not a circle
   */
  getCircle2D(id: string): Circle2D | undefined {
    try {
      const containerId = getContainerIdFromElementId(id);
      const plane = this.getProjectionPlaneById(containerId);
      return plane?.getCircle(id);
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Get all planes
   */
  getAllPlanes(): Plane3D[] {
    return Array.from(this.planes.values());
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

  /**
   * Get parent HingeLine from a HalfHingeLine2D
   * 
   * @param halfHingeLineId ID of the HalfHingeLine2D
   * @returns Parent HingeLine or undefined if not found
   */
  getHingeLineFromHalfHingeLine(halfHingeLineId: string): HingeLine | undefined {
    // Get the HalfHingeLine2D by searching all planes
    const halfHingeLine = this.getLine2D(halfHingeLineId);
    if (!halfHingeLine || halfHingeLine.type !== 'half-hinge') {
      return undefined;
    }
    
    // Cast to HalfHingeLine2D to access hingeLineId
    const halfHL = halfHingeLine as HalfHingeLine2D;
    return this.getHingeLineById(halfHL.hingeLineId);
  }

  /**
   * Get sibling projection plane for an intersection point
   * 
   * If the intersection involves a HalfHingeLine2D, returns the other plane
   * connected by the parent HingeLine. Otherwise returns undefined.
   * 
   * Algorithm:
   * 1. Check if intersection point involves a HalfHingeLine2D
   * 2. If yes: HalfHingeLine2D → hingeLineId → HingeLine → getOtherPlane(currentPlaneId)
   * 3. If no: return undefined (not a HHL intersection, no sibling)
   * 
   * @param intersectionPoint The intersection point to check
   * @returns Sibling plane ID if HHL intersection, undefined otherwise
   */
  getSiblingPlaneForIntersection(intersectionPoint: Point2D): string | undefined {
    // Determine element IDs based on intersection type
    let element1Id: string | undefined;
    let element2Id: string | undefined;

    if (intersectionPoint.type === 'line-line-intersection') {
      const llIntersection = intersectionPoint as any;
      element1Id = llIntersection.line1Id;
      element2Id = llIntersection.line2Id;
    } else if (intersectionPoint.type === 'line-circle-intersection') {
      const lcIntersection = intersectionPoint as any;
      element1Id = lcIntersection.lineId;
      element2Id = lcIntersection.circleId;
    } else if (intersectionPoint.type === 'circle-circle-intersection') {
      const ccIntersection = intersectionPoint as any;
      element1Id = ccIntersection.circle1Id;
      element2Id = ccIntersection.circle2Id;
    } else {
      // Not a standard intersection type
      return undefined;
    }

    // Check if either element is a HalfHingeLine2D
    const element1 = element1Id ? this.getLine2D(element1Id) : undefined;
    const element2 = element2Id ? this.getLine2D(element2Id) : undefined;

    let halfHingeLine: HalfHingeLine2D | undefined;

    if (element1 && element1.type === 'half-hinge') {
      halfHingeLine = element1 as HalfHingeLine2D;
    } else if (element2 && element2.type === 'half-hinge') {
      halfHingeLine = element2 as HalfHingeLine2D;
    }

    if (!halfHingeLine) {
      // Not a HalfHingeLine intersection
      return undefined;
    }

    // Get parent HingeLine and determine sibling plane
    const hingeLine = this.getHingeLineById(halfHingeLine.hingeLineId);
    if (!hingeLine) {
      console.warn(`[World.getSiblingPlaneForIntersection] HingeLine ${halfHingeLine.hingeLineId} not found`);
      return undefined;
    }

    // Get the other plane (sibling plane)
    const siblingPlaneId = hingeLine.getOtherPlane(intersectionPoint.planeId);
    return siblingPlaneId || undefined;
  }

  /**
   * Get sibling plane and corresponding HalfHingeLine2D for a guide
   * 
   * Given a HalfHingeLine2D ID and the current plane, returns the sibling plane ID
   * and the corresponding HalfHingeLine2D in that plane.
   * 
   * Algorithm:
   * 1. Get HalfHingeLine2D from ID
   * 2. Get parent HingeLine via hingeLineId
   * 3. Get other plane via HingeLine.getOtherPlane()
   * 4. Find HalfHingeLine2D in sibling plane with same hingeLineId
   * 
   * @param halfHingeLineId ID of the HalfHingeLine2D in current plane
   * @param currentPlaneId ID of the current plane
   * @returns Object with siblingPlaneId and siblingHalfHingeLineId, or undefined if not found
   */
  getSiblingPlaneAndHalfHingeLineForGuide(
    halfHingeLineId: string,
    currentPlaneId: string
  ): { siblingPlaneId: string; siblingHalfHingeLineId: string } | undefined {
    // Get HalfHingeLine2D
    const halfHingeLine = this.getLine2D(halfHingeLineId);
    if (!halfHingeLine || halfHingeLine.type !== 'half-hinge') {
      return undefined;
    }

    const halfHL = halfHingeLine as HalfHingeLine2D;

    // Get parent HingeLine
    const hingeLine = this.getHingeLineById(halfHL.hingeLineId);
    if (!hingeLine) {
      console.warn(`[World.getSiblingPlaneAndHalfHingeLineForGuide] HingeLine ${halfHL.hingeLineId} not found`);
      return undefined;
    }

    // Get sibling plane
    const siblingPlaneId = hingeLine.getOtherPlane(currentPlaneId);
    if (!siblingPlaneId) {
      return undefined;
    }

    // Find corresponding HalfHingeLine2D in sibling plane
    const siblingPlane = this.getProjectionPlaneById(siblingPlaneId);
    if (!siblingPlane) {
      return undefined;
    }

    // Find HalfHingeLine2D with same hingeLineId in sibling plane
    const siblingHalfHingeLine = siblingPlane.getAllLines().find(
      (line) => line.type === 'half-hinge' && (line as HalfHingeLine2D).hingeLineId === halfHL.hingeLineId
    );

    if (!siblingHalfHingeLine) {
      console.warn(`[World.getSiblingPlaneAndHalfHingeLineForGuide] No matching HalfHingeLine2D found in sibling plane ${siblingPlaneId}`);
      return undefined;
    }

    return {
      siblingPlaneId,
      siblingHalfHingeLineId: siblingHalfHingeLine.id
    };
  }

  // ========================================
  // Convenience Getter Methods for UI
  // These methods aggregate data from all ProjectionPlanes
  // ========================================

  /**
   * Get all points from all projection planes
   * @returns Array of all Point2D objects
   */
  /**
   * Get all lines across all planes
   * Deprecated: Use plane.getAllLines() for plane-specific access
   * Or world.getAllProjectionPlanes() to iterate planes
   */
  /**
   * Get a point by ID (searches all planes)
   * @param pointId ID of the point
   * @returns Point if found, undefined otherwise
   */
}


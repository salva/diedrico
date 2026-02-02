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
 *    const horizontalPlane = world.getProjectionPlaneByLabel('P_H');
 *    const verticalPlane = world.getProjectionPlaneByLabel('P_V');
 *    const originH = horizontalPlane.getPoint2DByLabel('O_H');  // Phase 53
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

import { Vector4, Matrix3 } from 'three';
import { applyMatrix4x3, Matrix4x3, Matrix3x4 } from '@/utils/threeUtils';
import { Point2D, Point2DLineLineIntersection, Point2DLineCircleIntersection, Point2DCircleCircleIntersection } from './Point';
import { Line2D } from './Line';
import { Segment2D, Segment2DByPoints } from './Segment';
import { Circle2D } from './Circle';
import { Guide2D } from './Guide';
import { HingeLine, HalfHingeLine2D } from './HingeLine';
import { Plane3D, Plane3DFixed } from './Plane';
import { ProjectionPlane, ProjectionPlaneRealization2D, ProjectionPlaneRealization3D, BaseProjectionPlane } from './ProjectionPlane';
import { ProcessTree } from '../processTree/ProcessTree';
import { DependencyService } from '@/services/DependencyService';
import { Element2D } from './Element2D';

// Phase 78: 3D element domain types
import type { Point3D } from './Point3D';
import type { Line3D } from './Line3D';
import type { Segment3D } from './Segment3D';

// Phase 78: 3D element realization types (Element3DRealization3D.ts)
import { Point3DRealization3D, Line3DRealization3D, Segment3DRealization3D, Plane3DRealization3D } from './Element3DRealization3D';
import { getContainerIdFromElementId } from './ElementId';
import { Command } from '@/commands/Command';
import { buildWorldInitialization } from '@/commands/factories/InitializationSequenceFactory';
import { createActionGroup } from '@/domain/processTree/ActionGroup';
import { AddProcessTreeActionGroupOp } from '@/commands/operations/processTree/AddProcessTreeActionGroupOp';
import { PushSubprocessOp, PopSubprocessOp } from '@/commands/operations/processTree';
import type { CommandStack } from '@/commands/CommandStack';

export class World {
  // Phase 22.5.3: Element storage removed - now stored in ProjectionPlane only
  private hingeLines: Map<string, HingeLine>;
  private planes3D: Map<string, Plane3D>;        // All 3D planes (base P_H, P_V + user-created)
  projectionPlanes: Map<string, ProjectionPlane>;  // All projection planes (base + auxiliary)
  
  // Phase 78: User-created 3D elements (domain layer - definitions)
  private points3D: Map<string, Point3D>;        // User-created 3D points from projections
  private lines3D: Map<string, Line3D>;          // User-created 3D lines from projections
  private segments3D: Map<string, Segment3D>;    // User-created 3D segments from projections
  
  // Construction history
  private processTree: ProcessTree;
  
  // Dependency tracking
  private dependencyService: DependencyService;
  
  // Realization caches - Phase 22.5.3: 2D element realizations now cached in ProjectionPlane
  private pointRealizations3D: Map<string, Point3DRealization3D>;  // Computed 3D point positions
  private projectionPlaneRealizations2D: Map<string, ProjectionPlaneRealization2D>;  // Computed plane 2D transforms
  private projectionPlaneRealizations3D: Map<string, ProjectionPlaneRealization3D>;  // Computed plane 3D transforms
  
  // Phase 78: 3D element realization caches (computed numeric geometry)
  private lineRealizations3D: Map<string, Line3DRealization3D>;       // Computed 3D line geometry
  private segmentRealizations3D: Map<string, Segment3DRealization3D>; // Computed 3D segment geometry
  private planeRealizations3D: Map<string, Plane3DRealization3D>;     // Computed 3D plane equations
  
  private nextId: number;
  private _version: number = 0;  // For tracking changes and triggering UI updates
  private changeListeners: Array<() => void> = [];  // Phase 80: Observer pattern for view updates

  // Active plane tracking
  private activePlaneId?: string;  // Currently active projection plane for user interactions

  // Fixed elements (always present)
  originPoint?: Vector4;  // O at (0,0,0) in 3D space
  
  // Phase 78: ID generation counters for 3D elements
  private point3DCounter: number = 0;
  private line3DCounter: number = 0;
  private segment3DCounter: number = 0;
  private plane3DUserCounter: number = 0;

  constructor() {
    // Phase 22.5.3: Element storage removed - stored in ProjectionPlane
    this.hingeLines = new Map();
    this.planes3D = new Map();
    this.projectionPlanes = new Map();
    
    // Phase 78: Initialize 3D element storage
    this.points3D = new Map();
    this.lines3D = new Map();
    this.segments3D = new Map();
    
    // Initialize realization caches
    this.pointRealizations3D = new Map();
    this.projectionPlaneRealizations2D = new Map();
    this.projectionPlaneRealizations3D = new Map();
    
    // Phase 78: Initialize 3D realization caches
    this.lineRealizations3D = new Map();
    this.segmentRealizations3D = new Map();
    this.planeRealizations3D = new Map();
    
    this.nextId = 1;
    this.processTree = new ProcessTree();
    this.dependencyService = new DependencyService();
    
    // Phase 47: Static initialization removed. 
    // Initialization is now an explicit action triggered by App.vue via initialize()
    // This allows the initialization command to be part of the recorded history.
  }

  /**
   * Initialize the world with default elements (P_H, P_V, etc.)
   * Adds the initialization command to the provided CommandStack.
   */
  initialize(commandStack: CommandStack): void {
    // Only initialize if empty (or forcefully if needed, but safer to check)
    if (this.projectionPlanes.size > 0) return;

    const initCmd = new Command('Initialize World', this);
    
    // Phase 85: Use subprocess for initialization organization
    initCmd.addAndExecute(new PushSubprocessOp('World Initialization'));
    
    const groupId = `group_init_${Date.now()}`;
    const group = createActionGroup(groupId);
    initCmd.addAndExecute(new AddProcessTreeActionGroupOp(group));
    
    buildWorldInitialization(this, initCmd, groupId);
    
    initCmd.addAndExecute(new PopSubprocessOp());
    
    // Commit the command
    initCmd.commit();
    
    // Push via stack so it is recorded
    commandStack.push(initCmd);
    
    this.notifyChange();
  }

  /**
   * Get current version number for change tracking
   */
  getVersion(): number {
    return this._version;
  }

  /**
   * Subscribe to World change notifications (Phase 80)
   * 
   * Observers will be notified whenever World.markDirty() is called,
   * which happens after every Command operation completes.
   * 
   * @param callback Function to call when World changes
   */
  subscribeToChanges(callback: () => void): void {
    this.changeListeners.push(callback);
  }

  /**
   * Unsubscribe from World change notifications (Phase 80)
   * 
   * @param callback Function to remove from listeners
   */
  unsubscribeFromChanges(callback: () => void): void {
    const index = this.changeListeners.indexOf(callback);
    if (index > -1) {
      this.changeListeners.splice(index, 1);
    }
  }

  /**
   * Notify that world has changed (increment version)
   * Phase 80: Also notifies all subscribed observers
   */
  private notifyChange(): void {
    this._version++;
    // Notify all subscribers (ThreeView, other views)
    this.changeListeners.forEach(listener => listener());
  }

  /**
   * Public hook for Operations/Commands to signal a change.
   *
   * World version is used by some UI panels to trigger updates.
   * Keep this as a tiny, explicit API instead of exposing notifyChange().
   */
  markDirty(): void {
    this.notifyChange();
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
    this.planes3D.clear();
    this.projectionPlanes.clear();
    this.projectionPlaneRealizations2D.clear();
    this.projectionPlaneRealizations3D.clear();
    this.nextId = 1;
    this._version = 0;
    this.processTree = new ProcessTree();
    this.dependencyService = new DependencyService();
    
    // Phase 95: Do NOT re-initialize automatically.
    // Initialization is now explicit or handled by replaying commands.
    
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
   * Uses shared nextId counter to ensure global uniqueness
   * @returns Unique projection plane ID (e.g., 'proj_plane_1', 'proj_plane_2')
   */
  generateProjPlaneId(): string {
    return `proj_plane_${this.nextId++}`;
  }

  /**
   * Phase 46: Generate unique 3D plane ID
   * Uses shared nextId counter to ensure global uniqueness
   * @returns Unique plane ID (e.g., 'plane_1', 'plane_2')
   */
  generatePlaneId(): string {
    return `plane_${this.nextId++}`;
  }

  /**
   * Phase 46: Generate unique hinge line ID
   * Uses shared nextId counter to ensure global uniqueness
   * @returns Unique hinge line ID (e.g., 'HL_1', 'HL_2')
   */
  generateHingeLineId(): string {
    return `HL_${this.nextId++}`;
  }

  /**
   * Get the currently active projection plane ID
   * 
   * Includes self-healing logic: if currently active plane was deleted,
   * it selects the first available plane and updates the state.
   * 
   * @returns Active plane ID or undefined if not set
   */
  getActivePlaneId(): string | undefined {
    // Self-healing: if active plane no longer exists, reset to first available
    if (this.activePlaneId && !this.projectionPlanes.has(this.activePlaneId)) {
      const firstPlane = this.projectionPlanes.values().next().value;
      if (firstPlane) {
        this.activePlaneId = firstPlane.id;
        // Do not call notifyChange() here to avoid infinite loops during render/get
        // or unexpected side effects during read operations.
        // The change will be reflected in specific lookups.
      } else {
        this.activePlaneId = undefined;
      }
    }
    return this.activePlaneId;
  }

  /**
   * Set the currently active projection plane
   * @param planeId ID of the plane to make active
   */
  setActivePlaneId(planeId: string): void {
    this.activePlaneId = planeId;
    this.notifyChange();
  }

  /**
   * Element factory: Create fixed 3D plane
   * 
   * Creates a fixed 3D plane defined by point and normal vector.
   * If planeId is not provided, generates a new ID.
   * 
   * @param point - Point on the plane (homogeneous coordinates)
   * @param normal - Normal vector to the plane (homogeneous coordinates)
   * @param planeId - Optional ID (for redo support)
   * @param label - Optional label for the plane
   * @returns Created Plane3DFixed instance
   */
  addPlane3DFixed(point: Vector4, normal: Vector4, planeId?: string, label?: string): Plane3DFixed {
    const id = planeId || this.generatePlaneId();
    
    // Phase 52: Plane3DFixed constructor signature changed to (id, point, normal, label)
    const plane = new Plane3DFixed(id, point, normal, label);
    this.planes3D.set(id, plane);

    // Register with dependency service (no dependencies for fixed plane)
    this.dependencyService.registerNode(id, []);
    
    return plane;
  }

  /**
   * Element factory: Create projection plane with explicit transformation matrices
   * 
   * Creates a projection plane associated with a 3D plane and adds it to World.
   * Takes explicit transformation matrices instead of orientation string for generic plane creation.
   * If projPlaneId is not provided, generates a new ID.
   * 
   * @param plane3DId - ID of associated 3D plane
   * @param planeToPaper2D - 3x3 homogeneous matrix: plane (u,v,1) → paper (x',y',1)
   * @param planeTo3D - 4x3 matrix: plane (u,v,1) → domain 3D (x,y,z,w)
   * @param threeDToPlane - 3x4 matrix: domain 3D (x,y,z,w) → plane (u,v,1)
   * @param projPlaneId - Optional ID (for redo support)
   * @param name - Optional name/label (defaults to proj_plane_${id})
   * @returns Created ProjectionPlane instance
   */
  addProjectionPlane(
    plane3DId: string,
    planeToPaper2D: Matrix3,
    planeTo3D: Matrix4x3,
    threeDToPlane: Matrix3x4,
    projPlaneId?: string,
    name?: string
  ): ProjectionPlane {
    const id = projPlaneId || this.generateProjPlaneId();
    
    // Compute inverse of planeToPaper2D
    const paperToPlane2D = planeToPaper2D.clone().invert();
    
    // Create BaseProjectionPlane with explicit matrices
    const projPlane = new BaseProjectionPlane(
      name || `proj_plane_${id}`,
      planeToPaper2D,
      paperToPlane2D,
      planeTo3D,
      threeDToPlane,
      false,  // Not active by default
      true,   // Visible
      '#808080',  // Default gray
      plane3DId
    );
    
    projPlane.id = id;
    
    this.projectionPlanes.set(id, projPlane);

    // Register with dependency service
    this.dependencyService.registerNode(id, projPlane.getDependencies());
    
    return projPlane;
  }

  /**
   * Element factory: Create hinge line (3D object only)
   * 
   * Creates a 3D HingeLine object connecting two projection planes.
   * Does NOT create the 2D half hinge lines - those are separate operations.
   * If hingeLineId is not provided, generates a new ID.
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

    // Register with dependency service
    this.dependencyService.registerNode(id, hingeLine.getDependencies());
    
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

    // Call realize2D with World context (uniform API for all plane types)
    realization = plane.realize2D(this);
    
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

    // Call realize3D with World context (uniform API for all plane types)
    realization = plane.realize3D(this);
    
    // Cache the result
    this.projectionPlaneRealizations3D.set(planeId, realization);
    
    return realization;
  }

  /**
   * Invalidate cached realizations for a point and all dependent points
   * Call this when a point's definition changes (e.g., user moves a point)
   */
  invalidateRealization(pointId: string): void {
    // Phase 22.5.3: Clear realizations from ProjectionPlane caches
    // Use dependency service to cascade invalidation to all dependents
    this.dependencyService.invalidateCascade(pointId, (id: string) => {
      // Clear all 3D realization caches (Phase 78: includes 3D elements)
      this.pointRealizations3D.delete(id);
      this.lineRealizations3D.delete(id);
      this.segmentRealizations3D.delete(id);
      this.planeRealizations3D.delete(id);
      
      // Clear projection plane 3D realizations if this is a Plane3D
      // When a Plane3D is invalidated, any projection planes depending on it need recomputation
      for (const [projPlaneId, projPlane] of this.projectionPlanes) {
        if (projPlane.plane3DId === id) {
          this.projectionPlaneRealizations3D.delete(projPlaneId);
        }
      }
      
      // Phase 84: If this ID is a projection plane, clear its transformation cache
      // (Projection planes are elements in dependency graph like any other)
      this.projectionPlaneRealizations3D.delete(id);
      this.projectionPlaneRealizations2D.delete(id);  // Also clear 2D plane-to-paper transform
      
      // Clear 2D realization caches in all planes
      for (const plane of this.projectionPlanes.values()) {
        plane.clearPointRealization2D(id);
        plane.clearLineRealization2D(id);
        plane.clearCircleRealization2D(id);
      }
    });
    
    // Notify UI to re-render
    this.markDirty();
  }

  // ========================================
  // Line management
  // ========================================

  /**
   * Invalidate line realization cache for a specific line
   * Call this when the line's dependencies change
   */
  invalidateLineRealization(lineId: string): void {
    // Phase 22.5.3: Clear realizations from ProjectionPlane caches
    // Use dependency service to cascade invalidation to all dependents
    this.dependencyService.invalidateCascade(lineId, (id: string) => {
      // Clear all 3D realization caches (Phase 78: includes 3D elements)
      this.pointRealizations3D.delete(id);
      this.lineRealizations3D.delete(id);
      this.segmentRealizations3D.delete(id);
      this.planeRealizations3D.delete(id);
      
      // Clear projection plane 2D and 3D transformation caches
      this.projectionPlaneRealizations3D.delete(id);
      this.projectionPlaneRealizations2D.delete(id);
      
      // Clear 2D realization caches in all planes
      for (const plane of this.projectionPlanes.values()) {
        plane.clearPointRealization2D(id);
        plane.clearLineRealization2D(id);
        plane.clearCircleRealization2D(id);
      }
    });

    // Notify UI to re-render
    this.markDirty();
  }



  // ========================================
  // CIRCLE METHODS
  // ========================================

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

  // Guides are added directly to planes via plane.addLine()
  // Operations should call world.markDirty() after modifications

  // ========================================
  // Plane Methods
  // ========================================

  /**
   * Get a plane by ID
   */
  getPlaneById(id: string): Plane3D | undefined {
    return this.planes3D.get(id);
  }

  /**
   * Get projection plane by ID
   */
  getProjectionPlaneById(id: string): ProjectionPlane | undefined {
    return this.projectionPlanes.get(id);
  }

  /**
   * Get projection plane by label (semantic access)
   * 
   * @param label - Plane label (e.g., 'P_H', 'P_V')
   * @returns Projection plane with matching label
   * @throws Error if no plane found with given label
   */
  getProjectionPlaneByLabel(label: string): ProjectionPlane {
    for (const plane of this.projectionPlanes.values()) {
      if (plane.name === label) {
        return plane;
      }
    }
    throw new Error(`Projection plane not found with label: ${label}`);
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
    const containerId = getContainerIdFromElementId(id);
    const plane = this.getProjectionPlaneById(containerId);
    
    if (!plane) {
      return undefined;
    }
    
    // Try each element type
    return plane.getPoint(id) ||
           plane.getLine(id) ||
           plane.getCircle(id);
  }

  /**
   * Get Point2D by hierarchical ID (Phase 45)
   * Type-safe variant of getElement2D() for points
   * 
   * @param id Hierarchical ID in format "{planeId}/{localId}"
   * @returns Point2D or undefined if not found or not a point
   */
  getPoint2D(id: string): Point2D | undefined {
    const containerId = getContainerIdFromElementId(id);
    const plane = this.getProjectionPlaneById(containerId);
    return plane?.getPoint(id);
  }

  /**
   * Get Line2D by hierarchical ID (Phase 45)
   * Type-safe variant of getElement2D() for lines
   * 
   * @param id Hierarchical ID in format "{planeId}/{localId}"
   * @returns Line2D or undefined if not found or not a line
   */
  getLine2D(id: string): Line2D | undefined {
    const containerId = getContainerIdFromElementId(id);
    const plane = this.getProjectionPlaneById(containerId);
    return plane?.getLine(id);
  }

  /**
   * Get Circle2D by hierarchical ID (Phase 45)
   * Type-safe variant of getElement2D() for circles
   * 
   * @param id Hierarchical ID in format "{planeId}/{localId}"
   * @returns Circle2D or undefined if not found or not a circle
   */
  getCircle2D(id: string): Circle2D | undefined {
    const containerId = getContainerIdFromElementId(id);
    const plane = this.getProjectionPlaneById(containerId);
    return plane?.getCircle(id);
  }

  /**
   * Get Segment2D by hierarchical ID (Phase 45)
   * Type-safe variant of getElement2D() for segments
   * Segments are stored as Line2D subtypes with type 'segment'
   * 
   * @param id Hierarchical ID in format "{planeId}/{localId}"
   * @returns Segment2D or undefined if not found or not a segment
   */
  getSegment2D(id: string): Segment2D | undefined {
    const containerId = getContainerIdFromElementId(id);
    const plane = this.getProjectionPlaneById(containerId);
    const line = plane?.getLine(id);
    // Segments extend Line2D
    if (line && line instanceof Segment2DByPoints) {
      return line as Segment2D;
    }
    return undefined;
  }

  /**
   * Get Guide2D by hierarchical ID (Phase 45)
   * Type-safe variant of getElement2D() for guides
   * Guides are stored as Line2D subtypes
   * 
   * @param id Hierarchical ID in format "{planeId}/{localId}"
   * @returns Guide2D or undefined if not found or not a guide
   */
  getGuide2D(id: string): Guide2D | undefined {
    const containerId = getContainerIdFromElementId(id);
    const plane = this.getProjectionPlaneById(containerId);
    const line = plane?.getLine(id);
    // Guides extend Line2D
    if (line && line instanceof Guide2D) {
      return line as Guide2D;
    }
    return undefined;
  }

  /**
   * Get all 3D planes (base + user-created)
   */
  getAllPlanes(): Plane3D[] {
    return Array.from(this.planes3D.values());
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
   * Phase 85: Removed parentSubprocessId parameter - uses subprocess stack
   */
  addAction(action: any, groupName?: string): any {
    const result = this.processTree.addAction(action, groupName);
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
      line instanceof HalfHingeLine2D
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
    if (!halfHingeLine || !(halfHingeLine instanceof HalfHingeLine2D)) {
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
    // Determine element IDs based on intersection type using instanceof
    let element1Id: string | undefined;
    let element2Id: string | undefined;

    if (intersectionPoint instanceof Point2DLineLineIntersection) {
      element1Id = intersectionPoint.line1Id;
      element2Id = intersectionPoint.line2Id;
    } else if (intersectionPoint instanceof Point2DLineCircleIntersection) {
      element1Id = intersectionPoint.lineId;
      element2Id = intersectionPoint.circleId;
    } else if (intersectionPoint instanceof Point2DCircleCircleIntersection) {
      element1Id = intersectionPoint.circle1Id;
      element2Id = intersectionPoint.circle2Id;
    } else {
      // Not a standard intersection type
      return undefined;
    }

    // Check if either element is a HalfHingeLine2D using instanceof
    const element1 = element1Id ? this.getLine2D(element1Id) : undefined;
    const element2 = element2Id ? this.getLine2D(element2Id) : undefined;

    let halfHingeLine: HalfHingeLine2D | undefined;

    if (element1 && element1 instanceof HalfHingeLine2D) {
      halfHingeLine = element1;
    } else if (element2 && element2 instanceof HalfHingeLine2D) {
      halfHingeLine = element2;
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

  // ========================================
  // Phase 78: 3D Element Storage and Access
  // ========================================

  /**
   * Generate unique ID for 3D point
   * Format: "point3d_N" where N is auto-incremented
   */
  generate3DPointId(): string {
    return `point3d_${++this.point3DCounter}`;
  }

  /**
   * Generate unique ID for 3D line
   * Format: "line3d_N" where N is auto-incremented
   */
  generate3DLineId(): string {
    return `line3d_${++this.line3DCounter}`;
  }

  /**
   * Generate unique ID for 3D segment
   * Format: "segment3d_N" where N is auto-incremented
   */
  generate3DSegmentId(): string {
    return `segment3d_${++this.segment3DCounter}`;
  }

  /**
   * Generate unique ID for user-created 3D plane
   * Format: "plane3d_N" where N is auto-incremented
   */
  generate3DPlaneId(): string {
    return `plane3d_${++this.plane3DUserCounter}`;
  }

  /**
   * Add 3D point to World
   */
  add3DPoint(point: Point3D): void {
    this.points3D.set(point.id!, point);
    this.dependencyService.registerNode(point.id!, point.getDependencies());
    this.notifyChange();
  }

  /**
   * Get 3D point by ID
   */
  get3DPoint(id: string): Point3D | undefined {
    return this.points3D.get(id);
  }

  /**
   * Remove 3D point from World
   */
  remove3DPoint(id: string): void {
    this.points3D.delete(id);
    this.pointRealizations3D.delete(id);
    this.dependencyService.unregisterNode(id);
    this.notifyChange();
  }

  /**
   * Get all 3D points
   */
  getAll3DPoints(): Point3D[] {
    return Array.from(this.points3D.values());
  }

  /**
   * Add 3D line to World
   */
  add3DLine(line: Line3D): void {
    this.lines3D.set(line.id!, line);
    this.dependencyService.registerNode(line.id!, line.getDependencies());
    this.notifyChange();
  }

  /**
   * Get 3D line by ID
   */
  get3DLine(id: string): Line3D | undefined {
    return this.lines3D.get(id);
  }

  /**
   * Remove 3D line from World
   */
  remove3DLine(id: string): void {
    this.lines3D.delete(id);
    this.lineRealizations3D.delete(id);
    this.dependencyService.unregisterNode(id);
    this.notifyChange();
  }

  /**
   * Get all 3D lines
   */
  getAll3DLines(): Line3D[] {
    return Array.from(this.lines3D.values());
  }

  /**
   * Add 3D segment to World
   */
  add3DSegment(segment: Segment3D): void {
    this.segments3D.set(segment.id!, segment);
    this.dependencyService.registerNode(segment.id!, segment.getDependencies());
    this.notifyChange();
  }

  /**
   * Get 3D segment by ID
   */
  get3DSegment(id: string): Segment3D | undefined {
    return this.segments3D.get(id);
  }

  /**
   * Remove 3D segment from World
   */
  remove3DSegment(id: string): void {
    this.segments3D.delete(id);
    this.segmentRealizations3D.delete(id);
    this.dependencyService.unregisterNode(id);
    this.notifyChange();
  }

  /**
   * Get all 3D segments
   */
  getAll3DSegments(): Segment3D[] {
    return Array.from(this.segments3D.values());
  }

  /**
   * Add 3D plane to World (base or user-created)
   */
  add3DPlane(plane: Plane3D): void {
    this.planes3D.set(plane.id!, plane);
    this.dependencyService.registerNode(plane.id!, plane.getDependencies());
    this.notifyChange();
  }

  /**
   * Get 3D plane by ID (base or user-created)
   */
  get3DPlane(id: string): Plane3D | undefined {
    return this.planes3D.get(id);
  }

  /**
   * Remove 3D plane from World (base or user-created)
   */
  remove3DPlane(id: string): void {
    this.planes3D.delete(id);
    this.planeRealizations3D.delete(id);
    this.dependencyService.unregisterNode(id);
    this.notifyChange();
  }



  /**
   * Get 3D point realization (computed geometry)
   * Uses cache for performance
   */
  get3DPointRealization(id: string): Point3DRealization3D | undefined {
    // Check cache first
    if (this.pointRealizations3D.has(id)) {
      return this.pointRealizations3D.get(id);
    }

    // Compute and cache
    const point = this.get3DPoint(id);
    if (!point) return undefined;

    const realization = point.realize3D(this);
    this.pointRealizations3D.set(id, realization);
    return realization;
  }

  /**
   * Get 3D line realization (computed geometry)
   * Uses cache for performance
   */
  get3DLineRealization(id: string): Line3DRealization3D | undefined {
    // Check cache first
    if (this.lineRealizations3D.has(id)) {
      return this.lineRealizations3D.get(id);
    }

    // Compute and cache
    const line = this.get3DLine(id);
    if (!line) return undefined;

    const realization = line.realize3D(this);
    this.lineRealizations3D.set(id, realization);
    return realization;
  }

  /**
   * Get 3D segment realization (computed geometry)
   * Uses cache for performance
   */
  get3DSegmentRealization(id: string): Segment3DRealization3D | undefined {
    // Check cache first
    if (this.segmentRealizations3D.has(id)) {
      return this.segmentRealizations3D.get(id);
    }

    // Compute and cache
    const segment = this.get3DSegment(id);
    if (!segment) return undefined;

    const realization = segment.realize3D(this);
    this.segmentRealizations3D.set(id, realization);
    return realization;
  }

  /**
   * Get 3D plane realization (computed geometry)
   * Uses cache for performance
   */
  get3DPlaneRealization(id: string): Plane3DRealization3D | undefined {
    // Check cache first
    if (this.planeRealizations3D.has(id)) {
      return this.planeRealizations3D.get(id);
    }

    // Compute and cache
    const plane = this.get3DPlane(id);
    if (!plane) return undefined;

    const realization = plane.realize3D(this);
    this.planeRealizations3D.set(id, realization);
    return realization;
  }

  /**
   * Clear 3D realization caches
   * Called when 2D elements change to invalidate dependent 3D elements
   */
  clear3DRealizationCaches(): void {
    this.pointRealizations3D.clear();
    this.lineRealizations3D.clear();
    this.segmentRealizations3D.clear();
    this.planeRealizations3D.clear();
  }
}


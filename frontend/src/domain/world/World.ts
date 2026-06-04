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
 *    const realization = point?.realize2D(world);  // World implements the realization context
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
 * @see Phase 45: Hierarchical Element IDs
 * @see Phase 46: Semantic Accessors
 * @see Phase 48: Remove World Facade Methods
 */

import { Vector4, Matrix3 } from 'three';
import { Matrix4x3 } from '@/utils/threeUtils';
import { Point2D, Point2DLineLineIntersection, Point2DLineCircleIntersection, Point2DCircleCircleIntersection, type Point2DRealization2D } from './Point';
import { Line2D, type Line2DRealization2D } from './Line';
import { Segment2D } from './Segment';
import { Circle2D, type Circle2DRealization2D } from './Circle';
import { Guide2D } from './Guide';
import { HingeLine, HalfHingeLine2D } from './HingeLine';
import { Plane3D, Plane3DFixed } from './Plane';
import { ProjectionPlane } from './projectionPlane/ProjectionPlane';
import { FixedProjectionPlane } from './projectionPlane/FixedProjectionPlane';
import { ProjectionPlaneRealization2D, ProjectionPlaneRealization3D } from './projectionPlane/ProjectionPlaneRealization';
import { ProcessTree } from '../processTree/ProcessTree';
import { DependencyService } from './DependencyService';
import type { DependencyQueryPort, DependencyRegistrarPort } from './DependencyPorts';
import { Element2D } from './Element2D';

// Phase 78: 3D element domain types
import type { Point3D } from './Point3D';
import type { Line3D } from './Line3D';
import type { Segment3DFromProjections } from './Segment3D';

// Phase 78: 3D element realization types (Element3DRealization3D.ts)
import { Point3DRealization3D, Line3DRealization3D, Segment3DRealization3D, Plane3DRealization3D } from './Element3DRealization3D';
import { getContainerIdFromElementId } from './ElementId';
import { LabelGenerator } from './LabelGenerator';
import { RealizationService } from './RealizationService';
import { ConstructionService } from './ConstructionService';
import { WorldIdAllocator } from './WorldIdAllocator';
import type { ProjectionElementRealizationContext } from './projectionPlane/ProjectionPlaneContext';

export class World {
  // Phase 22.5.3: Element storage removed - now stored in ProjectionPlane only
  private hingeLines: Map<string, HingeLine>;
  private planes3D: Map<string, Plane3D>;        // All 3D planes (base P_H, P_V + user-created)
  projectionPlanes: Map<string, ProjectionPlane>;  // All projection planes (base + auxiliary)
  
  // Phase 78: User-created 3D elements (domain layer - definitions)
  private points3D: Map<string, Point3D>;        // User-created 3D points from projections
  private lines3D: Map<string, Line3D>;          // User-created 3D lines from projections
  private segments3D: Map<string, Segment3DFromProjections>;    // User-created 3D segments from projections
  
  // Construction history
  private processTree: ProcessTree;
  
  // Dependency tracking: World owns the concrete service; collaborators receive ports.
  private dependencyService: DependencyService;
  
  private realizationService: RealizationService;
  private constructionService: ConstructionService;
  
  private idAllocator: WorldIdAllocator;

  // Fixed elements (always present)
  originPoint?: Vector4;  // O at (0,0,0) in 3D space
  
  // Phase 78: ID generation counters for 3D elements
  private point3DCounter: number = 0;
  private line3DCounter: number = 0;
  private segment3DCounter: number = 0;
  private plane3DUserCounter: number = 0;

  // Phase 116: Sequential mathematical label generator
  readonly labelGenerator: LabelGenerator = new LabelGenerator();

  constructor() {
    // Phase 22.5.3: Element storage removed - stored in ProjectionPlane
    this.hingeLines = new Map();
    this.planes3D = new Map();
    this.projectionPlanes = new Map();
    
    // Phase 78: Initialize 3D element storage
    this.points3D = new Map();
    this.lines3D = new Map();
    this.segments3D = new Map();
    
    this.realizationService = new RealizationService();
    this.constructionService = new ConstructionService(this);
    
    this.idAllocator = new WorldIdAllocator();
    this.processTree = new ProcessTree();
    this.dependencyService = new DependencyService();
    
    // Phase 47: Static initialization removed.
    // Initialization is now an explicit application use case so command history
    // orchestration stays outside the domain root.
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
    this.realizationService.clear();
    this.idAllocator.restore(1);
    this.labelGenerator.reset();
    this.point3DCounter = 0;
    this.line3DCounter = 0;
    this.segment3DCounter = 0;
    this.plane3DUserCounter = 0;
    this.originPoint = undefined;
    this.processTree = new ProcessTree();
    this.dependencyService = new DependencyService();
    
    // Phase 95: Do NOT re-initialize automatically.
    // Initialization is now explicit or handled by replaying commands.
  }



  /**
   * Get next unique ID counter value (for element ID generation)
   * ProjectionPlane uses this to generate element IDs
   */
  getNextId(): number {
    return this.idAllocator.next();
  }

  peekNextId(): number {
    return this.idAllocator.peek();
  }

  restoreNextId(nextElementId: number): void {
    this.idAllocator.restore(nextElementId);
  }



  /**
   * Phase 95: Generate unique projection plane ID (camelCase format)
   * Uses shared nextId counter to ensure global uniqueness
   * @returns Unique projection plane ID (e.g., 'projPlane1', 'projPlane2')
   */
  generateProjPlaneId(): string {
    return this.idAllocator.prefixed('projPlane');
  }

  /**
   * Phase 95: Generate unique 3D plane ID (camelCase format)
   * Uses shared nextId counter to ensure global uniqueness
   * @returns Unique plane ID (e.g., 'plane1', 'plane2')
   */
  generatePlaneId(): string {
    return this.idAllocator.prefixed('plane');
  }

  /**
   * Phase 95: Generate unique hinge line ID (camelCase format)
   * Uses shared nextId counter to ensure global uniqueness
   * @returns Unique hinge line ID (e.g., 'hingeLine1', 'hingeLine2')
   */
  generateHingeLineId(): string {
    return this.idAllocator.prefixed('hingeLine');
  }

  /**
   * Phase 97: Generate default label from element ID and type
   * 
   * Extracts the numeric counter from the technical ID and applies type-based
   * prefix to create a human-readable label.
   * 
   * Label scheme:
   * - Points (2D & 3D): A_n (e.g., point2d5 → A_5, point3d12 → A_{12})
   * - Lines (2D & 3D): L_n
   * - Segments (2D & 3D): S_n
   * - Circles: C_n
   * - Guides: G_n
   * - 3D Planes: P_n
   * - Projection Planes: P_n (same counter)
   * - Hinge Lines: HL_n
   * - Half-Hinge Lines: HHL_n
   * 
   * Multi-digit subscripts use brace notation for correct KaTeX rendering:
   * - Single digit: A_5 → A₅
   * - Multi-digit: A_{12} → A₁₂ (braces required!)
   * 
   * ID Formats Supported:
   * - Simple: "point2d5", "line3d12" (local IDs)
   * - Scoped: "projPlane3/point2d5" (container/local format)
   * 
   * @param elementId Technical element ID (e.g., "point2d5", "projPlane3/line2d12")
   * @param elementType Element type string (e.g., "Point2D", "Line3D")
   * @returns Human-readable label (e.g., "A_5", "L_{12}")
   * @throws Error if ID format is invalid or element type is unknown
   */
  generateDefaultLabel(_elementId: string, elementType: string): string {
    return this.labelGenerator.next(elementType);
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
   * Phase 94: Only forward matrices required as parameters.
   * Derived matrices (paperToPlane2D, threeDToPlane) computed in realization constructors.
   * 
   * @param plane3DId - ID of associated 3D plane
   * @param planeToPaper2D - 3x3 homogeneous matrix: plane (u,v,1) → paper (x',y',1)
   * @param planeTo3D - 4x3 matrix: plane (u,v,1) → domain 3D (x,y,z,w)
   * @param projPlaneId - Optional ID (for redo support)
   * @param name - Optional persisted plane name (defaults to proj_plane_${id})
   * @returns Created ProjectionPlane instance
   */
  addProjectionPlane(
    plane3DId: string,
    planeToPaper2D: Matrix3,
    planeTo3D: Matrix4x3,
    projPlaneId?: string,
    name?: string
  ): ProjectionPlane {
    const id = projPlaneId || this.generateProjPlaneId();
    const label = name || this.generateDefaultLabel(id, 'ProjectionPlane');
    
    const projPlane = new FixedProjectionPlane(
      id,
      label,
      planeToPaper2D,
      planeTo3D,
      false,
      true,
      '#808080',
      plane3DId,
    );
    
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
    const label = this.generateDefaultLabel(id, 'HingeLine');
    
    const hingeLine = new HingeLine(id, label, horizontalPlaneId, verticalPlaneId);
    
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
  getPlaneForElement(elementId: string): ProjectionPlane | undefined {
    for (const plane of this.projectionPlanes.values()) {
      if (plane.getPoint(elementId) || plane.getLine(elementId) || plane.getCircle(elementId)) {
        return plane;
      }
    }
    return undefined;
  }

  /**
   * Get the 2D realization for a projection plane (cached or computed on-demand)
   * Consistent pattern with getPoint2DRealization()
   */
  getProjectionPlane2DRealization(planeId: string): ProjectionPlaneRealization2D | undefined {
    const plane = this.projectionPlanes.get(planeId);
    if (!plane) {
      return undefined;
    }

    return this.realizationService.realizeProjectionPlane2D(plane, this);
  }

  /**
   * Get the 3D realization for a projection plane (cached or computed on-demand)
   * Returns the 3D transformation matrix for converting plane coordinates to 3D space
   */
  getProjectionPlane3DRealization(planeId: string): ProjectionPlaneRealization3D | undefined {
    const plane = this.projectionPlanes.get(planeId);
    if (!plane) {
      return undefined;
    }

    return this.realizationService.realizeProjectionPlane3D(plane, this);
  }

  /**
   * Invalidate cached realizations for a point and all dependent points
   * Call this when a point's definition changes (e.g., user moves a point)
   */
  invalidateRealization(elementId: string): string[] {
    return this.realizationService.invalidateElement(
      elementId,
      this.dependencyService,
      this.projectionPlanes
    );
  }

  // ========================================
  // Line management
  // ========================================

  /**
   * Invalidate line realization cache for a specific line
   * Call this when the line's dependencies change
   */
  invalidateLineRealization(lineId: string): string[] {
    return this.invalidateRealization(lineId);
  }

  realizePoint2D(point: Point2D, context: ProjectionElementRealizationContext = this): Point2DRealization2D | undefined {
    return this.realizationService.realizePoint2D(point, context);
  }

  realizeLine2D(line: Line2D, context: ProjectionElementRealizationContext = this): Line2DRealization2D | undefined {
    return this.realizationService.realizeLine2D(line, context);
  }

  realizeCircle2D(circle: Circle2D, context: ProjectionElementRealizationContext = this): Circle2DRealization2D | undefined {
    return this.realizationService.realizeCircle2D(circle, context);
  }



  // ========================================
  /**
   * Get the 2D realization of a circle (with caching)
   * Returns circle geometry (center and radius) in plane coordinates
   * Phase 22.5: Delegates to ProjectionPlane for computation
   */
  // ========================================
  // Guide Methods
  // ========================================

  // Guides are added directly to planes via plane.addLine()

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

  removeProjectionPlaneByIdForUndo(id: string): void {
    const plane = this.projectionPlanes.get(id);
    this.invalidateRealization(id);
    if (plane) {
      plane.clear();
    }
    this.projectionPlanes.delete(id);
    this.dependencyService.unregisterNode(id);
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
   * world.getElement2D("projPlaneH/point2d1") // FreePoint2D
   * world.getElement2D("projPlaneV/line2d5")   // Line2DByTwoPoints
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
   * @throws Error if plane not found (indicates corrupted element ID)
   */
  getPoint2D(id: string): Point2D | undefined {
    const containerId = getContainerIdFromElementId(id);
    const plane = this.getProjectionPlaneById(containerId);
    if (!plane) {
      throw new Error(`[INTERNAL ERROR] Plane ${containerId} not found when looking up point ${id}. This indicates corrupted element ID or missing plane registration.`);
    }
    return plane.getPoint(id);
  }

  /**
   * Get Line2D by hierarchical ID (Phase 45)
   * Type-safe variant of getElement2D() for lines
   * 
   * @param id Hierarchical ID in format "{planeId}/{localId}"
   * @returns Line2D or undefined if not found or not a line
   * @throws Error if plane not found (indicates corrupted element ID)
   */
  getLine2D(id: string): Line2D | undefined {
    const containerId = getContainerIdFromElementId(id);
    const plane = this.getProjectionPlaneById(containerId);
    if (!plane) {
      throw new Error(`[INTERNAL ERROR] Plane ${containerId} not found when looking up line ${id}. This indicates corrupted element ID or missing plane registration.`);
    }
    return plane.getLine(id);
  }

  /**
   * Get Circle2D by hierarchical ID (Phase 45)
   * Type-safe variant of getElement2D() for circles
   * 
   * @param id Hierarchical ID in format "{planeId}/{localId}"
   * @returns Circle2D or undefined if not found or not a circle
   * @throws Error if plane not found (indicates corrupted element ID)
   */
  getCircle2D(id: string): Circle2D | undefined {
    const containerId = getContainerIdFromElementId(id);
    const plane = this.getProjectionPlaneById(containerId);
    if (!plane) {
      throw new Error(`[INTERNAL ERROR] Plane ${containerId} not found when looking up circle ${id}. This indicates corrupted element ID or missing plane registration.`);
    }
    return plane.getCircle(id);
  }

  /**
   * Get Segment2D by hierarchical ID (Phase 45)
   * Type-safe variant of getElement2D() for segments
   * Segments are stored as Line2D subtypes with type 'segment'
   * 
   * @param id Hierarchical ID in format "{planeId}/{localId}"
   * @returns Segment2D or undefined if not found or not a segment
   * @throws Error if plane not found (indicates corrupted element ID)
   */
  getSegment2D(id: string): Segment2D | undefined {
    const containerId = getContainerIdFromElementId(id);
    const plane = this.getProjectionPlaneById(containerId);
    if (!plane) {
      throw new Error(`[INTERNAL ERROR] Plane ${containerId} not found when looking up segment ${id}. This indicates corrupted element ID or missing plane registration.`);
    }
    const line = plane.getLine(id);
    // Segments extend Line2D
    if (line && line instanceof Segment2D) {
      return line;
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
   * @throws Error if plane not found (indicates corrupted element ID)
   */
  getGuide2D(id: string): Guide2D | undefined {
    const containerId = getContainerIdFromElementId(id);
    const plane = this.getProjectionPlaneById(containerId);
    if (!plane) {
      throw new Error(`[INTERNAL ERROR] Plane ${containerId} not found when looking up guide ${id}. This indicates corrupted element ID or missing plane registration.`);
    }
    const line = plane.getLine(id);
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

  getDependencyQuery(): DependencyQueryPort {
    return this.dependencyService;
  }

  getDependencyRegistrar(): DependencyRegistrarPort {
    return this.dependencyService;
  }

  getConstructionService(): ConstructionService {
    return this.constructionService;
  }

  // ========================================
  // HingeLine Methods
  // ========================================

  /**
   * Add an already-constructed hinge line entity to World storage.
   *
   * Command operations that create specialized HingeLine subtypes use this
   * narrow storage hook after constructing and validating the domain entity.
   */
  addHingeLineEntity(hingeLine: HingeLine): void {
    this.hingeLines.set(hingeLine.id, hingeLine);
  }

  /**
   * Remove a hinge line entity from World storage.
   */
  removeHingeLine(id: string): void {
    this.hingeLines.delete(id);
  }

  removeHingeLineByIdForUndo(id: string): void {
    this.hingeLines.delete(id);
    this.dependencyService.unregisterNode(id);
  }

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
   * @returns Parent HingeLine or undefined if the element is not a HalfHingeLine2D
   * @throws Error if the ID is invalid (Phase 76: fail-fast for corrupted state)
   */
  getHingeLineFromHalfHingeLine(halfHingeLineId: string): HingeLine | undefined {
    // Get the HalfHingeLine2D by searching all planes
    // Phase 76: getLine2D throws for invalid IDs (fail-fast)
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
   * Phase 95: Generate unique ID for 3D point (camelCase format)
   * Format: "point3dN" where N is auto-incremented
   */
  generate3DPointId(): string {
    return `point3d${++this.point3DCounter}`;
  }

  /**
   * Phase 95: Generate unique ID for 3D line (camelCase format)
   * Format: "line3dN" where N is auto-incremented
   */
  generate3DLineId(): string {
    return `line3d${++this.line3DCounter}`;
  }

  /**
   * Phase 95: Generate unique ID for 3D segment (camelCase format)
   * Format: "segment3dN" where N is auto-incremented
   */
  generate3DSegmentId(): string {
    return `segment3d${++this.segment3DCounter}`;
  }

  /**
   * Phase 95: Generate unique ID for user-created 3D plane (camelCase format)
   * Format: "plane3dN" where N is auto-incremented
   */
  generate3DPlaneId(): string {
    return `plane3d${++this.plane3DUserCounter}`;
  }

  /**
   * Add 3D point to World
   */
  add3DPoint(point: Point3D): void {
    this.points3D.set(point.id, point);
    this.dependencyService.registerNode(point.id, point.getDependencies());
    
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
    this.invalidateRealization(id);
    this.points3D.delete(id);
    this.dependencyService.unregisterNode(id);
    
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
    this.lines3D.set(line.id, line);
    this.dependencyService.registerNode(line.id, line.getDependencies());
    
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
    this.invalidateRealization(id);
    this.lines3D.delete(id);
    this.dependencyService.unregisterNode(id);
    
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
  add3DSegment(segment: Segment3DFromProjections): void {
    this.segments3D.set(segment.id, segment);
    this.dependencyService.registerNode(segment.id, segment.getDependencies());
    
  }

  /**
   * Get 3D segment by ID
   */
  get3DSegment(id: string): Segment3DFromProjections | undefined {
    return this.segments3D.get(id);
  }

  /**
   * Remove 3D segment from World
   */
  remove3DSegment(id: string): void {
    this.invalidateRealization(id);
    this.segments3D.delete(id);
    this.dependencyService.unregisterNode(id);
    
  }

  /**
   * Get all 3D segments
   */
  getAll3DSegments(): Segment3DFromProjections[] {
    return Array.from(this.segments3D.values());
  }

  /**
   * Add 3D plane to World (base or user-created)
   */
  add3DPlane(plane: Plane3D): void {
    this.planes3D.set(plane.id, plane);
    this.dependencyService.registerNode(plane.id, plane.getDependencies());
    
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
    this.invalidateRealization(id);
    this.planes3D.delete(id);
    this.dependencyService.unregisterNode(id);
    
  }

  removePlane3DByIdForUndo(id: string): void {
    this.remove3DPlane(id);
  }

  /**
   * Get any 3D element by ID (polymorphic accessor)
   * Tries all 3D element types: points, lines, segments, planes, hinge lines
   * Returns undefined if element not found
   */
  getElement3DById(id: string): Point3D | Line3D | Segment3DFromProjections | Plane3D | HingeLine | undefined {
    // Try each 3D element type
    return this.get3DPoint(id) 
      || this.get3DLine(id) 
      || this.get3DSegment(id) 
      || this.get3DPlane(id)
      || this.getHingeLineById(id);
  }



  /**
   * Get 3D point realization (computed geometry)
   * Uses cache for performance
   */
  get3DPointRealization(id: string): Point3DRealization3D | undefined {
    const point = this.get3DPoint(id);
    if (!point) return undefined;

    return this.realizationService.realizePoint3D(point, this);
  }

  /**
   * Get 3D line realization (computed geometry)
   * Uses cache for performance
   */
  get3DLineRealization(id: string): Line3DRealization3D | undefined {
    const line = this.get3DLine(id);
    if (!line) return undefined;

    return this.realizationService.realizeLine3D(line, this);
  }

  /**
   * Get 3D segment realization (computed geometry)
   * Uses cache for performance
   */
  get3DSegmentRealization(id: string): Segment3DRealization3D | undefined {
    const segment = this.get3DSegment(id);
    if (!segment) return undefined;

    return this.realizationService.realizeSegment3D(segment, this);
  }

  /**
   * Get 3D plane realization (computed geometry)
   * Uses cache for performance
   */
  get3DPlaneRealization(id: string): Plane3DRealization3D | undefined {
    const plane = this.get3DPlane(id);
    if (!plane) return undefined;

    return this.realizationService.realizePlane3D(plane, this);
  }

  /**
   * Clear 3D realization caches
   * Called when 2D elements change to invalidate dependent 3D elements
   */
  clear3DRealizationCaches(): void {
    this.realizationService.clear3DElementCaches();
  }
}

/**
 * ProjectionPlane - Abstract base class for all projection planes
 * 
 * ARCHITECTURAL PRINCIPLE - Shared Realization Pattern:
 * Both FixedProjectionPlane (fixed P_H, P_V) and AuxiliaryProjectionPlane (user-created)
 * extend this class and implement realize3D() returning ProjectionPlaneRealization3D.
 * 
 * This ensures uniform treatment:
 * - World.getProjectionPlane3DRealization() works for ALL plane types
 * - Rendering code (ThreeView, SvgCanvas) treats all planes uniformly
 * - No special-casing based on plane type
 * 
 * Two subclasses with different computation strategies:
 * - FixedProjectionPlane: realize3D() returns pre-computed constant matrices
 * - AuxiliaryProjectionPlane: realize3D() computes matrices from trace dependencies
 * 
 * This class represents the DEFINITION/RULE of a projection plane.
 * Actual transformation matrices are stored in PlaneRealization objects.
 * 
 * Two types of projection planes:
 * - Base planes (P_H, P_V): Predetermined transformations (computed on-demand but constant)
 * - Auxiliary planes: Dynamic transformations computed from trace/hinge and supporting 3D plane
 * 
 * Design principles:
 * - Principle V: Transformation matrices computed and cached in realizations
 * - Base planes: Transformations are constant but stored in realization cache
 * - Auxiliary planes: Transformations computed from geometric dependencies
 * 
 * Phase 22.5 Architecture:
 * - Each ProjectionPlane owns its 2D elements (points, lines, circles)
 * - Element storage moved from World to ProjectionPlane for better encapsulation
 * - Realization caches stored per-plane for locality
 * 
 * @see specs/001-dihedral-learning-mvp/data-model.md#projectionplane
 * @see specs/001-dihedral-learning-mvp/refactoring-projection-plane-ownership.md
 */

import { Matrix3, Vector3 } from 'three';
import { Matrix4x3, Matrix3x4 } from '@/utils/threeUtils';
import { buildElementId } from './ElementId';
import { Realization } from './Realization';
import { computeProjectionPlaneMatrices } from '@/utils/projectionPlaneUtils';
import type { Point2D, Point2DRealization2D } from './Point';
import { 
  FreePoint2D,
  IntersectionPoint2D,
  Point2DLineLineIntersection,
  Point2DLineCircleIntersection,
  Point2DCircleCircleIntersection,
  SiblingIntersectionPoint2D
} from './Point';
import type { Line2D, Line2DRealization2D } from './Line';
import { 
  Line2DByTwoPoints, 
  Line2DParallel, 
  Line2DPerpendicularToLine,
  Line2DTangentToCircleThroughPoint,
  Line2DTangentToCircleParallelToLine
} from './Line';
import type { Circle2D, Circle2DRealization2D } from './Circle';
import { Circle2DByCenterAndPoint } from './Circle';
import { Segment2DByPoints } from './Segment';
import { Guide2D, SiblingGuide2D } from './Guide';
import { HingeLine, HalfHingeLine2D } from './HingeLine';

export type ProjectionPlaneType = 'base' | 'auxiliary';

/**
 * ProjectionPlaneRealization2D - Stores computed 2D transformation matrices for a ProjectionPlane
 * This is the cache of evaluated 2D plane transformations for paper/canvas rendering.
 * 
 * Phase 94: Simple data holder - stores both forward and backward matrices as public fields.
 * Computation happens in realize2D() methods of ProjectionPlane subclasses.
 */
export class ProjectionPlaneRealization2D extends Realization {
  planeId: string;
  
  // Plane-to-paper: 3x3 homogeneous matrix
  // Transforms plane (u,v) coordinates → paper (x,y) coordinates
  // Usage: [x, y, 1] = M × [u, v, 1]
  planeToPaper2D: Matrix3;
  
  // Paper-to-plane: Inverse of planeToPaper2D
  // Transforms paper (x,y) coordinates → plane (u,v) coordinates
  // Used for mouse input conversion
  paperToPlane2D: Matrix3;

  constructor(
    planeId: string,
    planeToPaper2D: Matrix3,
    paperToPlane2D: Matrix3,
    feasible: boolean = true
  ) {
    super(feasible);
    this.planeId = planeId;
    this.planeToPaper2D = planeToPaper2D;
    this.paperToPlane2D = paperToPlane2D;
  }

  /**
   * Clone this realization
   */
  clone(): ProjectionPlaneRealization2D {
    return new ProjectionPlaneRealization2D(
      this.planeId,
      this.planeToPaper2D.clone(),
      this.paperToPlane2D.clone(),
      this.feasible
    );
  }
}

/**
 * ProjectionPlaneRealization3D - Stores computed 3D transformation matrices for a ProjectionPlane
 * This is the cache of evaluated 3D plane transformation for Three.js rendering.
 * Uses Matrix4x3 for dimension-changing transforms (2D homogeneous → 3D homogeneous).
 * 
 * Phase 94: Simple data holder - stores both forward and backward matrices as public fields.
 * Computation happens in realize3D() methods of ProjectionPlane subclasses.
 */
export class ProjectionPlaneRealization3D extends Realization {
  planeId: string;
  
  // Forward: Plane (u,v,1) → 3D (x,y,z,w)
  // 4x3 matrix transforms Vector3 to Vector4 (homogeneous coordinates)
  // Usage: [x, y, z, w] = M × [u, v, 1]
  planeTo3D: Matrix4x3;
  
  // Inverse: 3D (x,y,z,w) → Plane (u,v,1)
  // 3x4 matrix transforms Vector4 to Vector3 (homogeneous coordinates)
  // Usage: [u, v, 1] = M × [x, y, z, w]
  threeDToPlane: Matrix3x4;

  constructor(
    planeId: string,
    planeTo3D: Matrix4x3,
    threeDToPlane: Matrix3x4,
    feasible: boolean = true
  ) {
    super(feasible);
    this.planeId = planeId;
    this.planeTo3D = planeTo3D;
    this.threeDToPlane = threeDToPlane;
  }

  /**
   * Clone this realization
   */
  clone(): ProjectionPlaneRealization3D {
    return new ProjectionPlaneRealization3D(
      this.planeId,
      this.planeTo3D.clone(),
      this.threeDToPlane.clone(),
      this.feasible
    );
  }
}

/**
 * Base ProjectionPlane class - represents the rule/definition of a projection plane
 * 
 * Phase 22.5: Each plane owns its 2D elements
 * - Element storage: points, lines, circles Maps
 * - Realization caches: pointRealizations, lineRealizations, circleRealizations
 * - Dual storage period: Both World and ProjectionPlane store elements during migration
 */
export abstract class ProjectionPlane {
  id?: string;
  abstract readonly type: ProjectionPlaneType;
  name: string;
  isActive: boolean;
  isVisible: boolean;
  color: string;  // Hex color (#RRGGBB)
  plane3DId?: string;  // Reference to Plane3D element (geometric definition)

  /**
   * Get dependency IDs for this plane
   * Used by DependencyService to build the dependency graph
   */
  abstract getDependencies(): string[];

  // Phase 22.5: Element storage (2D elements that belong to this plane)
  private points: Map<string, Point2D>;
  private lines: Map<string, Line2D>;
  private circles: Map<string, Circle2D>;
  
  // Phase 22.5: Realization caches (computed 2D positions/equations)
  private pointRealizations: Map<string, Point2DRealization2D>;
  private lineRealizations: Map<string, Line2DRealization2D>;
  private circleRealizations: Map<string, Circle2DRealization2D>;

  constructor(
    name: string,
    isActive: boolean = false,
    isVisible: boolean = true,
    color: string = '#000000',
    plane3DId?: string
  ) {
    this.name = name;
    this.isActive = isActive;
    this.isVisible = isVisible;
    this.color = color;
    this.plane3DId = plane3DId;
    
    // Initialize element storage
    this.points = new Map();
    this.lines = new Map();
    this.circles = new Map();
    
    // Initialize realization caches
    this.pointRealizations = new Map();
    this.lineRealizations = new Map();
    this.circleRealizations = new Map();
  }

  /**
   * Clear all elements and realizations from this plane
   * Used when loading projects or resetting the world
   */
  clear(): void {
    this.points.clear();
    this.lines.clear();
    this.circles.clear();
    this.pointRealizations.clear();
    this.lineRealizations.clear();
    this.circleRealizations.clear();
  }

  // ==================== Point Methods ====================

  /**
   * Add a point to this plane
   */
  addPoint(point: Point2D, world?: import('./World').World): void {
    if (!point.id) {
      throw new Error('Cannot add point without ID');
    }
    this.points.set(point.id, point);
    if (world) {
      world.getDependencyService().registerNode(point.id, point.getDependencies());
      world.markDirty();
    }
  }

  /**
   * Get a point by ID
   */
  getPoint(id: string): Point2D | undefined {
    return this.points.get(id);
  }

  /**
   * Get a point by label (semantic access)
   * Phase 53: Enable label-based point lookup for semantic references
   * 
   * @param label - Point label (e.g., 'O_H', 'O_V', 'A', 'B')
   * @returns Point with matching label
   * @throws Error if no point found with given label
   * 
   * @example
   * const originH = plane.getPoint2DByLabel('O_H');
   */
  getPoint2DByLabel(label: string): Point2D {
    for (const point of this.points.values()) {
      if (point.label === label) {
        return point;
      }
    }
    throw new Error(`Point not found on plane ${this.name} with label: ${label}`);
  }

  /**
   * Get all points on this plane
   */
  getAllPoints(): Point2D[] {
    return Array.from(this.points.values());
  }

  /**
   * Remove a point from this plane
   */
  removePoint(id: string, world?: import('./World').World): boolean {
    this.pointRealizations.delete(id);  // Clear cached realization
    const removed = this.points.delete(id);
    if (removed && world) {
      world.getDependencyService().unregisterNode(id);
      world.markDirty();
    }
    return removed;
  }

  /**
   * Get point realization (cached 2D position)
   * Phase 22.5: Consistent naming - all 2D realization methods end with "2D"
   */
  getPointRealization2D(id: string): Point2DRealization2D | undefined {
    return this.pointRealizations.get(id);
  }

  /**
   * Set/cache point realization
   */
  setPointRealization2D(id: string, realization: Point2DRealization2D): void {
    this.pointRealizations.set(id, realization);
  }

  /**
   * Clear point realization cache
   */
  clearPointRealization2D(id: string): void {
    this.pointRealizations.delete(id);
  }

  // ==================== Line Methods ====================

  /**
   * Add a line to this plane
   */
  addLine(line: Line2D, world?: import('./World').World): void {
    if (!line.id) {
      throw new Error('Cannot add line without ID');
    }
    this.lines.set(line.id, line);
    if (world) {
      world.getDependencyService().registerNode(line.id, line.getDependencies());
      world.markDirty();
    }
  }

  /**
   * Get a line by ID
   */
  getLine(id: string): Line2D | undefined {
    return this.lines.get(id);
  }

  /**
   * Get all lines on this plane
   */
  getAllLines(): Line2D[] {
    return Array.from(this.lines.values());
  }

  /**
   * Remove a line from this plane
   */
  removeLine(id: string, world?: import('./World').World): boolean {
    this.lineRealizations.delete(id);  // Clear cached realization
    const removed = this.lines.delete(id);
    if (removed && world) {
      world.getDependencyService().unregisterNode(id);
      world.markDirty();
    }
    return removed;
  }

  /**
   * Get line realization (cached 2D equation)
   * Phase 22.5: Consistent naming - all 2D realization methods end with "2D"
   * Note: This includes segments, guides, and all Line2D subtypes
   */
  getLineRealization2D(id: string): Line2DRealization2D | undefined {
    return this.lineRealizations.get(id);
  }

  /**
   * Set/cache line realization
   */
  setLineRealization2D(id: string, realization: Line2DRealization2D): void {
    this.lineRealizations.set(id, realization);
  }

  /**
   * Clear line realization cache
   */
  clearLineRealization2D(id: string): void {
    this.lineRealizations.delete(id);
  }

  // ==================== Circle Methods ====================

  /**
   * Add a circle to this plane
   */
  addCircle(circle: Circle2D, world?: import('./World').World): void {
    if (!circle.id) {
      throw new Error('Cannot add circle without ID');
    }
    this.circles.set(circle.id, circle);
    if (world) {
      world.getDependencyService().registerNode(circle.id, circle.getDependencies());
      world.markDirty();
    }
  }

  /**
   * Get a circle by ID
   */
  getCircle(id: string): Circle2D | undefined {
    return this.circles.get(id);
  }

  /**
   * Get all circles on this plane
   */
  getAllCircles(): Circle2D[] {
    return Array.from(this.circles.values());
  }

  /**
   * Remove a circle from this plane
   */
  removeCircle(id: string, world?: import('./World').World): boolean {
    this.circleRealizations.delete(id);  // Clear cached realization
    const removed = this.circles.delete(id);
    if (removed && world) {
      world.getDependencyService().unregisterNode(id);
      world.markDirty();
    }
    return removed;
  }

  /**
   * Get circle realization (cached 2D geometry)
   * Phase 22.5: Consistent naming - all 2D realization methods end with "2D"
   */
  getCircleRealization2D(id: string): Circle2DRealization2D | undefined {
    return this.circleRealizations.get(id);
  }

  /**
   * Set/cache circle realization
   */
  setCircleRealization2D(id: string, realization: Circle2DRealization2D): void {
    this.circleRealizations.set(id, realization);
  }

  /**
   * Clear circle realization cache
   */
  clearCircleRealization2D(id: string): void {
    this.circleRealizations.delete(id);
  }

  // ==================== Realization Computation Methods ====================
  // Phase 22.5: Realization computation moved from World to ProjectionPlane
  // These methods compute realizations and manage the plane-level cache

  /**
   * Compute and cache 2D realization for a point
   * @param point Point to realize
   * @param world World context for querying dependencies
   * @returns Point2DRealization2D if computation succeeds, undefined otherwise
   */
  realizePoint2D(point: Point2D, world: import('./World').World): Point2DRealization2D | undefined {
    // Check cache first
    const cached = this.pointRealizations.get(point.id);
    if (cached) {
      return cached;
    }

    // Compute realization - point will query world for parent element realizations
    const realization = point.realize2D(world);
    if (!realization) {
      return undefined;  // Cannot compute (e.g., missing dependencies)
    }

    // Cache the result
    this.pointRealizations.set(point.id, realization);
    return realization;
  }

  /**
   * Compute and cache 2D realization for a line
   * @param line Line to realize (includes segments, guides, hinge lines - all Line2D subtypes)
   * @param world World context for querying dependencies
   * @returns Line2DRealization2D if computation succeeds, undefined otherwise
   */
  realizeLine2D(line: Line2D, world: import('./World').World): Line2DRealization2D | undefined {
    // Check cache first
    const cached = this.lineRealizations.get(line.id);
    if (cached) {
      return cached;
    }

    // Compute realization - line will query world for parent point realizations
    const realization = line.realize2D(world);
    if (!realization) {
      return undefined;  // Cannot compute (e.g., missing dependency points)
    }

    // Cache the result
    this.lineRealizations.set(line.id, realization);
    return realization;
  }

  /**
   * Compute and cache 2D realization for a circle
   * @param circle Circle to realize
   * @param world World context for querying dependencies
   * @returns Circle2DRealization2D if computation succeeds, undefined otherwise
   */
  realizeCircle2D(circle: Circle2D, world: import('./World').World): Circle2DRealization2D | undefined {
    // Check cache first
    const cached = this.circleRealizations.get(circle.id);
    if (cached) {
      return cached;
    }

    // Compute realization - circle will query world for parent element realizations
    const realization = circle.realize2D(world);
    if (!realization) {
      return undefined;  // Cannot compute (e.g., missing dependencies)
    }

    // Cache the result
    this.circleRealizations.set(circle.id, realization);
    return realization;
  }

  // ==================== Factory Methods ====================
  // Phase 22.5: Factory methods moved from World to ProjectionPlane
  // These methods create and add 2D elements to this plane

  /**
   * Generate unique Point2D ID using World's counter
   */
  generatePoint2DId(world: import('./World').World): string {
    const localId = `point2d_${world.getNextId()}`;
    return buildElementId(this.id, localId);
  }

  /**
   * Generate unique Line2D ID using World's counter
   */
  generateLine2DId(world: import('./World').World): string {
    const localId = `line2d_${world.getNextId()}`;
    return buildElementId(this.id, localId);
  }

  /**
   * Generate unique Segment2D ID using World's counter
   */
  generateSegment2DId(world: import('./World').World): string {
    const localId = `segment2d_${world.getNextId()}`;
    return buildElementId(this.id, localId);
  }

  /**
   * Generate unique Circle2D ID using World's counter
   */
  generateCircle2DId(world: import('./World').World): string {
    const localId = `circle2d_${world.getNextId()}`;
    return buildElementId(this.id, localId);
  }

  /**
   * Generate unique Guide2D ID using World's counter
   */
  generateGuide2DId(world: import('./World').World): string {
    const localId = `guide2d_${world.getNextId()}`;
    return buildElementId(this.id, localId);
  }

  /**
   * Factory method: Create and add a FreePoint2D to this plane
   * 
   * @param position Position vector in intrinsic plane coordinates
   * @param world World instance for ID generation
   * @param id Optional ID - ONLY pass this for redo operations that need to recreate
   *           an element with its previous ID. All other callers (tests, tools, normal
   *           operations) should omit this parameter to get an auto-generated hierarchical ID.
   *           
   *           Tests must pass null/undefined and capture the returned element's ID:
   *           ```typescript
   *           const p1 = plane.addFreePoint2D(pos, world);  // Auto-generates ID
   *           const p2 = plane.addFreePoint2D(pos2, world);
   *           const line = plane.addLineByTwoPoints(p1.id, p2.id, world);
   *           ```
   * @returns The created FreePoint2D
   */
  addFreePoint2D(
    position: Vector3,
    world: import('./World').World,
    id?: string,
    label?: string
  ): FreePoint2D {
    if (!this.id) {
      throw new Error('Cannot add point to plane without ID');
    }

    // Generate unique ID if not provided
    if (!id) {
      id = this.generatePoint2DId(world);
    }

    const point = new FreePoint2D(id, position, this.id, label);
    
    this.addPoint(point, world);
    return point;
  }

  /**
   * Factory method: Create and add a Point2DLineLineIntersection to this plane
   * 
   * @param line1Id ID of first line
   * @param line2Id ID of second line
   * @param world World context for validation and ID generation
   * @param id Optional ID - ONLY for redo operations. Tests and normal operations should
   *           omit this to get auto-generated IDs. See addFreePoint2D() for test pattern.
   * @returns The created Point2DLineLineIntersection
   */
  addLineLineIntersection(
    line1Id: string,
    line2Id: string,
    world: import('./World').World,
    id?: string
  ): Point2DLineLineIntersection {
    if (!this.id) {
      throw new Error('Cannot add point to plane without ID');
    }

    // Validate lines exist
    const l1 = this.getLine(line1Id) || world.getLine2D(line1Id);
    const l2 = this.getLine(line2Id) || world.getLine2D(line2Id);
    const line1 = l1.realize2D(world);
    const line2 = l2.realize2D(world);
    
    if (!line1) {
      throw new Error(`Invalid line1Id: ${line1Id}. Line does not exist.`);
    }
    if (!line2) {
      throw new Error(`Invalid line2Id: ${line2Id}. Line does not exist.`);
    }

    // Generate unique ID if not provided
    if (!id) {
      id = this.generatePoint2DId(world);
    }

    const point = new Point2DLineLineIntersection(id, line1Id, line2Id, this.id);
    
    this.addPoint(point, world);
    return point;
  }

  /**
   * Factory method: Create and add a Point2DLineCircleIntersection to this plane
   * @param lineId ID of the line
   * @param circleId ID of the circle
   * @param index Intersection index (0 or 1)
   * @param world World context for validation and ID generation
   * @param id Optional ID for redo operations
   * @returns The created Point2DLineCircleIntersection
   */
  addLineCircleIntersection(
    lineId: string,
    circleId: string,
    index: number,
    world: import('./World').World,
    id?: string
  ): Point2DLineCircleIntersection {
    if (!this.id) {
      throw new Error('Cannot add point to plane without ID');
    }

    // Validate elements exist
    const lineElement = this.getLine(lineId);
    const circleElement = this.getCircle(circleId);
    const line = lineElement.realize2D(world);
    const circle = circleElement.realize2D(world);
    
    if (!line) {
      throw new Error(`Invalid lineId: ${lineId}. Line does not exist.`);
    }
    if (!circle) {
      throw new Error(`Invalid circleId: ${circleId}. Circle does not exist.`);
    }

    // Validate index
    if (index !== 0 && index !== 1) {
      throw new Error(`Invalid index: ${index}. Must be 0 or 1.`);
    }

    // Generate unique ID if not provided
    if (!id) {
      id = this.generatePoint2DId(world);
    }

    const point = new Point2DLineCircleIntersection(id, lineId, circleId, index, this.id);
    
    this.addPoint(point, world);
    return point;
  }

  /**
   * Factory method: Create and add a Point2DCircleCircleIntersection to this plane
   * @param circle1Id ID of first circle
   * @param circle2Id ID of second circle
   * @param index Intersection index (0 or 1)
   * @param world World context for validation and ID generation
   * @param id Optional ID for redo operations
   * @returns The created Point2DCircleCircleIntersection
   */
  addCircleCircleIntersection(
    circle1Id: string,
    circle2Id: string,
    index: number,
    world: import('./World').World,
    id?: string
  ): Point2DCircleCircleIntersection {
    if (!this.id) {
      throw new Error('Cannot add point to plane without ID');
    }

    // Validate circles exist
    const circle1Element = this.getCircle(circle1Id);
    const circle2Element = this.getCircle(circle2Id);
    const circle1 = circle1Element.realize2D(world);
    const circle2 = circle2Element.realize2D(world);
    
    if (!circle1) {
      throw new Error(`Invalid circle1Id: ${circle1Id}. Circle does not exist.`);
    }
    if (!circle2) {
      throw new Error(`Invalid circle2Id: ${circle2Id}. Circle does not exist.`);
    }

    // Validate index
    if (index !== 0 && index !== 1) {
      throw new Error(`Invalid index: ${index}. Must be 0 or 1.`);
    }

    // Generate unique ID if not provided
    if (!id) {
      id = this.generatePoint2DId(world);
    }

    const point = new Point2DCircleCircleIntersection(id, circle1Id, circle2Id, index, this.id);
    
    this.addPoint(point, world);
    return point;
  }

  /**
   * Factory method: Create and add a Line2DByTwoPoints to this plane
   * 
   * @param point1Id ID of first point
   * @param point2Id ID of second point
   * @param world World context for validation and ID generation
   * @param id Optional ID - ONLY for redo operations. Tests and normal operations should
   *           omit this to get auto-generated IDs. See addFreePoint2D() for test pattern.
   * @returns The created Line2DByTwoPoints
   */
  addLine2DBetweenTwoPoints(
    point1Id: string,
    point2Id: string,
    world: import('./World').World,
    id?: string
  ): Line2DByTwoPoints {
    if (!this.id) {
      throw new Error('Cannot add line to plane without ID');
    }

    // Validate points exist
    const point1 = this.getPoint(point1Id);
    const point2 = this.getPoint(point2Id);
    
    if (!point1) {
      throw new Error(`Invalid point1Id: ${point1Id}. Point does not exist on this plane.`);
    }
    if (!point2) {
      throw new Error(`Invalid point2Id: ${point2Id}. Point does not exist on this plane.`);
    }

    // Validate points are distinct
    if (point1Id === point2Id) {
      throw new Error(`Cannot create line from a point to itself. point1Id and point2Id must be different.`);
    }

    // Validate points have distinct positions
    const point1Realization = point1.realize2D(world);
    const point2Realization = point2.realize2D(world);
    
    if (!point1Realization || !point2Realization) {
      throw new Error(`Cannot compute point realizations. Points may depend on missing elements.`);
    }

    const distance = point1Realization.position.distanceTo(point2Realization.position);
    if (distance < 1e-10) {
      throw new Error(`Points ${point1Id} and ${point2Id} are too close (distance: ${distance}). Cannot create line.`);
    }

    // Generate unique ID if not provided
    if (!id) {
      id = this.generateLine2DId(world);
    }

    const line = new Line2DByTwoPoints(id, point1Id, point2Id, this.id);
    
    this.addLine(line, world);
    return line;
  }

  /**
   * Factory method: Create and add a Line2DParallel to this plane
   * 
   * @param referenceLineId ID of line to be parallel to
   * @param throughPointId ID of point the new line passes through
   * @param world World context for validation and ID generation
   * @param id Optional ID - ONLY for redo operations. Tests and normal operations should
   *           omit this to get auto-generated IDs. See addFreePoint2D() for test pattern.
   * @returns The created Line2DParallel
   */
  addLine2DParallelToLine(
    referenceLineId: string,
    throughPointId: string,
    world: import('./World').World,
    id?: string
  ): Line2DParallel {
    if (!this.id) {
      throw new Error('Cannot add line to plane without ID');
    }

    // Validate through-point exists on this plane
    const throughPoint = this.getPoint(throughPointId);
    if (!throughPoint) {
      throw new Error(`Invalid throughPointId: ${throughPointId}. Point does not exist on this plane.`);
    }

    // Validate reference line exists (could be on any plane)
    const refLineElement = world.getLine2D(referenceLineId);
    const referenceLine = refLineElement.realize2D(world);
    if (!referenceLine) {
      throw new Error(`Invalid referenceLineId: ${referenceLineId}. Line does not exist.`);
    }

    // Generate unique ID if not provided
    if (!id) {
      id = this.generateLine2DId(world);
    }

    const line = new Line2DParallel(id, referenceLineId, throughPointId, this.id);
    
    this.addLine(line, world);
    return line;
  }

  /**
   * Add a line perpendicular to a reference line, passing through a point
   * 
   * @param referenceLineId The reference line to be perpendicular to (90° angle)
   * @param throughPointId The point the perpendicular line passes through
   * @param world World instance for validation
   * @param id Optional explicit ID for redo operations. Usually you should
   *           omit this to get auto-generated IDs.
   * @returns The created Line2DPerpendicularToLine
   */
  addLine2DPerpendicularToLine(
    referenceLineId: string,
    throughPointId: string,
    world: import('./World').World,
    id?: string
  ): Line2DPerpendicularToLine {
    if (!this.id) {
      throw new Error('Cannot add line to plane without ID');
    }

    // Validate through-point exists on this plane
    const throughPoint = this.getPoint(throughPointId);
    if (!throughPoint) {
      throw new Error(`Invalid throughPointId: ${throughPointId}. Point does not exist on this plane.`);
    }

    // Validate reference line exists (could be on any plane)
    const refLineElement = world.getLine2D(referenceLineId);
    const referenceLine = refLineElement.realize2D(world);
    if (!referenceLine) {
      throw new Error(`Invalid referenceLineId: ${referenceLineId}. Line does not exist.`);
    }

    // Generate unique ID if not provided
    if (!id) {
      id = this.generateLine2DId(world);
    }

    const line = new Line2DPerpendicularToLine(id, referenceLineId, throughPointId, this.id);
    
    this.addLine(line, world);
    return line;
  }

  /**
   * Factory method: Create and add Line2DTangentToCircleThroughPoint to this plane
   * 
   * Phase 60: Tangent line to circle passing through external point
   * 
   * @param circleId ID of circle to be tangent to
   * @param throughPointId ID of external point line passes through
   * @param tangentIndex Index (0 or 1) to disambiguate which tangent line (angle-based)
   * @param world World context for validation and ID generation
   * @param id Optional ID - ONLY for redo operations
   * @returns The created Line2DTangentToCircleThroughPoint
   */
  addLine2DTangentToCircleThroughPoint(
    circleId: string,
    throughPointId: string,
    tangentIndex: 0 | 1,
    world: import('./World').World,
    id?: string
  ): Line2DTangentToCircleThroughPoint {
    if (!this.id) {
      throw new Error('Cannot add line to plane without ID');
    }

    // Validate circle exists on this plane
    const circle = this.getCircle(circleId);
    if (!circle) {
      throw new Error(`Invalid circleId: ${circleId}. Circle does not exist on this plane.`);
    }

    // Validate through-point exists on this plane
    const throughPoint = this.getPoint(throughPointId);
    if (!throughPoint) {
      throw new Error(`Invalid throughPointId: ${throughPointId}. Point does not exist on this plane.`);
    }

    // Validate tangent index
    if (tangentIndex !== 0 && tangentIndex !== 1) {
      throw new Error(`Invalid tangentIndex: ${tangentIndex}. Must be 0 or 1.`);
    }

    // Generate unique ID if not provided
    if (!id) {
      id = this.generateLine2DId(world);
    }

    const line = new Line2DTangentToCircleThroughPoint(
      id,
      circleId,
      throughPointId,
      tangentIndex,
      this.id
    );
    
    this.addLine(line, world);
    return line;
  }

  /**
   * Factory method: Create and add Line2DTangentToCircleParallelToLine to this plane
   * 
   * Phase 61: Tangent line to circle parallel to reference line
   * 
   * @param circleId ID of circle to be tangent to
   * @param referenceLineId ID of line to be parallel to (can be on any plane)
   * @param tangentIndex Index (0 or 1) to disambiguate which tangent line (angle-based)
   * @param world World context for validation and ID generation
   * @param id Optional ID - ONLY for redo operations
   * @returns The created Line2DTangentToCircleParallelToLine
   */
  addLine2DTangentToCircleParallelToLine(
    circleId: string,
    referenceLineId: string,
    tangentIndex: 0 | 1,
    world: import('./World').World,
    id?: string
  ): Line2DTangentToCircleParallelToLine {
    if (!this.id) {
      throw new Error('Cannot add line to plane without ID');
    }

    // Validate circle exists on this plane
    const circle = this.getCircle(circleId);
    if (!circle) {
      throw new Error(`Invalid circleId: ${circleId}. Circle does not exist on this plane.`);
    }

    // Validate reference line exists (could be on any plane)
    const refLineElement = world.getLine2D(referenceLineId);
    const referenceLine = refLineElement.realize2D(world);
    if (!referenceLine) {
      throw new Error(`Invalid referenceLineId: ${referenceLineId}. Line does not exist.`);
    }

    // Validate tangent index
    if (tangentIndex !== 0 && tangentIndex !== 1) {
      throw new Error(`Invalid tangentIndex: ${tangentIndex}. Must be 0 or 1.`);
    }

    // Generate unique ID if not provided
    if (!id) {
      id = this.generateLine2DId(world);
    }

    const line = new Line2DTangentToCircleParallelToLine(
      id,
      circleId,
      referenceLineId,
      tangentIndex,
      this.id
    );
    
    this.addLine(line, world);
    return line;
  }

  /**
   * Factory method: Create and add a Segment2DByPoints to this plane
   * 
   * @param point1Id ID of first endpoint
   * @param point2Id ID of second endpoint
   * @param world World context for validation and ID generation
   * @param id Optional ID - ONLY for redo operations. Tests and normal operations should
   *           omit this to get auto-generated IDs. See addFreePoint2D() for test pattern.
   * @returns The created Segment2DByPoints
   */
  addSegment2DBetweenPoints(
    point1Id: string,
    point2Id: string,
    world: import('./World').World,
    id?: string
  ): Segment2DByPoints {
    if (!this.id) {
      throw new Error('Cannot add segment to plane without ID');
    }

    // Validate points exist
    const point1 = this.getPoint(point1Id);
    const point2 = this.getPoint(point2Id);
    
    if (!point1) {
      throw new Error(`Invalid point1Id: ${point1Id}. Point does not exist on this plane.`);
    }
    if (!point2) {
      throw new Error(`Invalid point2Id: ${point2Id}. Point does not exist on this plane.`);
    }

    // Validate points are distinct
    if (point1Id === point2Id) {
      throw new Error(`Cannot create segment from a point to itself. point1Id and point2Id must be different.`);
    }

    // Generate unique ID if not provided
    if (!id) {
      id = this.generateSegment2DId(world);
    }

    const segment = new Segment2DByPoints(id, point1Id, point2Id, this.id);
    
    this.addLine(segment, world);  // Segments are stored as lines
    return segment;
  }

  /**
   * Factory method: Create and add a Circle2DByCenterAndPoint to this plane
   * 
   * @param centerPointId ID of center point
   * @param circumferencePointId ID of point on circumference
   * @param world World context for validation and ID generation
   * @param id Optional ID - ONLY for redo operations. Tests and normal operations should
   *           omit this to get auto-generated IDs. See addFreePoint2D() for test pattern.
   * @returns The created Circle2DByCenterAndPoint
   */
  addCircle2DByCenterAndPoint(
    centerPointId: string,
    circumferencePointId: string,
    world: import('./World').World,
    id?: string
  ): Circle2DByCenterAndPoint {
    if (!this.id) {
      throw new Error('Cannot add circle to plane without ID');
    }

    // Validate points exist
    const centerPoint = this.getPoint(centerPointId);
    const circumferencePoint = this.getPoint(circumferencePointId);
    
    if (!centerPoint) {
      throw new Error(`Invalid centerPointId: ${centerPointId}. Point does not exist on this plane.`);
    }
    if (!circumferencePoint) {
      throw new Error(`Invalid circumferencePointId: ${circumferencePointId}. Point does not exist on this plane.`);
    }

    // Validate points are distinct
    if (centerPointId === circumferencePointId) {
      throw new Error(`Cannot create circle with center and circumference point being the same point.`);
    }

    // Generate unique ID if not provided
    if (!id) {
      id = this.generateCircle2DId(world);
    }

    const circle = new Circle2DByCenterAndPoint(id, centerPointId, circumferencePointId, this.id);
    
    this.addCircle(circle, world);
    return circle;
  }

  /**
   * Factory method: Create and add a Guide2D to this plane
   * 
   * @param referenceLineId ID of line to be perpendicular to
   * @param throughPointId ID of point the guide passes through
   * @param world World context for validation and ID generation
   * @param id Optional ID - ONLY for redo operations. Tests and normal operations should
   *           omit this to get auto-generated IDs. See addFreePoint2D() for test pattern.
   * @returns The created Guide2D
   */
  addGuide2D(
    referenceLineId: string,
    throughPointId: string,
    world: import('./World').World,
    id?: string
  ): Guide2D {
    if (!this.id) {
      throw new Error('Cannot add guide to plane without ID');
    }

    // Validate through point exists on this plane
    const throughPoint = this.getPoint(throughPointId);
    if (!throughPoint) {
      throw new Error(`Invalid throughPointId: ${throughPointId}. Point does not exist on this plane.`);
    }

    // Validate reference line exists (could be on any plane for perpendicular construction)
    const refLineElement = world.getLine2D(referenceLineId);
    if (!refLineElement) {
      throw new Error(`Invalid referenceLineId: ${referenceLineId}. Line does not exist.`);
    }
    
    const referenceLine = refLineElement.realize2D(world);
    if (!referenceLine) {
      throw new Error(`Invalid referenceLineId: ${referenceLineId}. Line cannot be realized.`);
    }

    // Generate unique ID if not provided
    if (!id) {
      id = this.generateGuide2DId(world);
    }

    const guide = new Guide2D(id, referenceLineId, throughPointId, this.id);
    
    this.addLine(guide, world);  // Guides are stored as lines
    return guide;
  }

  /**
   * Add a sibling guide to this plane
   * 
   * Sibling guides are automatically created when a primary Guide2D is created.
   * They maintain the same geometric relationship (perpendicular to HalfHingeLine2D)
   * but in the paired projection plane.
   * 
   * @param primaryGuideId ID of the primary guide that spawned this sibling
   * @param referenceLineId ID of the HalfHingeLine2D in this (sibling) plane
   * @param world World instance for validation
   * @param id Optional ID for the sibling guide (generated if not provided)
   * @returns The created SiblingGuide2D
   * @throws Error if validation fails
   */
  addSiblingGuide2D(
    primaryGuideId: string,
    referenceLineId: string,
    world: import('./World').World,
    id?: string
  ): import('./Guide').SiblingGuide2D {
    if (!this.id) {
      throw new Error('Cannot add sibling guide to plane without ID');
    }

    // Validate reference line exists in world
    const refLineElement = world.getLine2D(referenceLineId);
    if (!refLineElement) {
      throw new Error(`Invalid referenceLineId: ${referenceLineId}. Line does not exist.`);
    }
    
    const referenceLine = refLineElement.realize2D(world);
    if (!referenceLine) {
      throw new Error(`Invalid referenceLineId: ${referenceLineId}. Line cannot be realized.`);
    }

    // Validate primary guide exists
    const primaryGuide = world.getLine2D(primaryGuideId);
    if (!primaryGuide) {
      throw new Error(`Invalid primaryGuideId: ${primaryGuideId}. Primary guide does not exist.`);
    }

    // Generate unique ID if not provided
    if (!id) {
      id = this.generateGuide2DId(world);
    }

    // Get label from primary guide
    const label = primaryGuide.label;
    
    const siblingGuide = new SiblingGuide2D(
      id,
      referenceLineId,
      this.id,
      primaryGuideId,
      label
    );
    
    this.addLine(siblingGuide, world);  // Sibling guides are stored as lines
    return siblingGuide;
  }

  /**
   * Factory method: Create and add a sibling intersection point to this plane
   * 
   * When an element intersects with a HalfHingeLine2D, the intersection represents
   * a 3D point that projects onto both planes. This method creates the sibling
   * intersection point on the paired projection plane.
   * 
   * Architecture note: Follows the same pattern as addSiblingGuide2D (Phase 36).
   * The sibling point uses SiblingIntersectionPoint2D which realizes by cloning
   * the primary point's coordinates (valid when HHL parametric consistency holds).
   * 
   * @param primaryIntersectionId ID of the primary intersection point
   * @param world World context for validation and ID generation
   * @param id Optional ID for redo support
   * @returns The created SiblingIntersectionPoint2D
   * @throws Error if plane has no ID or primary intersection doesn't exist
   */
  addSiblingIntersectionPoint(
    primaryIntersectionId: string,
    world: import('./World').World,
    id?: string
  ): import('./Point').SiblingIntersectionPoint2D {
    if (!this.id) {
      throw new Error('Cannot add sibling intersection point to plane without ID');
    }

    // Validate primary intersection exists
    const primaryPlane = world.getPlaneForElement(primaryIntersectionId);
    if (!primaryPlane) {
      throw new Error(`Primary intersection point not found: ${primaryIntersectionId}`);
    }

    const primaryPoint = primaryPlane.getPoint(primaryIntersectionId);
    if (!primaryPoint) {
      throw new Error(`Primary intersection point not found: ${primaryIntersectionId}`);
    }

    // Validate primary is an intersection type using instanceof
    const isIntersection = primaryPoint instanceof Point2DLineLineIntersection ||
                           primaryPoint instanceof Point2DLineCircleIntersection ||
                           primaryPoint instanceof Point2DCircleCircleIntersection;
    
    if (!isIntersection) {
      throw new Error(`Primary point must be an intersection type, got: ${primaryPoint.constructor.name}`);
    }

    // Generate unique ID if not provided
    if (!id) {
      id = this.generatePoint2DId(world);
    }

    // Get label from primary point
    const label = primaryPoint.label;
    
    const siblingPoint = new SiblingIntersectionPoint2D(
      id,
      primaryIntersectionId,
      this.id,
      label
    );
    
    // Link bidirectionally
    (primaryPoint as any).siblingPointId = siblingPoint.id;
    
    this.addPoint(siblingPoint, world);
    return siblingPoint;
  }

  /**
   * Element factory: Add origin point to projection plane
   * 
   * Creates a locked origin point at the specified position.
   * Origin points cannot be moved or deleted by user actions.
   * 
   * @param position Position in intrinsic plane coordinates (typically (0,0,1))
   * @param world World instance for ID generation
   * @param id Optional ID for redo support
   * @param label Optional label for semantic access (e.g., 'O_H', 'O_V')
   * @returns The created origin FreePoint2D (with locked=true)
   */
  addOriginPoint2D(
    position: Vector3,
    world: import('./World').World,
    id?: string,
    label?: string
  ): FreePoint2D {
    if (!this.id) {
      throw new Error('Cannot add origin point to plane without ID');
    }

    // Generate unique ID if not provided
    if (!id) {
      id = this.generatePoint2DId(world);
    }

    const originPoint = new FreePoint2D(id, position, this.id, label);
    originPoint.locked = true;  // Lock origin point
    
    this.addPoint(originPoint, world);
    return originPoint;
  }

  /**
   * Element factory: Add half hinge line to projection plane
   * 
   * Creates a half hinge line (2D representation of 3D hinge line).
   * This is a special line type that represents where the plane intersects
   * the main hinge line axis.
   * 
   * @param hingeLineId ID of the 3D HingeLine this represents
   * @param point Point on the half hinge line (typically origin)
   * @param direction Direction vector of the half hinge line (typically (1,0,0))
   * @param world World instance for ID generation
   * @param id Optional ID for redo support
   * @returns The created HalfHingeLine2D
   */
  /**
   * Add half hinge line to this plane
   * **Phase 84**: No geometry parameters - computed on demand from canonical coordinates
   */
  addHalfHingeLine2D(
    hingeLineId: string,
    world: import('./World').World,
    id?: string
  ): HalfHingeLine2D {
    if (!this.id) {
      throw new Error('Cannot add half hinge line to plane without ID');
    }

    // Generate unique ID if not provided
    if (!id) {
      id = this.generateLine2DId(world);
    }

    const hingeLine = world.getHingeLineById(hingeLineId);
    if (!hingeLine) {
      throw new Error(`Cannot add HalfHingeLine2D: HingeLine ${hingeLineId} not found`);
    }

    // Phase 84: Create without geometry - computed on demand via realize2D()
    const halfHingeLine = new HalfHingeLine2D(
      id,
      hingeLineId,
      this.id
    );

    // Phase 84: No parametric consistency validation needed - automatic with canonical coordinates
    
    this.addLine(halfHingeLine);
    return halfHingeLine;
  }

  /**
   * Clone this plane
   */
  abstract clone(): ProjectionPlane;

  /**
   * Calculate the 2D realization (transformation matrices) for this projection plane
   * For fixed planes: returns predetermined transforms
   * For auxiliary planes: computes from trace/hinge geometry
   * 
   * @param world - World instance for element lookup (auxiliary planes need this)
   */
  abstract realize2D(world: any): ProjectionPlaneRealization2D;

  /**
   * Calculate the 3D realization (transformation matrix) for this projection plane
   * Transforms plane intrinsic coordinates to 3D space coordinates
   * 
   * @param world - World instance for element lookup (auxiliary planes need this)
   */
  abstract realize3D(world: any): ProjectionPlaneRealization3D;

  /**
   * Protected helper: Compute backward 2D matrix (paperToPlane) from forward matrix (planeToPaper)
   * Shared between FixedProjectionPlane and AuxiliaryProjectionPlane realize2D() methods.
   * Extracted to base class to eliminate code duplication.
   * 
   * @param planeToPaper - Forward transformation matrix
   * @returns Object with paperToPlane matrix and feasibility flag
   */
  protected computeBackward2DMatrix(planeToPaper: Matrix3): { paperToPlane: Matrix3; feasible: boolean } {
    let feasible = true;
    let paperToPlane: Matrix3;
    
    try {
      const det = planeToPaper.determinant();
      
      if (Math.abs(det) < 1e-10) {
        // Matrix is singular (degenerate plane) - mark infeasible
        feasible = false;
        paperToPlane = new Matrix3(); // Identity as fallback
      } else {
        paperToPlane = planeToPaper.clone().invert();
      }
    } catch (error) {
      // Inversion failed - mark infeasible
      feasible = false;
      paperToPlane = new Matrix3(); // Identity as fallback
    }
    
    return { paperToPlane, feasible };
  }
}

/**
 * FixedProjectionPlane - For P_H and P_V with predetermined transformations
 * 
 * Phase 94: Stores only forward matrices. Backward matrices computed in realize methods.
 * The rule is: "this is P_H" or "this is P_V"
 * These planes have fixed positions in paper coordinate system.
 * Their transformation matrices are predetermined constants stored in the object.
 * 
 * Note: Not to be confused with the abstract base class ProjectionPlane.
 * "Fixed" means these planes have immutable, pre-determined transformations.
 */
export class FixedProjectionPlane extends ProjectionPlane {
  readonly type: ProjectionPlaneType = 'base';

  // Predetermined forward transformation matrices (part of the plane definition)
  private readonly planeToPaper2D: Matrix3;
  private readonly planeTo3D: Matrix4x3;

  constructor(
    name: string,
    planeToPaper2D: Matrix3,
    planeTo3D: Matrix4x3,
    isActive: boolean = false,
    isVisible: boolean = true,
    color: string = '#000000',
    plane3DId?: string
  ) {
    super(name, isActive, isVisible, color, plane3DId);
    this.planeToPaper2D = planeToPaper2D;
    this.planeTo3D = planeTo3D;
  }

  clone(): FixedProjectionPlane {
    const cloned = new FixedProjectionPlane(
      this.name,
      this.planeToPaper2D.clone(),
      this.planeTo3D.clone(),
      this.isActive,
      this.isVisible,
      this.color,
      this.plane3DId
    );
    if (this.id) {
      cloned.id = this.id;
    }
    return cloned;
  }
  
  getDependencies(): string[] {
    return []; // Fixed planes have no dependencies on other elements
  }
  
  /**
   * Calculate the 2D transformation realization for this fixed plane
   * Computes paperToPlane2D (inverse) using shared base class helper.
   * 
   * @param _world - World instance (not used for fixed planes, but required for API uniformity)
   */
  realize2D(_world: any): ProjectionPlaneRealization2D {
    if (!this.id) {
      throw new Error('Cannot create realization for plane without ID');
    }
    
    // Use shared helper to compute backward matrix with determinant check
    const { paperToPlane, feasible } = this.computeBackward2DMatrix(this.planeToPaper2D);
    
    return new ProjectionPlaneRealization2D(
      this.id,
      this.planeToPaper2D.clone(),
      paperToPlane,
      feasible
    );
  }

  /**
   * Calculate the 3D transformation realization for this fixed plane
   * Computes threeDToPlane (projection) from planeTo3D basis vectors.
   * 
   * @param _world - World instance (not used for fixed planes, but required for API uniformity)
   */
  realize3D(_world: any): ProjectionPlaneRealization3D {
    if (!this.id) {
      throw new Error('Cannot create realization for plane without ID');
    }
    
    // Compute projection matrix from embedding matrix basis vectors
    // planeTo3D columns: [U-axis, V-axis, origin, w-component]
    // Extract normalized basis vectors and origin
    const uAxis = new Vector3(
      this.planeTo3D.elements[0],   // M[0][0]
      this.planeTo3D.elements[4],   // M[1][0]
      this.planeTo3D.elements[8]    // M[2][0]
    ).normalize();
    
    const vAxis = new Vector3(
      this.planeTo3D.elements[1],   // M[0][1]
      this.planeTo3D.elements[5],   // M[1][1]
      this.planeTo3D.elements[9]    // M[2][1]
    ).normalize();
    
    const origin = new Vector3(
      this.planeTo3D.elements[2],   // M[0][2]
      this.planeTo3D.elements[6],   // M[1][2]
      this.planeTo3D.elements[10]   // M[2][2]
    );
    
    // Build projection matrix: (point - origin) · basis vectors
    // Row 1: U projection = point · uAxis - origin · uAxis
    // Row 2: V projection = point · vAxis - origin · vAxis
    // Row 3: Homogeneous coordinate [0, 0, 0, 1]
    const threeDToPlane = new Matrix3x4();
    threeDToPlane.set(
      uAxis.x, uAxis.y, uAxis.z, -origin.dot(uAxis),
      vAxis.x, vAxis.y, vAxis.z, -origin.dot(vAxis),
      0, 0, 0, 1
    );
    
    return new ProjectionPlaneRealization3D(
      this.id,
      this.planeTo3D.clone(),
      threeDToPlane,
      true  // Base planes are always feasible
    );
  }
}

/**
 * AuxiliaryProjectionPlane - User-created projection planes with dynamic transformations
 * 
 * CRITICAL DISTINCTION:
 * - BaseProjectionPlane (P_H, P_V): Initialization only, pre-computed matrices, no dependencies
 * - AuxiliaryProjectionPlane: User-created, matrices computed via realize3D() from traces
 * 
 * Realization Pattern (like Point3DFromProjections, Plane3DFromTraces):
 * - Constructor stores trace IDs (dependencies), NOT matrices
 * - realize3D() computes matrices on demand from current trace positions using computeProjectionPlaneMatrices()
 * - Matrices recalculate automatically when traces move (parametric behavior)
 * - Returns ProjectionPlaneRealization3D (SAME TYPE as BaseProjectionPlane)
 * 
 * The transformation is computed through geometric unfolding:
 * 1. Determine 3D plane Q from T1 and T2 traces (using Plane3DFromTraces)
 * 2. Compute coordinate system: origin, U-axis (from T1), V-axis (from T2' orientation)
 * 3. Build transformation matrices via computeProjectionPlaneMatrices()
 */
export class AuxiliaryProjectionPlane extends ProjectionPlane {
  readonly type: ProjectionPlaneType = 'auxiliary';

  // Dependencies for computing transformation (the RULE)
  readonly t1HingeTraceId: string;      // Trace line used as hinge (T1)
  readonly t2OtherTraceId: string;      // Other trace line on different plane (T2)
  readonly t2PrimeLineId: string;       // Position/orientation line on same plane as T1 (T2')

  constructor(
    name: string,
    t1HingeTraceId: string,
    t2OtherTraceId: string,
    t2PrimeLineId: string,
    isActive: boolean = false,
    isVisible: boolean = true,
    color: string = '#000000',
    plane3DId?: string
  ) {
    super(name, isActive, isVisible, color, plane3DId);
    this.t1HingeTraceId = t1HingeTraceId;
    this.t2OtherTraceId = t2OtherTraceId;
    this.t2PrimeLineId = t2PrimeLineId;
  }

  clone(): AuxiliaryProjectionPlane {
    const cloned = new AuxiliaryProjectionPlane(
      this.name,
      this.t1HingeTraceId,
      this.t2OtherTraceId,
      this.t2PrimeLineId,
      this.isActive,
      this.isVisible,
      this.color,
      this.plane3DId
    );
    if (this.id) {
      cloned.id = this.id;
    }
    return cloned;
  }

  /**
   * Get dependencies - returns IDs of trace lines this plane depends on
   * Used for invalidation tracking when traces move
   */
  getDependencies(): string[] {
    return [this.t1HingeTraceId, this.t2OtherTraceId, this.t2PrimeLineId];
  }

  /**
   * Calculate the 3D transformation realization for this auxiliary plane
   * Computes transformation matrices from trace dependencies using computeProjectionPlaneMatrices().
   * 
   * @param world - World instance for element lookup
   * @returns ProjectionPlaneRealization3D with computed transformation matrices
   */
  realize3D(world: any): ProjectionPlaneRealization3D {
    if (!this.id) {
      throw new Error('Cannot create realization for plane without ID');
    }
    
    console.log('[AuxiliaryProjectionPlane.realize3D] Starting realization for', this.id);
    console.log('[AuxiliaryProjectionPlane.realize3D] t1HingeTraceId:', this.t1HingeTraceId);
    console.log('[AuxiliaryProjectionPlane.realize3D] t2OtherTraceId:', this.t2OtherTraceId);
    console.log('[AuxiliaryProjectionPlane.realize3D] t2PrimeLineId:', this.t2PrimeLineId);
    
    try {
      // Compute transformation matrices from trace dependencies
      const matrices = computeProjectionPlaneMatrices(
        this.t1HingeTraceId,
        this.t2OtherTraceId,
        this.t2PrimeLineId,
        world
      );
      
      if (!matrices) {
        // Trace lines are not feasible - return infeasible realization
        console.log('[AuxiliaryProjectionPlane.realize3D] Cannot compute matrices - traces not feasible');
        return new ProjectionPlaneRealization3D(
          this.id,
          new Matrix4x3(),
          new Matrix3x4(),
          false
        );
      }
      
      console.log('[AuxiliaryProjectionPlane.realize3D] Successfully computed matrices for', this.id);
      
      return new ProjectionPlaneRealization3D(
        this.id,
        matrices.planeTo3D,
        matrices.threeDToPlane,
        true
      );
      
    } catch (error) {
      console.error('[AuxiliaryProjectionPlane] Failed to compute realization:', error);
      // Return infeasible realization with fallback identity matrices
      return new ProjectionPlaneRealization3D(
        this.id,
        new Matrix4x3(),
        new Matrix3x4(),
        false
      );
    }
  }

  /**
   * Calculate the 2D realization (transformation matrices) for this auxiliary plane
   * Unlike base planes, this requires World context to resolve trace dependencies.
   * 
   * @param world - World instance for element lookup
   * @returns ProjectionPlaneRealization2D with computed transformation matrices
   */
  realize2D(world: any): ProjectionPlaneRealization2D {
    if (!this.id) {
      throw new Error('Cannot create realization for plane without ID');
    }
    
    try {
      // Compute transformation matrices
      const matrices = computeProjectionPlaneMatrices(
        this.t1HingeTraceId,
        this.t2OtherTraceId,
        this.t2PrimeLineId,
        world
      );
      
      if (!matrices) {
        // Trace lines are not feasible - return infeasible realization
        console.log('[AuxiliaryProjectionPlane.realize2D] Cannot compute matrices - traces not feasible');
        const identityMatrix = new Matrix3();
        identityMatrix.identity();
        return new ProjectionPlaneRealization2D(
          this.id,
          identityMatrix,
          identityMatrix.clone(),
          false
        );
      }
      
      // Use shared helper to compute backward matrix with determinant check
      const { paperToPlane, feasible } = this.computeBackward2DMatrix(matrices.planeToPaper);
      
      return new ProjectionPlaneRealization2D(
        this.id,
        matrices.planeToPaper,
        paperToPlane,
        feasible
      );
      
    } catch (error) {
      console.error('[AuxiliaryProjectionPlane] Failed to compute 2D realization:', error);
      // Return fallback identity matrices
      const identityMatrix = new Matrix3();
      identityMatrix.identity();
      return new ProjectionPlaneRealization2D(
        this.id,
        identityMatrix,
        identityMatrix.clone(),
        false
      );
    }
  }
}

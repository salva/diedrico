/**
 * ProjectionPlane - 2D surface where 2D elements exist
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
import type { Point2D, Point2DRealization2D } from './Point';
import { 
  FreePoint2D,
  IntersectionPoint2D,
  Point2DLineLineIntersection,
  Point2DLineCircleIntersection,
  Point2DCircleCircleIntersection
} from './Point';
import type { Line2D, Line2DRealization2D } from './Line';
import { Line2DByTwoPoints } from './Line';
import type { Circle2D, Circle2DRealization2D } from './Circle';
import { Circle2DByCenterAndPoint } from './Circle';
import { Segment2DByPoints } from './Segment';
import { Guide2D, SiblingGuide2D } from './Guide';

export type ProjectionPlaneType = 'base' | 'auxiliary';

/**
 * ProjectionPlaneRealization2D - Stores computed 2D transformation matrices for a ProjectionPlane
 * This is the cache of evaluated 2D plane transformations for paper/canvas rendering.
 */
export class ProjectionPlaneRealization2D {
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
    paperToPlane2D: Matrix3
  ) {
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
      this.paperToPlane2D.clone()
    );
  }
}

/**
 * ProjectionPlaneRealization3D - Stores computed 3D transformation matrices for a ProjectionPlane
 * This is the cache of evaluated 3D plane transformation for Three.js rendering.
 * Uses Matrix4x3 for dimension-changing transforms (2D homogeneous → 3D homogeneous).
 */
export class ProjectionPlaneRealization3D {
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
    threeDToPlane: Matrix3x4
  ) {
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
      this.threeDToPlane.clone()
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
  addPoint(point: Point2D): void {
    if (!point.id) {
      throw new Error('Cannot add point without ID');
    }
    this.points.set(point.id, point);
  }

  /**
   * Get a point by ID
   */
  getPoint(id: string): Point2D | undefined {
    return this.points.get(id);
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
  removePoint(id: string): boolean {
    this.pointRealizations.delete(id);  // Clear cached realization
    return this.points.delete(id);
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
  addLine(line: Line2D): void {
    if (!line.id) {
      throw new Error('Cannot add line without ID');
    }
    this.lines.set(line.id, line);
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
  removeLine(id: string): boolean {
    this.lineRealizations.delete(id);  // Clear cached realization
    return this.lines.delete(id);
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
  addCircle(circle: Circle2D): void {
    if (!circle.id) {
      throw new Error('Cannot add circle without ID');
    }
    this.circles.set(circle.id, circle);
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
  removeCircle(id: string): boolean {
    this.circleRealizations.delete(id);  // Clear cached realization
    return this.circles.delete(id);
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
    id?: string
  ): FreePoint2D {
    if (!this.id) {
      throw new Error('Cannot add point to plane without ID');
    }

    // Generate unique ID if not provided
    if (!id) {
      id = this.generatePoint2DId(world);
    }

    const point = new FreePoint2D(id, position, this.id);
    
    this.addPoint(point);
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
    const line1 = l1?.realize2D(world);
    const line2 = l2?.realize2D(world);
    
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
    
    this.addPoint(point);
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
    const line = lineElement?.realize2D(world);
    const circle = circleElement?.realize2D(world);
    
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
    
    this.addPoint(point);
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
    const circle1 = circle1Element?.realize2D(world);
    const circle2 = circle2Element?.realize2D(world);
    
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
    
    this.addPoint(point);
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
    const point1Realization = point1?.realize2D(world);
    const point2Realization = point2?.realize2D(world);
    
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
    
    this.addLine(line);
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
    
    this.addLine(segment);  // Segments are stored as lines
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
    
    this.addCircle(circle);
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
    const referenceLine = refLineElement?.realize2D(world);
    if (!referenceLine) {
      throw new Error(`Invalid referenceLineId: ${referenceLineId}. Line does not exist.`);
    }

    // Generate unique ID if not provided
    if (!id) {
      id = this.generateGuide2DId(world);
    }

    const guide = new Guide2D(id, referenceLineId, throughPointId, this.id);
    
    this.addLine(guide);  // Guides are stored as lines
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
    const referenceLine = refLineElement?.realize2D(world);
    if (!referenceLine) {
      throw new Error(`Invalid referenceLineId: ${referenceLineId}. Line does not exist.`);
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
    
    this.addLine(siblingGuide);  // Sibling guides are stored as lines
    return siblingGuide;
  }

  /**
   * Clone this plane
   */
  abstract clone(): ProjectionPlane;

  /**
   * Calculate the 2D realization (transformation matrices) for this projection plane
   * For base planes: returns predetermined transforms
   * For auxiliary planes: computes from trace/hinge geometry
   */
  abstract realize2D(): ProjectionPlaneRealization2D;

  /**
   * Calculate the 3D realization (transformation matrix) for this projection plane
   * Transforms plane intrinsic coordinates to 3D space coordinates
   */
  abstract realize3D(): ProjectionPlaneRealization3D;
}

/**
 * BaseProjectionPlane - For P_H and P_V with predetermined transformations
 * 
 * The rule is: "this is P_H" or "this is P_V"
 * These planes have fixed positions in paper coordinate system.
 * Their transformation matrices are predetermined constants stored in the object.
 */
export class BaseProjectionPlane extends ProjectionPlane {
  readonly type: 'base' = 'base';
  
  // Predetermined transformation matrices (part of the plane definition)
  private readonly planeToPaper2D: Matrix3;
  private readonly paperToPlane2D: Matrix3;
  private readonly planeTo3D: Matrix4x3;
  private readonly threeDToPlane: Matrix3x4;

  constructor(
    name: string,
    planeToPaper2D: Matrix3,
    paperToPlane2D: Matrix3,
    planeTo3D: Matrix4x3,
    threeDToPlane: Matrix3x4,
    isActive: boolean = false,
    isVisible: boolean = true,
    color: string = '#000000',
    plane3DId?: string
  ) {
    super(name, isActive, isVisible, color, plane3DId);
    this.planeToPaper2D = planeToPaper2D;
    this.paperToPlane2D = paperToPlane2D;
    this.planeTo3D = planeTo3D;
    this.threeDToPlane = threeDToPlane;
  }

  clone(): BaseProjectionPlane {
    const cloned = new BaseProjectionPlane(
      this.name,
      this.planeToPaper2D.clone(),
      this.paperToPlane2D.clone(),
      this.planeTo3D.clone(),
      this.threeDToPlane.clone(),
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
   * Create P_H (horizontal projection plane)
   * Fixed position: horizontal plane at z=0
   */
  static createPH(): BaseProjectionPlane {
    // P_H: Horizontal projection plane at z=0
    // Transform: x' = u + 800, y' = -v + 500 (flip v so P_H content goes upward)
    // HL_HV at v=0 → y' = 500 (shared hinge line at canvas middle)
    // Positive v (away from HL) → y' < 500 (above the hinge line on screen)
    // Matrix3.set() uses ROW-MAJOR: set(n11, n12, n13, n21, n22, n23, n31, n32, n33)
    // Matrix layout:
    // [n11  n12  n13]   [ 1   0  800]
    // [n21  n22  n23] = [ 0  -1  500]
    // [n31  n32  n33]   [ 0   0    1]
    const planeToPaper = new Matrix3().set(
      1, 0, 800,     // Row 1: x' = 1*u + 0*v + 800*1 (center horizontally)
      0, -1, 500,    // Row 2: y' = 0*u + (-1)*v + 500*1 (flip and center, P_H above HL)
      0, 0, 1        // Row 3: w' = 0*u + 0*v + 1*1
    );
    
    // Compute inverse - standard matrix inversion works for any transform
    const paperToPlane = planeToPaper.clone().invert();
    
    // 3D transformation: (u,v,1) → (x,y,z,w) using Matrix4x3
    // Forward: Plane to 3D
    // [x]   [1  0  0]   [u]
    // [y] = [0  1  0] × [v]
    // [z]   [0  0  0]   [1]
    // [w]   [0  0  1]
    const planeTo3D = new Matrix4x3().set(
      1, 0, 0,  // Row 1: x = u
      0, 1, 0,  // Row 2: y = v
      0, 0, 0,  // Row 3: z = 0 (horizontal plane at z=0)
      0, 0, 1   // Row 4: w = 1 (homogeneous)
    );
    
    // Inverse: 3D to Plane
    // [u]   [1  0  0  0]   [x]
    // [v] = [0  1  0  0] × [y]
    // [1]   [0  0  0  1]   [z]
    //                      [w]
    const threeDToPlane = new Matrix3x4().set(
      1, 0, 0, 0,  // Row 1: u = x
      0, 1, 0, 0,  // Row 2: v = y (project z component away)
      0, 0, 0, 1   // Row 3: 1 = w (homogeneous)
    );
    
    return new BaseProjectionPlane(
      'P_H',
      planeToPaper,
      paperToPlane,
      planeTo3D,
      threeDToPlane,
      true,   // Active by default
      true,   // Visible
      '#2196F3',  // Blue
      undefined
    );
  }

  /**
   * Create P_V (vertical projection plane)
   * Fixed position: vertical plane at y=0
   */
  static createPV(): BaseProjectionPlane {
    // P_V: Vertical projection plane at y=0
    // Transform: x' = u + 800, y' = v + 500
    // HL_HV at y=200 in plane → y' = 200 + 500 = 700 (lower third of 1000px canvas)
    // Center at y=0 in plane → y' = 500 (middle of canvas)
    // Matrix3.set() uses ROW-MAJOR: set(n11, n12, n13, n21, n22, n23, n31, n32, n33)
    // Matrix layout:
    // [n11  n12  n13]   [1  0  800]
    // [n21  n22  n23] = [0  1  500]
    // [n31  n32  n33]   [0  0    1]
    const planeToPaper = new Matrix3().set(
      1, 0, 800,     // Row 1: x' = 1*u + 0*v + 800*1 (center horizontally)
      0, 1, 500,     // Row 2: y' = 0*u + 1*v + 500*1 (center vertically)
      0, 0, 1        // Row 3: w' = 0*u + 0*v + 1*1
    );
    
    // Compute inverse - standard matrix inversion works for any transform
    const paperToPlane = planeToPaper.clone().invert();
    
    // 3D transformation: (u,v,1) → (x,y,z,w) using Matrix4x3
    // Forward: Plane to 3D
    // [x]   [1  0  0]   [u]
    // [y] = [0  0  0] × [v]
    // [z]   [0  1  0]   [1]
    // [w]   [0  0  1]
    const planeTo3D = new Matrix4x3().set(
      1, 0, 0,  // Row 1: x = u
      0, 0, 0,  // Row 2: y = 0 (vertical plane at y=0)
      0, 1, 0,  // Row 3: z = v
      0, 0, 1   // Row 4: w = 1 (homogeneous)
    );
    
    // Inverse: 3D to Plane
    // [u]   [1  0  0  0]   [x]
    // [v] = [0  0  1  0] × [y]
    // [1]   [0  0  0  1]   [z]
    //                      [w]
    const threeDToPlane = new Matrix3x4().set(
      1, 0, 0, 0,  // Row 1: u = x
      0, 0, 1, 0,  // Row 2: v = z (project y component away)
      0, 0, 0, 1   // Row 3: 1 = w (homogeneous)
    );
    
    return new BaseProjectionPlane(
      'P_V',
      planeToPaper,
      paperToPlane,
      planeTo3D,
      threeDToPlane,
      false,  // Not active by default
      true,   // Visible
      '#4CAF50',  // Green
      undefined
    );
  }
  
  /**
   * Calculate the 2D transformation realization for this base plane
   * Returns the predetermined transformation matrices as a realization object.
   */
  realize2D(): ProjectionPlaneRealization2D {
    if (!this.id) {
      throw new Error('Cannot create realization for plane without ID');
    }
    return new ProjectionPlaneRealization2D(
      this.id,
      this.planeToPaper2D.clone(),
      this.paperToPlane2D.clone()
    );
  }

  /**
   * Calculate the 3D transformation realization for this base plane
   * Returns the predetermined transformation matrices (forward and inverse) as a realization object.
   */
  realize3D(): ProjectionPlaneRealization3D {
    if (!this.id) {
      throw new Error('Cannot create realization for plane without ID');
    }
    return new ProjectionPlaneRealization3D(
      this.id,
      this.planeTo3D.clone(),
      this.threeDToPlane.clone()
    );
  }
}

/**
 * AuxiliaryProjectionPlane - For extra projection planes with dynamic transformations
 * 
 * The rule is: "plane defined by dependencies (hinge line + supporting 3D plane)"
 * These planes compute their transformations from geometric dependencies:
 * - The trace used as hinge line (traceH or traceV)
 * - The supporting 3D plane definition
 * 
 * The transformation is computed through geometric unfolding:
 * 1. Identify traces on P_H and P_V
 * 2. User selects which trace to use as hinge
 * 3. 180° rotation around hinge, away from origin
 * 4. Coordinate system: u along hinge, v perpendicular outward
 * 
 * Transformations are computed and cached in ProjectionPlaneRealization2D/ProjectionPlaneRealization3D, not stored here.
 */
export class AuxiliaryProjectionPlane extends ProjectionPlane {
  readonly type: 'auxiliary' = 'auxiliary';
  
  // Dependencies for computing transformation (the RULE)
  hingeLineId: string;     // ID of the trace line used as hinge (on P_H or P_V)
  hingeOnPlaneId: string;  // ID of base plane where hinge lies ('P_H' or 'P_V')

  constructor(
    name: string,
    hingeLineId: string,
    hingeOnPlaneId: string,
    isActive: boolean = false,
    isVisible: boolean = true,
    color: string = '#000000',
    plane3DId?: string
  ) {
    super(name, isActive, isVisible, color, plane3DId);
    this.hingeLineId = hingeLineId;
    this.hingeOnPlaneId = hingeOnPlaneId;
  }

  clone(): AuxiliaryProjectionPlane {
    const cloned = new AuxiliaryProjectionPlane(
      this.name,
      this.hingeLineId,
      this.hingeOnPlaneId,
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
   * Calculate the 2D transformation realization for this auxiliary plane
   * Computes transformation matrices from hinge line and supporting 3D plane geometry.
   * 
   * TODO: Implement geometric computation:
   * 1. Get hinge line realization from context
   * 2. Compute 180° rotation around hinge
   * 3. Build coordinate system (u along hinge, v perpendicular)
   * 4. Generate planeToPaper and paperToPlane matrices
   */
  realize2D(): ProjectionPlaneRealization2D {
    if (!this.id) {
      throw new Error('Cannot create realization for plane without ID');
    }
    
    // TODO: Implement computation from hingeLineId and hingeOnPlaneId
    // For now, throw error since auxiliary planes are not yet supported
    throw new Error('Auxiliary projection plane realization not yet implemented');
  }

  /**
   * Calculate the 3D transformation realization for this auxiliary plane
   * Computes transformation matrix from hinge line and supporting 3D plane geometry.
   */
  realize3D(): ProjectionPlaneRealization3D {
    if (!this.id) {
      throw new Error('Cannot create realization for plane without ID');
    }
    
    // TODO: Implement computation from hingeLineId and hingeOnPlaneId
    // For now, throw error since auxiliary planes are not yet supported
    throw new Error('Auxiliary projection plane 3D realization not yet implemented');
  }
}

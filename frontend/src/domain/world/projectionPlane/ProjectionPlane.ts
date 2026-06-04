import { Matrix3, Vector3 } from 'three';
import { Matrix4x3, Matrix3x4 } from '@/utils/threeUtils';
import { buildElementId } from '../ElementId';
import { Element } from '../Element';
import type { Point2D, Point2DRealization2D } from '../Point';
import { FreePoint2D, Point2DLineLineIntersection, Point2DLineCircleIntersection, Point2DCircleCircleIntersection, SiblingIntersectionPoint2D } from '../Point';
import type { Line2D, Line2DRealization2D } from '../Line';
import { Line2DByTwoPoints, Line2DParallel, Line2DPerpendicularToLine, Line2DTangentToCircleThroughPoint, Line2DTangentToCircleParallelToLine } from '../Line';
import type { Circle2D, Circle2DRealization2D } from '../Circle';
import { Circle2DByCenterAndPoint } from '../Circle';
import { Segment2DByPoints } from '../Segment';
import { Guide2D, SiblingGuide2D } from '../Guide';
import { HalfHingeLine2D } from '../HingeLine';
import { ProjectionPlaneElementStore } from './ProjectionPlaneElementStore';
import type { ProjectionElementRealizationContext, ProjectionPlaneMutationContext, ProjectionPlaneRealizationContext } from './ProjectionPlaneContext';
import { ProjectionPlaneRealization2D, ProjectionPlaneRealization3D } from './ProjectionPlaneRealization';

export const PROJECTION_PLANE_TYPE = {
  BASE: 'base',
  AUXILIARY: 'auxiliary',
} as const;
export type ProjectionPlaneType = typeof PROJECTION_PLANE_TYPE[keyof typeof PROJECTION_PLANE_TYPE];

export abstract class ProjectionPlane extends Element {
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

  private readonly elementStore: ProjectionPlaneElementStore;

  constructor(
    id: string,
    name: string,
    isActive: boolean = false,
    isVisible: boolean = true,
    color: string = '#000000',
    plane3DId?: string
  ) {
    super(id, name);
    this.name = name;
    this.isActive = isActive;
    this.isVisible = isVisible;
    this.color = color;
    this.plane3DId = plane3DId;
    this.elementStore = new ProjectionPlaneElementStore();
  }

  /**
   * Clear all elements and realizations from this plane
   * Used when loading projects or resetting the world
   */
  clear(): void {
    this.elementStore.clear();
  }

  // ==================== Point Methods ====================

  /**
   * Add a point to this plane
   */
  addPoint(point: Point2D, context?: ProjectionPlaneMutationContext): void {
    this.elementStore.addPoint(point, context);
  }

  /**
   * Get a point by ID
   */
  getPoint(id: string): Point2D | undefined {
    return this.elementStore.getPoint(id);
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
    for (const point of this.elementStore.getAllPoints()) {
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
    return this.elementStore.getAllPoints();
  }

  /**
   * Remove a point from this plane
   */
  removePoint(id: string, context?: ProjectionPlaneMutationContext): boolean {
    return this.elementStore.removePoint(id, context);
  }

  /**
   * Get point realization (cached 2D position)
   * Phase 22.5: Consistent naming - all 2D realization methods end with "2D"
   */
  getPointRealization2D(id: string): Point2DRealization2D | undefined {
    return this.elementStore.getPointRealization2D(id);
  }

  /**
   * Set/cache point realization
   */
  setPointRealization2D(id: string, realization: Point2DRealization2D): void {
    this.elementStore.setPointRealization2D(id, realization);
  }

  /**
   * Clear point realization cache
   */
  clearPointRealization2D(id: string): void {
    this.elementStore.clearPointRealization2D(id);
  }

  // ==================== Line Methods ====================

  /**
   * Add a line to this plane
   */
  addLine(line: Line2D, context?: ProjectionPlaneMutationContext): void {
    this.elementStore.addLine(line, context);
  }

  /**
   * Get a line by ID
   */
  getLine(id: string): Line2D | undefined {
    return this.elementStore.getLine(id);
  }

  /**
   * Get all lines on this plane
   */
  getAllLines(): Line2D[] {
    return this.elementStore.getAllLines();
  }

  /**
   * Remove a line from this plane
   */
  removeLine(id: string, context?: ProjectionPlaneMutationContext): boolean {
    return this.elementStore.removeLine(id, context);
  }

  /**
   * Get line realization (cached 2D equation)
   * Phase 22.5: Consistent naming - all 2D realization methods end with "2D"
   * Note: This includes segments, guides, and all Line2D subtypes
   */
  getLineRealization2D(id: string): Line2DRealization2D | undefined {
    return this.elementStore.getLineRealization2D(id);
  }

  /**
   * Set/cache line realization
   */
  setLineRealization2D(id: string, realization: Line2DRealization2D): void {
    this.elementStore.setLineRealization2D(id, realization);
  }

  /**
   * Clear line realization cache
   */
  clearLineRealization2D(id: string): void {
    this.elementStore.clearLineRealization2D(id);
  }

  // ==================== Circle Methods ====================

  /**
   * Add a circle to this plane
   */
  addCircle(circle: Circle2D, context?: ProjectionPlaneMutationContext): void {
    this.elementStore.addCircle(circle, context);
  }

  /**
   * Get a circle by ID
   */
  getCircle(id: string): Circle2D | undefined {
    return this.elementStore.getCircle(id);
  }

  /**
   * Get all circles on this plane
   */
  getAllCircles(): Circle2D[] {
    return this.elementStore.getAllCircles();
  }

  /**
   * Remove a circle from this plane
   */
  removeCircle(id: string, context?: ProjectionPlaneMutationContext): boolean {
    return this.elementStore.removeCircle(id, context);
  }

  /**
   * Get circle realization (cached 2D geometry)
   * Phase 22.5: Consistent naming - all 2D realization methods end with "2D"
   */
  getCircleRealization2D(id: string): Circle2DRealization2D | undefined {
    return this.elementStore.getCircleRealization2D(id);
  }

  /**
   * Set/cache circle realization
   */
  setCircleRealization2D(id: string, realization: Circle2DRealization2D): void {
    this.elementStore.setCircleRealization2D(id, realization);
  }

  /**
   * Clear circle realization cache
   */
  clearCircleRealization2D(id: string): void {
    this.elementStore.clearCircleRealization2D(id);
  }

  clearRealizationCaches(id: string): void {
    this.elementStore.clearRealizationCaches(id);
  }

  // ==================== Realization Computation Methods ====================
  // Phase 22.5: Realization computation moved from World to ProjectionPlane
  // These methods compute realizations and manage the plane-level cache

  /**
   * Compute and cache 2D realization for a point
   * @param point Point to realize
   * @param context Typed realization context for querying dependencies
   * @returns Point2DRealization2D if computation succeeds, undefined otherwise
   */
  realizePoint2D(point: Point2D, context: ProjectionElementRealizationContext): Point2DRealization2D | undefined {
    // Check cache first
    const cached = this.elementStore.getPointRealization2D(point.id);
    if (cached) {
      return cached;
    }

    // Compute realization - point will query context for parent element realizations
    const realization = point.realize2D(context);
    if (!realization) {
      return undefined;  // Cannot compute (e.g., missing dependencies)
    }

    // Cache the result
    this.elementStore.setPointRealization2D(point.id, realization);
    return realization;
  }

  /**
   * Compute and cache 2D realization for a line
   * @param line Line to realize (includes segments, guides, hinge lines - all Line2D subtypes)
   * @param context Typed realization context for querying dependencies
   * @returns Line2DRealization2D if computation succeeds, undefined otherwise
   */
  realizeLine2D(line: Line2D, context: ProjectionElementRealizationContext): Line2DRealization2D | undefined {
    // Check cache first
    const cached = this.elementStore.getLineRealization2D(line.id);
    if (cached) {
      return cached;
    }

    // Compute realization - line will query context for parent point realizations
    const realization = line.realize2D(context);
    if (!realization) {
      return undefined;  // Cannot compute (e.g., missing dependency points)
    }

    // Cache the result
    this.elementStore.setLineRealization2D(line.id, realization);
    return realization;
  }

  /**
   * Compute and cache 2D realization for a circle
   * @param circle Circle to realize
   * @param context Typed realization context for querying dependencies
   * @returns Circle2DRealization2D if computation succeeds, undefined otherwise
   */
  realizeCircle2D(circle: Circle2D, context: ProjectionElementRealizationContext): Circle2DRealization2D | undefined {
    // Check cache first
    const cached = this.elementStore.getCircleRealization2D(circle.id);
    if (cached) {
      return cached;
    }

    // Compute realization - circle will query context for parent element realizations
    const realization = circle.realize2D(context);
    if (!realization) {
      return undefined;  // Cannot compute (e.g., missing dependencies)
    }

    // Cache the result
    this.elementStore.setCircleRealization2D(circle.id, realization);
    return realization;
  }

  // ==================== Factory Methods ====================
  // Phase 22.5: Factory methods moved from World to ProjectionPlane
  // These methods create and add 2D elements to this plane

  /**
   * Phase 95: Generate unique Point2D ID (camelCase format)
   */
  generatePoint2DId(world: ProjectionPlaneMutationContext): string {
    const localId = `point2d${world.getNextId()}`;
    return buildElementId(this.id, localId);
  }

  /**
   * Phase 95: Generate unique Line2D ID (camelCase format)
   */
  generateLine2DId(world: ProjectionPlaneMutationContext): string {
    const localId = `line2d${world.getNextId()}`;
    return buildElementId(this.id, localId);
  }

  /**
   * Phase 95: Generate unique Segment2D ID (camelCase format)
   */
  generateSegment2DId(world: ProjectionPlaneMutationContext): string {
    const localId = `segment2d${world.getNextId()}`;
    return buildElementId(this.id, localId);
  }

  /**
   * Phase 95: Generate unique Circle2D ID (camelCase format)
   */
  generateCircle2DId(world: ProjectionPlaneMutationContext): string {
    const localId = `circle2d${world.getNextId()}`;
    return buildElementId(this.id, localId);
  }

  /**
   * Phase 95: Generate unique Guide2D ID (camelCase format)
   */
  generateGuide2DId(world: ProjectionPlaneMutationContext): string {
    const localId = `guide2d${world.getNextId()}`;
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
    world: ProjectionPlaneMutationContext,
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

    // Phase 97: Generate default label if not provided
    if (!label) {
      label = world.generateDefaultLabel(id, 'Point2D');
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
    world: ProjectionPlaneMutationContext,
    id?: string
  ): Point2DLineLineIntersection {
    if (!this.id) {
      throw new Error('Cannot add point to plane without ID');
    }

    // Validate lines exist
    const l1 = this.getLine(line1Id) || world.getLine2D(line1Id);
    const l2 = this.getLine(line2Id) || world.getLine2D(line2Id);
    if (!l1) {
      throw new Error(`Invalid line1Id: ${line1Id}. Line does not exist.`);
    }
    if (!l2) {
      throw new Error(`Invalid line2Id: ${line2Id}. Line does not exist.`);
    }
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

    // Phase 97: Generate default label if not provided
    const label = world.generateDefaultLabel(id, 'Point2D');

    const point = new Point2DLineLineIntersection(id, line1Id, line2Id, this.id, label);
    
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
    world: ProjectionPlaneMutationContext,
    id?: string
  ): Point2DLineCircleIntersection {
    if (!this.id) {
      throw new Error('Cannot add point to plane without ID');
    }

    // Validate elements exist
    const lineElement = this.getLine(lineId);
    const circleElement = this.getCircle(circleId);
    if (!lineElement) {
      throw new Error(`Invalid lineId: ${lineId}. Line does not exist.`);
    }
    if (!circleElement) {
      throw new Error(`Invalid circleId: ${circleId}. Circle does not exist.`);
    }
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

    // Phase 97: Generate default label if not provided
    const label = world.generateDefaultLabel(id, 'Point2D');

    const point = new Point2DLineCircleIntersection(id, lineId, circleId, index, this.id, label);
    
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
    world: ProjectionPlaneMutationContext,
    id?: string
  ): Point2DCircleCircleIntersection {
    if (!this.id) {
      throw new Error('Cannot add point to plane without ID');
    }

    // Validate circles exist
    const circle1Element = this.getCircle(circle1Id);
    const circle2Element = this.getCircle(circle2Id);
    if (!circle1Element) {
      throw new Error(`Invalid circle1Id: ${circle1Id}. Circle does not exist.`);
    }
    if (!circle2Element) {
      throw new Error(`Invalid circle2Id: ${circle2Id}. Circle does not exist.`);
    }
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

    // Phase 97: Generate default label if not provided
    const label = world.generateDefaultLabel(id, 'Point2D');

    const point = new Point2DCircleCircleIntersection(id, circle1Id, circle2Id, index, this.id, label);
    
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
    world: ProjectionPlaneMutationContext,
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

    // Phase 97: Generate default label if not provided
    const label = world.generateDefaultLabel(id, 'Line2D');

    const line = new Line2DByTwoPoints(id, point1Id, point2Id, this.id, label);
    
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
    world: ProjectionPlaneMutationContext,
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
    if (!refLineElement) {
      throw new Error(`Invalid referenceLineId: ${referenceLineId}. Line does not exist.`);
    }
    const referenceLine = refLineElement.realize2D(world);
    if (!referenceLine) {
      throw new Error(`Invalid referenceLineId: ${referenceLineId}. Line does not exist.`);
    }

    // Generate unique ID if not provided
    if (!id) {
      id = this.generateLine2DId(world);
    }

    // Phase 97: Generate default label if not provided
    const label = world.generateDefaultLabel(id, 'Line2D');

    const line = new Line2DParallel(id, referenceLineId, throughPointId, this.id, label);
    
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
    world: ProjectionPlaneMutationContext,
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
    if (!refLineElement) {
      throw new Error(`Invalid referenceLineId: ${referenceLineId}. Line does not exist.`);
    }
    const referenceLine = refLineElement.realize2D(world);
    if (!referenceLine) {
      throw new Error(`Invalid referenceLineId: ${referenceLineId}. Line does not exist.`);
    }

    // Generate unique ID if not provided
    if (!id) {
      id = this.generateLine2DId(world);
    }

    // Phase 97: Generate default label if not provided
    const label = world.generateDefaultLabel(id, 'Line2D');

    const line = new Line2DPerpendicularToLine(id, referenceLineId, throughPointId, this.id, label);
    
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
    world: ProjectionPlaneMutationContext,
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

    // Phase 97: Generate default label if not provided
    const label = world.generateDefaultLabel(id, 'Line2D');

    const line = new Line2DTangentToCircleThroughPoint(
      id,
      circleId,
      throughPointId,
      tangentIndex,
      this.id,
      label
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
    world: ProjectionPlaneMutationContext,
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
    if (!refLineElement) {
      throw new Error(`Invalid referenceLineId: ${referenceLineId}. Line does not exist.`);
    }
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

    // Phase 97: Generate default label if not provided
    const label = world.generateDefaultLabel(id, 'Line2D');

    const line = new Line2DTangentToCircleParallelToLine(
      id,
      circleId,
      referenceLineId,
      tangentIndex,
      this.id,
      label
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
    world: ProjectionPlaneMutationContext,
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

    // Phase 97: Generate default label if not provided
    const label = world.generateDefaultLabel(id, 'Segment2D');

    const segment = new Segment2DByPoints(id, point1Id, point2Id, this.id, label);
    
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
    world: ProjectionPlaneMutationContext,
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

    // Phase 97: Generate default label if not provided
    const label = world.generateDefaultLabel(id, 'Circle2D');

    const circle = new Circle2DByCenterAndPoint(id, centerPointId, circumferencePointId, this.id, label);
    
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
    world: ProjectionPlaneMutationContext,
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

    // Phase 97: Generate default label if not provided
    const label = world.generateDefaultLabel(id, 'Guide2D');

    const guide = new Guide2D(id, referenceLineId, throughPointId, this.id, label);
    
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
    world: ProjectionPlaneMutationContext,
    id?: string
  ): SiblingGuide2D {
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
    world: ProjectionPlaneMutationContext,
    id?: string
  ): SiblingIntersectionPoint2D {
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
    primaryPoint.siblingPointId = siblingPoint.id;
    
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
    world: ProjectionPlaneMutationContext,
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
    world: ProjectionPlaneMutationContext,
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
    // HalfHingeLine2D stores the authoritative parent hinge id; realization resolves it through the context.
    const halfHingeLine = new HalfHingeLine2D(
      id,
      hingeLine.id,
      this.id
    );

    // Phase 84: No parametric consistency validation needed - automatic with canonical coordinates
    
    // CRITICAL: Pass world to ensure dependency registration
    // HalfHingeLine2D depends on [hingeLineId, planeId] and must be tracked
    this.addLine(halfHingeLine, world);
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
   * @param context - Realization context for element lookup (auxiliary planes need this)
   */
  abstract realize2D(context: ProjectionPlaneRealizationContext): ProjectionPlaneRealization2D;

  /**
   * Calculate the 3D realization (transformation matrix) for this projection plane
   * Transforms plane intrinsic coordinates to 3D space coordinates
   * 
   * @param context - Realization context for element lookup (auxiliary planes need this)
   */
  abstract realize3D(context: ProjectionPlaneRealizationContext): ProjectionPlaneRealization3D;

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

  /**
   * Protected helper: Compute backward 3D matrix (threeDToPlane) from forward matrix (planeTo3D)
   * Extracts basis vectors from embedding matrix and constructs projection matrix.
   * Used by FixedProjectionPlane.realize3D().
   * 
   * @param planeTo3D - Forward embedding matrix (plane → 3D)
   * @returns Backward projection matrix (3D → plane)
   */
  protected computeBackward3DMatrix(planeTo3D: Matrix4x3): Matrix3x4 {
    // planeTo3D is stored ROW-MAJOR: [m11, m12, m13, m21, m22, m23, m31, m32, m33, m41, m42, m43]
    // Matrix layout (4 rows × 3 columns):
    //   [ m11  m12  m13 ]   Row 1: e[0], e[1], e[2]
    //   [ m21  m22  m23 ]   Row 2: e[3], e[4], e[5]
    //   [ m31  m32  m33 ]   Row 3: e[6], e[7], e[8]
    //   [ m41  m42  m43 ]   Row 4: e[9], e[10], e[11]
    //
    // Columns represent: [U-axis in 3D, V-axis in 3D, origin in 3D]
    // For ROW-MAJOR storage, column k elements are at indices: k, k+3, k+6, k+9
    //
    // Extract normalized basis vectors and origin
    const uAxis = new Vector3(
      planeTo3D.elements[0],   // m11 (column 1, row 1)
      planeTo3D.elements[3],   // m21 (column 1, row 2)
      planeTo3D.elements[6]    // m31 (column 1, row 3)
    ).normalize();
    
    const vAxis = new Vector3(
      planeTo3D.elements[1],   // m12 (column 2, row 1)
      planeTo3D.elements[4],   // m22 (column 2, row 2)
      planeTo3D.elements[7]    // m32 (column 2, row 3)
    ).normalize();
    
    const origin = new Vector3(
      planeTo3D.elements[2],   // m13 (column 3, row 1)
      planeTo3D.elements[5],   // m23 (column 3, row 2)
      planeTo3D.elements[8]    // m33 (column 3, row 3)
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
    
    return threeDToPlane;
  }
}

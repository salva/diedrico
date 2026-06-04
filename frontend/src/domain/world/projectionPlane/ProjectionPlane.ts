import { Vector3 } from 'three';
import { buildElementId } from '../ElementId';
import { Element } from '../Element';
import type { Point2D, Point2DRealization2D } from '../Point';
import { FreePoint2D, Point2DLineLineIntersection, Point2DLineCircleIntersection, Point2DCircleCircleIntersection, SiblingIntersectionPoint2D } from '../Point';
import type { Line2D, Line2DRealization2D } from '../Line';
import { Line2DByTwoPoints, Line2DParallel, Line2DPerpendicularToLine, Line2DTangentToCircleThroughPoint, Line2DTangentToCircleParallelToLine } from '../Line';
import type { Circle2D, Circle2DRealization2D } from '../Circle';
import { Circle2DByCenterAndPoint } from '../Circle';
import { Segment2D } from '../Segment';
import { Guide2D, SiblingGuide2D } from '../Guide';
import { HalfHingeLine2D } from '../HingeLine';
import { ProjectionPlaneElementStore } from './ProjectionPlaneElementStore';
import type { ProjectionElementRealizationContext, ProjectionPlaneMutationContext, ProjectionPlaneRealizationContext } from './ProjectionPlaneContext';
import {
  requireBinaryIndex,
  requireDistinctPointIds,
  requireDistinctRealizedPointsForLine,
  requireLocalCircle,
  requireLocalLine,
  requireLocalOrWorldLine,
  requireLocalPoint,
  requirePlaneId,
  requirePrimaryIntersectionPoint,
  requireRealizedCircle,
  requireRealizedLine,
  requireWorldLine,
  resolveDefaultLabel,
  resolveElementId,
} from './ProjectionPlaneElementCreation';
import { ProjectionPlaneRealization2D, ProjectionPlaneRealization3D } from './ProjectionPlaneRealization';
import {
  realizeCircle2DWithCache,
  realizeLine2DWithCache,
  realizePoint2DWithCache,
} from './ProjectionPlaneRealizationHelpers';

export const PROJECTION_PLANE_TYPE = {
  BASE: 'base',
  AUXILIARY: 'auxiliary',
} as const;
export type ProjectionPlaneType = typeof PROJECTION_PLANE_TYPE[keyof typeof PROJECTION_PLANE_TYPE];

export abstract class ProjectionPlane extends Element {
  abstract readonly type: ProjectionPlaneType;
  /**
   * Stable projection-plane identifier persisted by project command descriptors.
   * Element.label is currently initialized to the same value for generic element
   * display, but name remains the replayed plane identity used by lookup/sorting.
   */
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
    return realizePoint2DWithCache(point, context, this.elementStore);
  }

  /**
   * Compute and cache 2D realization for a line
   * @param line Line to realize (includes segments, guides, hinge lines - all Line2D subtypes)
   * @param context Typed realization context for querying dependencies
   * @returns Line2DRealization2D if computation succeeds, undefined otherwise
   */
  realizeLine2D(line: Line2D, context: ProjectionElementRealizationContext): Line2DRealization2D | undefined {
    return realizeLine2DWithCache(line, context, this.elementStore);
  }

  /**
   * Compute and cache 2D realization for a circle
   * @param circle Circle to realize
   * @param context Typed realization context for querying dependencies
   * @returns Circle2DRealization2D if computation succeeds, undefined otherwise
   */
  realizeCircle2D(circle: Circle2D, context: ProjectionElementRealizationContext): Circle2DRealization2D | undefined {
    return realizeCircle2DWithCache(circle, context, this.elementStore);
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
    const planeId = requirePlaneId(this.id, 'point');
    id = resolveElementId(id, () => this.generatePoint2DId(world));
    label = resolveDefaultLabel(label, id, 'Point2D', world);

    const point = new FreePoint2D(id, position, planeId, label);
    
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
    const planeId = requirePlaneId(this.id, 'point');
    const l1 = requireLocalOrWorldLine(this, world, line1Id, 'line1Id');
    const l2 = requireLocalOrWorldLine(this, world, line2Id, 'line2Id');
    requireRealizedLine(l1, line1Id, 'line1Id', world);
    requireRealizedLine(l2, line2Id, 'line2Id', world);

    id = resolveElementId(id, () => this.generatePoint2DId(world));
    const label = world.generateDefaultLabel(id, 'Point2D');

    const point = new Point2DLineLineIntersection(id, line1Id, line2Id, planeId, label);
    
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
    const planeId = requirePlaneId(this.id, 'point');
    const lineElement = requireLocalLine(this, lineId, 'lineId');
    const circleElement = requireLocalCircle(this, circleId, 'circleId', 'Circle does not exist.');
    requireRealizedLine(lineElement, lineId, 'lineId', world);
    requireRealizedCircle(circleElement, circleId, 'circleId', world);
    requireBinaryIndex(index, 'index');

    id = resolveElementId(id, () => this.generatePoint2DId(world));
    const label = world.generateDefaultLabel(id, 'Point2D');

    const point = new Point2DLineCircleIntersection(id, lineId, circleId, index, planeId, label);
    
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
    const planeId = requirePlaneId(this.id, 'point');
    const circle1Element = requireLocalCircle(this, circle1Id, 'circle1Id', 'Circle does not exist.');
    const circle2Element = requireLocalCircle(this, circle2Id, 'circle2Id', 'Circle does not exist.');
    requireRealizedCircle(circle1Element, circle1Id, 'circle1Id', world);
    requireRealizedCircle(circle2Element, circle2Id, 'circle2Id', world);
    requireBinaryIndex(index, 'index');

    id = resolveElementId(id, () => this.generatePoint2DId(world));
    const label = world.generateDefaultLabel(id, 'Point2D');

    const point = new Point2DCircleCircleIntersection(id, circle1Id, circle2Id, index, planeId, label);
    
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
    const planeId = requirePlaneId(this.id, 'line');
    const point1 = requireLocalPoint(this, point1Id, 'point1Id');
    const point2 = requireLocalPoint(this, point2Id, 'point2Id');
    requireDistinctPointIds(point1Id, point2Id, 'line');
    requireDistinctRealizedPointsForLine(point1, point2, point1Id, point2Id, world);

    id = resolveElementId(id, () => this.generateLine2DId(world));
    const label = world.generateDefaultLabel(id, 'Line2D');

    const line = new Line2DByTwoPoints(id, point1Id, point2Id, planeId, label);
    
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
    const planeId = requirePlaneId(this.id, 'line');
    requireLocalPoint(this, throughPointId, 'throughPointId');
    const refLineElement = requireWorldLine(world, referenceLineId, 'referenceLineId');
    requireRealizedLine(refLineElement, referenceLineId, 'referenceLineId', world);

    id = resolveElementId(id, () => this.generateLine2DId(world));
    const label = world.generateDefaultLabel(id, 'Line2D');

    const line = new Line2DParallel(id, referenceLineId, throughPointId, planeId, label);
    
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
    const planeId = requirePlaneId(this.id, 'line');
    requireLocalPoint(this, throughPointId, 'throughPointId');
    const refLineElement = requireWorldLine(world, referenceLineId, 'referenceLineId');
    requireRealizedLine(refLineElement, referenceLineId, 'referenceLineId', world);

    id = resolveElementId(id, () => this.generateLine2DId(world));
    const label = world.generateDefaultLabel(id, 'Line2D');

    const line = new Line2DPerpendicularToLine(id, referenceLineId, throughPointId, planeId, label);
    
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
    const planeId = requirePlaneId(this.id, 'line');
    requireLocalCircle(this, circleId, 'circleId');
    requireLocalPoint(this, throughPointId, 'throughPointId');
    requireBinaryIndex(tangentIndex, 'tangentIndex');

    id = resolveElementId(id, () => this.generateLine2DId(world));
    const label = world.generateDefaultLabel(id, 'Line2D');

    const line = new Line2DTangentToCircleThroughPoint(
      id,
      circleId,
      throughPointId,
      tangentIndex,
      planeId,
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
    const planeId = requirePlaneId(this.id, 'line');
    requireLocalCircle(this, circleId, 'circleId');
    const refLineElement = requireWorldLine(world, referenceLineId, 'referenceLineId');
    requireRealizedLine(refLineElement, referenceLineId, 'referenceLineId', world);
    requireBinaryIndex(tangentIndex, 'tangentIndex');

    id = resolveElementId(id, () => this.generateLine2DId(world));
    const label = world.generateDefaultLabel(id, 'Line2D');

    const line = new Line2DTangentToCircleParallelToLine(
      id,
      circleId,
      referenceLineId,
      tangentIndex,
      planeId,
      label
    );
    
    this.addLine(line, world);
    return line;
  }

  /**
   * Factory method: Create and add a Segment2D to this plane
   * 
   * @param point1Id ID of first endpoint
   * @param point2Id ID of second endpoint
   * @param world World context for validation and ID generation
   * @param id Optional ID - ONLY for redo operations. Tests and normal operations should
   *           omit this to get auto-generated IDs. See addFreePoint2D() for test pattern.
   * @returns The created Segment2D
   */
  addSegment2DBetweenPoints(
    point1Id: string,
    point2Id: string,
    world: ProjectionPlaneMutationContext,
    id?: string
  ): Segment2D {
    const planeId = requirePlaneId(this.id, 'segment');
    requireLocalPoint(this, point1Id, 'point1Id');
    requireLocalPoint(this, point2Id, 'point2Id');
    requireDistinctPointIds(point1Id, point2Id, 'segment');

    id = resolveElementId(id, () => this.generateSegment2DId(world));
    const label = world.generateDefaultLabel(id, 'Segment2D');

    const segment = new Segment2D(id, point1Id, point2Id, planeId, label);
    
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
    const planeId = requirePlaneId(this.id, 'circle');
    requireLocalPoint(this, centerPointId, 'centerPointId');
    requireLocalPoint(this, circumferencePointId, 'circumferencePointId');

    if (centerPointId === circumferencePointId) {
      throw new Error(`Cannot create circle with center and circumference point being the same point.`);
    }

    id = resolveElementId(id, () => this.generateCircle2DId(world));
    const label = world.generateDefaultLabel(id, 'Circle2D');

    const circle = new Circle2DByCenterAndPoint(id, centerPointId, circumferencePointId, planeId, label);
    
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
    const planeId = requirePlaneId(this.id, 'guide');
    requireLocalPoint(this, throughPointId, 'throughPointId');
    const refLineElement = requireWorldLine(world, referenceLineId, 'referenceLineId');
    requireRealizedLine(refLineElement, referenceLineId, 'referenceLineId', world, 'Line cannot be realized.');

    id = resolveElementId(id, () => this.generateGuide2DId(world));
    const label = world.generateDefaultLabel(id, 'Guide2D');

    const guide = new Guide2D(id, referenceLineId, throughPointId, planeId, label);
    
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
    const planeId = requirePlaneId(this.id, 'sibling guide');
    const refLineElement = requireWorldLine(world, referenceLineId, 'referenceLineId');
    requireRealizedLine(refLineElement, referenceLineId, 'referenceLineId', world, 'Line cannot be realized.');

    const primaryGuide = world.getLine2D(primaryGuideId);
    if (!primaryGuide) {
      throw new Error(`Invalid primaryGuideId: ${primaryGuideId}. Primary guide does not exist.`);
    }

    id = resolveElementId(id, () => this.generateGuide2DId(world));
    const label = primaryGuide.label;
    
    const siblingGuide = new SiblingGuide2D(
      id,
      referenceLineId,
      planeId,
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
    const planeId = requirePlaneId(this.id, 'sibling intersection point');
    const primaryPoint = requirePrimaryIntersectionPoint(primaryIntersectionId, world);

    // Validate primary is an intersection type using instanceof
    const isIntersection = primaryPoint instanceof Point2DLineLineIntersection ||
                           primaryPoint instanceof Point2DLineCircleIntersection ||
                           primaryPoint instanceof Point2DCircleCircleIntersection;
    
    if (!isIntersection) {
      throw new Error(`Primary point must be an intersection type, got: ${primaryPoint.constructor.name}`);
    }

    id = resolveElementId(id, () => this.generatePoint2DId(world));
    const label = primaryPoint.label;
    
    const siblingPoint = new SiblingIntersectionPoint2D(
      id,
      primaryIntersectionId,
      planeId,
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
    const planeId = requirePlaneId(this.id, 'origin point');
    id = resolveElementId(id, () => this.generatePoint2DId(world));

    const originPoint = new FreePoint2D(id, position, planeId, label);
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
    const planeId = requirePlaneId(this.id, 'half hinge line');
    id = resolveElementId(id, () => this.generateLine2DId(world));

    const hingeLine = world.getHingeLineById(hingeLineId);
    if (!hingeLine) {
      throw new Error(`Cannot add HalfHingeLine2D: HingeLine ${hingeLineId} not found`);
    }

    // Phase 84: Create without geometry - computed on demand via realize2D()
    // HalfHingeLine2D stores the authoritative parent hinge id; realization resolves it through the context.
    const halfHingeLine = new HalfHingeLine2D(
      id,
      hingeLine.id,
      planeId
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

}

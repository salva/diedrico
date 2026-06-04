import { Element } from '../Element';
import type { Point2D } from '../Point';
import type { Line2D } from '../Line';
import type { Circle2D } from '../Circle';
import { ProjectionPlaneElementStore } from './ProjectionPlaneElementStore';
import type { ProjectionPlaneRealizationContext } from './ProjectionPlaneContext';
import { ProjectionPlaneRealization2D, ProjectionPlaneRealization3D } from './ProjectionPlaneRealization';

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
  addPoint(point: Point2D): void {
    this.elementStore.addPoint(point);
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
  removePoint(id: string): boolean {
    return this.elementStore.removePoint(id);
  }

  // ==================== Line Methods ====================

  /**
   * Add a line to this plane
   */
  addLine(line: Line2D): void {
    this.elementStore.addLine(line);
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
  removeLine(id: string): boolean {
    return this.elementStore.removeLine(id);
  }

  // ==================== Circle Methods ====================

  /**
   * Add a circle to this plane
   */
  addCircle(circle: Circle2D): void {
    this.elementStore.addCircle(circle);
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
  removeCircle(id: string): boolean {
    return this.elementStore.removeCircle(id);
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

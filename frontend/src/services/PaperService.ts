/**
 * PaperService - Converts domain entities and realizations to Paper primitives
 * 
 * This service builds the intermediate Paper representation from domain entities.
 * Each projection plane has a transformation matrix to convert from its intrinsic
 * <u,v> coordinates to the unified paper coordinate system.
 * 
 * Pipeline:
 * 1. Get entity realization (<u,v> coordinates in plane space)
 * 2. Apply plane-to-paper transformation matrix
 * 3. Generate primitive with paper coordinates + resolved styles
 * 
 * Primitives contain all resolved visual attributes and are ready for viewport
 * transformation and SVG rendering.
 * 
 * Responsibilities:
 * - Convert domain entities + realizations → drawing primitives
 * - Apply plane-to-paper transformations
 * - Resolve style inheritance from process tree
 * - Compute visibility from subprocess visibility + infeasibility
 * - Generate primitives for all element types
 * 
 * @see specs/001-dihedral-learning-mvp/data-model.md#presentation-layer
 */

import type { Point2D, Point2DRealization } from '../domain/world/Point';
import type { World } from '../domain/world/World';
import {
  Paper,
  type Primitive,
  type PointPrimitive,
  type ResolvedStyle,
  RenderLayer,
} from '../domain/presentation/Paper';

/**
 * Plane-to-paper transformation matrix (3x3 for 2D homogeneous coordinates)
 * Converts from plane intrinsic <u,v> space to paper coordinate system
 */
export interface PlaneTransform {
  matrix: [
    number, number, number,  // [m11, m12, m13]
    number, number, number,  // [m21, m22, m23]
    number, number, number   // [m31, m32, m33]
  ];
}

/**
 * Apply plane-to-paper transformation to a point
 */
function transformPoint(u: number, v: number, transform: PlaneTransform): [number, number] {
  const [m11, m12, m13, m21, m22, m23, m31, m32, m33] = transform.matrix;
  
  // Matrix multiplication: [x, y, w]^T = M * [u, v, 1]^T
  const x = m11 * u + m12 * v + m13;
  const y = m21 * u + m22 * v + m23;
  const w = m31 * u + m32 * v + m33;
  
  // Convert from homogeneous to Cartesian
  return [x / w, y / w];
}

/**
 * Context for primitive generation
 */
export interface PrimitiveContext {
  world: World;
  planeTransforms: Map<string, PlaneTransform>;  // planeId → transform matrix
  highlightedEntityIds?: Set<string>;  // Hover/selection state
  activeSnapTargetId?: string;         // Current snap target
}

/**
 * Service for converting domain entities to Paper primitives
 */
export class PaperService {
  /**
   * Generate primitives for all entities
   */
  generatePrimitives(context: PrimitiveContext): Primitive[] {
    const primitives: Primitive[] = [];

    // Generate primitives for each point
    for (const point of context.world.points.values()) {
      const realization = context.world.getPointRealization(point.id!);
      const transform = context.planeTransforms.get(point.planeId!);
      
      if (realization && transform) {
        const primitive = this.pointToPrimitive(point, realization, transform, context);
        primitives.push(primitive);
      }
    }

    // TODO: Add primitives for other element types (lines, segments, circles, etc.)

    return primitives;
  }

  /**
   * Convert a Point2D + realization to a PointPrimitive
   * Applies plane-to-paper transformation
   */
  private pointToPrimitive(
    point: Point2D,
    realization: Point2DRealization,
    planeTransform: PlaneTransform,
    context: PrimitiveContext
  ): PointPrimitive {
    const isHighlighted = context.highlightedEntityIds?.has(point.id!) || false;
    const isSnapTarget = context.activeSnapTargetId === point.id;

    // Transform from plane <u,v> to paper coordinates
    const [x, y] = transformPoint(realization.u, realization.v, planeTransform);

    // Resolve visual style
    const style = this.resolvePointStyle(point, isHighlighted, isSnapTarget);

    return {
      type: 'point',
      id: `point-${point.id}`,
      sourceEntityId: point.id,
      layer: isSnapTarget ? RenderLayer.Highlights : RenderLayer.Elements,
      visible: true, // TODO: Compute from subprocess visibility + infeasibility
      style,
      x,
      y,
      radius: point.type === 'free' ? 5 : 4,
    };
  }

  /**
   * Resolve visual style for a point
   * TODO: Implement style inheritance from process tree
   */
  private resolvePointStyle(
    point: Point2D,
    isHighlighted: boolean,
    isSnapTarget: boolean
  ): ResolvedStyle {
    // Base colors by point type
    let fill: string;
    let stroke: string;

    if (isSnapTarget) {
      fill = '#FFA500'; // Orange for snap targets
      stroke = '#FF8C00';
    } else if (isHighlighted) {
      fill = point.type === 'free' ? '#6BB6FF' : '#FF6B9D';
      stroke = '#000000';
    } else {
      fill = point.type === 'free' ? '#4A90E2' : '#E94E77';
      stroke = '#333333';
    }

    return {
      stroke,
      strokeWidth: isHighlighted ? 2 : 1.5,
      strokeStyle: 'solid',
      fill,
      opacity: 1.0,
      zIndex: 10,
    };
  }

  /**
   * Update paper with current primitives
   */
  updatePaper(paper: Paper, context: PrimitiveContext): void {
    // Clear existing primitives
    paper.clear();

    // Generate new primitives for all planes
    const primitives = this.generatePrimitives(context);

    // Add to paper
    paper.setPrimitives(primitives);
  }

  /**
   * Update primitives for a specific entity (incremental update)
   */
  updateEntity(
    entityId: string,
    paper: Paper,
    context: PrimitiveContext
  ): void {
    // Remove old primitives for this entity
    paper.removePrimitivesByEntity(entityId);

    // Find the entity and generate new primitives
    const point = context.world.points.get(entityId);
    if (point) {
      const realization = context.world.getPointRealization(entityId);
      const transform = context.planeTransforms.get(point.planeId!);
      
      if (realization && transform) {
        const primitive = this.pointToPrimitive(point, realization, transform, context);
        paper.setPrimitive(primitive);
      }
    }

    // TODO: Handle other element types
  }
}

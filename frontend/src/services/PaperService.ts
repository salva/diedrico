/**
 * PaperService - Converts domain entities and realizations to Paper primitives
 * 
 * This service builds the intermediate Paper representation from domain entities.
 * Primitives are in plane intrinsic <u,v> coordinates and contain all resolved
 * visual attributes, ready for viewport transformation and SVG rendering.
 * 
 * Responsibilities:
 * - Convert domain entities + realizations → drawing primitives
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
 * Context for primitive generation
 */
export interface PrimitiveContext {
  world: World;
  highlightedEntityIds?: Set<string>;  // Hover/selection state
  activeSnapTargetId?: string;         // Current snap target
}

/**
 * Service for converting domain entities to Paper primitives
 */
export class PaperService {
  /**
   * Generate primitives for all entities in a plane
   */
  generatePrimitivesForPlane(
    planeId: string,
    context: PrimitiveContext
  ): Primitive[] {
    const primitives: Primitive[] = [];

    // Generate primitives for each point
    for (const point of context.world.points.values()) {
      if (point.planeId === planeId) {
        const realization = context.world.getPointRealization(point.id!);
        if (realization) {
          const primitive = this.pointToPrimitive(point, realization, context);
          primitives.push(primitive);
        }
      }
    }

    // TODO: Add primitives for other element types (lines, segments, circles, etc.)

    return primitives;
  }

  /**
   * Convert a Point2D + realization to a PointPrimitive
   */
  private pointToPrimitive(
    point: Point2D,
    realization: Point2DRealization,
    context: PrimitiveContext
  ): PointPrimitive {
    const isHighlighted = context.highlightedEntityIds?.has(point.id!) || false;
    const isSnapTarget = context.activeSnapTargetId === point.id;

    // Resolve visual style
    const style = this.resolvePointStyle(point, isHighlighted, isSnapTarget);

    return {
      type: 'point',
      id: `point-${point.id}`,
      sourceEntityId: point.id,
      layer: isSnapTarget ? RenderLayer.Highlights : RenderLayer.Elements,
      visible: true, // TODO: Compute from subprocess visibility + infeasibility
      style,
      u: realization.u,
      v: realization.v,
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
    // Clear existing primitives for this plane
    paper.clear();

    // Generate new primitives
    const primitives = this.generatePrimitivesForPlane(paper.planeId, context);

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
    if (point && point.planeId === paper.planeId) {
      const realization = context.world.getPointRealization(entityId);
      if (realization) {
        const primitive = this.pointToPrimitive(point, realization, context);
        paper.setPrimitive(primitive);
      }
    }

    // TODO: Handle other element types
  }
}

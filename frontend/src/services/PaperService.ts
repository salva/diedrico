/**
 * PaperService - Converts domain entities and realizations to Paper primitives
 * 
 * **RENDERING PATTERN**: Walk the World structure, get realizations, render.
 * 
 * This service implements the core rendering pattern:
 * 1. WALK: Iterate over domain objects in world.points, world.lines, etc.
 * 2. REALIZE: Get numeric data via world.getPoint2DRealization(point.id)
 * 3. RENDER: Use realization (numeric) + point (structural) to generate primitives
 * 
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

import { Matrix3 } from 'three';
import type { Point2D, Point2DRealization } from '../domain/world/Point';
import type { Line2D, Line2DRealization } from '../domain/world/Line';
import type { World } from '../domain/world/World';
import {
  Paper,
  type Primitive,
  type PointPrimitive,
  type LinePrimitive,
  type ResolvedStyle,
  RenderLayer,
} from '../domain/presentation/Paper';

/**
 * Context for primitive generation
 */
export interface PrimitiveContext {
  world: World;
  planeTransforms: Map<string, Matrix3>;  // planeId → plane-to-paper transformation matrix
  highlightedEntityIds?: Set<string>;  // Hover/selection state
  activeSnapTargetId?: string;         // Current snap target
}

/**
 * Service for converting domain entities to Paper primitives
 */
export class PaperService {
  /**
   * Generate primitives for all entities
   * 
   * RENDERING PATTERN:
   * 1. WALK: Iterate domain objects (world.getAllPoints())
   * 2. REALIZE: Get numeric data (world.getPoint2DRealization(point.id))
   * 3. RENDER: Generate primitive using realization + point metadata
   */
  generatePrimitives(context: PrimitiveContext): Primitive[] {
    const primitives: Primitive[] = [];

    // WALK: Iterate over all points in the world
    for (const point of context.world.getAllPoints()) {
      // REALIZE: Get computed position (numeric data)
      const realization = context.world.getPoint2DRealization(point.id!);
      // Get plane transformation matrix
      const transform = context.planeTransforms.get(point.planeId!);
      
      if (realization && transform) {
        // RENDER: Generate primitive using realization (numeric) + point (structural)
        const primitive = this.pointToPrimitive(point, realization, transform, context);
        primitives.push(primitive);
      }
    }

    // WALK: Iterate over all lines in the world
    for (const line of context.world.getAllLines()) {
      // REALIZE: Get computed line equation (numeric data)
      const realization = context.world.getLine2DRealization(line.id!);
      // Get plane transformation matrix
      const transform = context.planeTransforms.get(line.planeId!);
      
      if (realization && transform) {
        // RENDER: Generate primitive using realization (numeric) + line (structural)
        const primitive = this.lineToPrimitive(line, realization, transform, context);
        primitives.push(primitive);
      }
    }

    // TODO: Add primitives for other element types (segments, circles, etc.)

    return primitives;
  }

  /**
   * Convert a Point2D + realization to a PointPrimitive
   * Applies plane-to-paper transformation
   */
  private pointToPrimitive(
    point: Point2D,
    realization: Point2DRealization,
    planeToPaperMatrix: Matrix3,
    context: PrimitiveContext
  ): PointPrimitive {
    const isHighlighted = context.highlightedEntityIds?.has(point.id!) || false;
    const isSnapTarget = context.activeSnapTargetId === point.id;

    // Transform from plane <u,v> to paper coordinates
    const paperPos = realization.position.clone().applyMatrix3(planeToPaperMatrix);

    // Resolve visual style
    const style = this.resolvePointStyle(point, isHighlighted, isSnapTarget);

    return {
      type: 'point',
      id: `point-${point.id}`,
      sourceEntityId: point.id,
      layer: isSnapTarget ? RenderLayer.Highlights : RenderLayer.Elements,
      visible: true, // TODO: Compute from subprocess visibility + infeasibility
      style,
      x: paperPos.x,
      y: paperPos.y,
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
   * Convert a Line2D + realization to a LinePrimitive
   * Applies plane-to-paper transformation - MUCH SIMPLER with parametric form!
   * 
   * Parametric form transformation:
   * - Transform point: point' = M * point (includes translation)
   * - Transform direction: direction' = M * direction (NO translation - just rotation/scale)
   * 
   * This is WAY simpler than transforming implicit line equations!
   */
  private lineToPrimitive(
    line: Line2D,
    realization: Line2DRealization,
    planeToPaperMatrix: Matrix3,
    context: PrimitiveContext
  ): LinePrimitive {
    const isHighlighted = context.highlightedEntityIds?.has(line.id!) || false;

    // Transform point on line (includes translation)
    const paperPoint = realization.point.clone().applyMatrix3(planeToPaperMatrix);
    
    // Transform direction vector (NO translation - direction is invariant under translation)
    // For direction vectors, we only apply rotation/scale part of matrix
    const paperDirection = realization.direction.clone().applyMatrix3(planeToPaperMatrix);

    // Resolve visual style
    const style = this.resolveLineStyle(line, isHighlighted);

    return {
      type: 'line',
      id: `line-${line.id}`,
      sourceEntityId: line.id,
      layer: RenderLayer.Elements,
      visible: true, // TODO: Compute from subprocess visibility + infeasibility
      style,
      point: { x: paperPoint.x, y: paperPoint.y },
      direction: { x: paperDirection.x, y: paperDirection.y },
    };
  }

  /**
   * Resolve visual style for a line
   * TODO: Implement style inheritance from process tree
   */
  private resolveLineStyle(
    line: Line2D,
    isHighlighted: boolean
  ): ResolvedStyle {
    const stroke = isHighlighted ? '#6BB6FF' : '#333333';
    const strokeWidth = isHighlighted ? 2 : 1.5;

    return {
      stroke,
      strokeWidth,
      strokeStyle: 'solid',
      fill: 'none',
      opacity: 1.0,
      zIndex: 5, // Lines render below points
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
    const point = context.world.getPointById(entityId);
    if (point) {
      const realization = context.world.getPoint2DRealization(entityId);
      const transform = context.planeTransforms.get(point.planeId!);
      
      if (realization && transform) {
        const primitive = this.pointToPrimitive(point, realization, transform, context);
        paper.setPrimitive(primitive);
      }
    }

    // TODO: Handle other element types
  }
}

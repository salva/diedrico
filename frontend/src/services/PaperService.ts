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
import type { Segment2D, Segment2DRealization } from '../domain/world/Segment';
import type { Circle2D, Circle2DRealization } from '../domain/world/Circle';
import type { Guide2D, Guide2DRealization } from '../domain/world/Guide';
import type { World } from '../domain/world/World';
import {
  Paper,
  type Primitive,
  type PointPrimitive,
  type LinePrimitive,
  type SegmentPrimitive,
  type CirclePrimitive,
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
    const allLines = context.world.getAllLines();
    console.log('[PaperService] getAllLines() returned:', allLines.length, 'lines');
    for (const line of allLines) {
      console.log('[PaperService] Processing line:', line.id, 'planeId:', line.planeId);
      // REALIZE: Get computed line equation (numeric data)
      const realization = context.world.getLine2DRealization(line.id!);
      console.log('[PaperService] Line realization:', realization);
      // Get plane transformation matrix
      const transform = context.planeTransforms.get(line.planeId!);
      console.log('[PaperService] Transform for plane:', line.planeId, ':', !!transform);
      
      if (realization && transform) {
        // RENDER: Generate primitive using realization (numeric) + line (structural)
        const primitive = this.lineToPrimitive(line, realization, transform, context);
        console.log('[PaperService] Created line primitive:', primitive);
        primitives.push(primitive);
      } else {
        console.warn('[PaperService] Skipping line - missing realization or transform');
      }
    }

    // WALK: Iterate over all segments in the world
    const allSegments = context.world.getAllSegments();
    for (const segment of allSegments) {
      // REALIZE: Get computed segment endpoints (numeric data)
      const realization = context.world.getSegment2DRealization(segment.id!);
      // Get plane transformation matrix
      const transform = context.planeTransforms.get(segment.planeId!);
      
      if (realization && transform) {
        // RENDER: Generate primitive using realization (numeric) + segment (structural)
        const primitive = this.segmentToPrimitive(segment, realization, transform, context);
        primitives.push(primitive);
      }
    }

    // WALK: Iterate over all circles in the world
    const allCircles = context.world.getAllCircles();
    for (const circle of allCircles) {
      // REALIZE: Get computed circle geometry (numeric data)
      const realization = context.world.getCircle2DRealization(circle.id!);
      // Get plane transformation matrix
      const transform = context.planeTransforms.get(circle.planeId!);
      
      if (realization && transform) {
        // RENDER: Generate primitive using realization (numeric) + circle (structural)
        const primitive = this.circleToPrimitive(circle, realization, transform, context);
        primitives.push(primitive);
      }
    }

    // WALK: Iterate over all guides in the world
    const allGuides = context.world.getAllGuides();
    for (const guide of allGuides) {
      // REALIZE: Get computed guide line geometry (numeric data)
      const realization = context.world.getGuide2DRealization(guide.id!);
      // Get plane transformation matrix
      const transform = context.planeTransforms.get(guide.planeId!);
      
      if (realization && transform) {
        // RENDER: Generate primitive using realization (numeric) + guide (structural)
        const primitive = this.guideToPrimitive(guide, realization, transform, context);
        primitives.push(primitive);
      }
    }

    // TODO: Add primitives for other element types (arcs, etc.)

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
      position: paperPos,           // Keep as Vector3 - SVGRenderer extracts x/y
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
      point: paperPoint,            // Keep as Vector3 - SVGRenderer extracts x/y
      direction: paperDirection,    // Keep as Vector3 - SVGRenderer extracts x/y
    };
  }

  /**
   * Resolve visual style for a line
   * TODO: Implement style inheritance from process tree
   */
  private resolveLineStyle(
    _line: Line2D,  // Reserved for future style inheritance
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
   * Convert a Segment2D + realization to a SegmentPrimitive
   * Applies plane-to-paper transformation
   * 
   * Segments are finite line segments between two endpoints
   */
  private segmentToPrimitive(
    segment: Segment2D,
    realization: Segment2DRealization,
    planeToPaperMatrix: Matrix3,
    context: PrimitiveContext
  ): SegmentPrimitive {
    const isHighlighted = context.highlightedEntityIds?.has(segment.id!) || false;

    // Transform both endpoints from plane <u,v> to paper coordinates
    const paperPoint1 = realization.point1.clone().applyMatrix3(planeToPaperMatrix);
    const paperPoint2 = realization.point2.clone().applyMatrix3(planeToPaperMatrix);

    // Resolve visual style
    const style = this.resolveSegmentStyle(segment, isHighlighted);

    return {
      type: 'segment',
      id: `segment-${segment.id}`,
      sourceEntityId: segment.id,
      layer: RenderLayer.Elements,
      visible: true, // TODO: Compute from subprocess visibility + infeasibility
      style,
      point1: paperPoint1,    // Keep as Vector3 - SVGRenderer extracts x/y
      point2: paperPoint2,    // Keep as Vector3 - SVGRenderer extracts x/y
    };
  }

  /**
   * Resolve visual style for a segment
   * Segments have slightly different styling than infinite lines
   * TODO: Implement style inheritance from process tree
   */
  private resolveSegmentStyle(
    _segment: Segment2D,  // Reserved for future style inheritance
    isHighlighted: boolean
  ): ResolvedStyle {
    const stroke = isHighlighted ? '#6BB6FF' : '#2C3E50';
    const strokeWidth = isHighlighted ? 2.5 : 2;

    return {
      stroke,
      strokeWidth,
      strokeStyle: 'solid',
      fill: 'none',
      opacity: 1.0,
      zIndex: 5, // Segments render at same level as lines
    };
  }

  /**
   * Convert a Circle2D + realization to a CirclePrimitive
   * Applies plane-to-paper transformation
   */
  private circleToPrimitive(
    circle: Circle2D,
    realization: Circle2DRealization,
    planeToPaperMatrix: Matrix3,
    context: PrimitiveContext
  ): CirclePrimitive {
    const isHighlighted = context.highlightedEntityIds?.has(circle.id!) || false;

    // Transform center from plane <u,v> to paper coordinates
    const paperCenter = realization.center.clone().applyMatrix3(planeToPaperMatrix);

    // Transform radius: extract scale from transformation matrix
    // Use average of x and y scale factors for uniform scaling approximation
    const scaleX = Math.sqrt(planeToPaperMatrix.elements[0] * planeToPaperMatrix.elements[0] + 
                             planeToPaperMatrix.elements[1] * planeToPaperMatrix.elements[1]);
    const scaleY = Math.sqrt(planeToPaperMatrix.elements[3] * planeToPaperMatrix.elements[3] + 
                             planeToPaperMatrix.elements[4] * planeToPaperMatrix.elements[4]);
    const avgScale = (scaleX + scaleY) / 2;
    const paperRadius = realization.radius * avgScale;

    // Resolve visual style
    const style = this.resolveCircleStyle(circle, isHighlighted);

    return {
      type: 'circle',
      id: `circle-${circle.id}`,
      sourceEntityId: circle.id!,
      layer: RenderLayer.Elements,
      visible: true,
      style,
      cx: paperCenter.x,
      cy: paperCenter.y,
      radius: paperRadius,
    };
  }

  /**
   * Resolve visual style for a circle
   * TODO: Implement style inheritance from process tree
   */
  private resolveCircleStyle(
    _circle: Circle2D,  // Reserved for future style inheritance
    isHighlighted: boolean
  ): ResolvedStyle {
    const stroke = isHighlighted ? '#6BB6FF' : '#1E88E5';  // Blue for circles
    const strokeWidth = isHighlighted ? 2.5 : 2;

    return {
      stroke,
      strokeWidth,
      strokeStyle: 'solid',
      fill: 'none',
      opacity: 1.0,
      zIndex: 5, // Circles render at same level as lines/segments
    };
  }

  /**
   * Convert a Guide2D + realization to a LinePrimitive
   * Guides are rendered as dashed lines extending to viewport edges
   * Applies plane-to-paper transformation
   */
  private guideToPrimitive(
    guide: Guide2D,
    realization: Guide2DRealization,
    planeToPaperMatrix: Matrix3,
    context: PrimitiveContext
  ): LinePrimitive {
    const isHighlighted = context.highlightedEntityIds?.has(guide.id!) || false;

    // Transform point on guide (includes translation)
    const paperPoint = realization.point.clone().applyMatrix3(planeToPaperMatrix);
    
    // Transform direction vector (NO translation - direction is invariant under translation)
    const paperDirection = realization.direction.clone().applyMatrix3(planeToPaperMatrix);

    // Resolve visual style (dashed line)
    const style = this.resolveGuideStyle(guide, isHighlighted);

    return {
      type: 'line',
      id: `guide-${guide.id}`,
      sourceEntityId: guide.id,
      layer: RenderLayer.Guides,  // Guides render on their own layer (below elements)
      visible: true, // TODO: Compute from subprocess visibility + infeasibility
      style,
      point: paperPoint,            // Keep as Vector3 - SVGRenderer extracts x/y
      direction: paperDirection,    // Keep as Vector3 - SVGRenderer extracts x/y
    };
  }

  /**
   * Resolve visual style for a guide
   * Guides render as dashed lines with distinct color
   * TODO: Implement style inheritance from process tree
   */
  private resolveGuideStyle(
    _guide: Guide2D,  // Reserved for future style inheritance
    isHighlighted: boolean
  ): ResolvedStyle {
    const stroke = isHighlighted ? '#6BB6FF' : '#9C27B0';  // Purple for guides
    const strokeWidth = isHighlighted ? 2 : 1.5;

    return {
      stroke,
      strokeWidth,
      strokeStyle: 'dashed',  // Dashed style distinguishes guides from lines
      fill: 'none',
      opacity: 0.8,  // Slightly transparent
      zIndex: 3, // Guides render below regular lines
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

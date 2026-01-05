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
import type { Point2D, Point2DRealization2D } from '../domain/world/Point';
import type { Line2D, Line2DRealization2D } from '../domain/world/Line';
import type { Segment2D, Segment2DRealization2D } from '../domain/world/Segment';
import type { Circle2D, Circle2DRealization2D } from '../domain/world/Circle';
import type { Guide2D, Guide2DRealization2D } from '../domain/world/Guide';
import type { HingeLine } from '../domain/world/HingeLine';
import type { HalfHingeLine2D } from '../domain/world/HingeLine';
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
  activePlaneId?: string;              // Active plane for visual emphasis (FR-002)
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
    for (const point of context.world.getAllPoints2D()) {      // Skip invisible points
      if (!point.visible) continue;
      
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

    // WALK: Iterate over all lines in the world (including HalfHingeLine2D)
    // HalfHingeLine2D are Line2D entities with type 'half-hinge'
    const allLines = context.world.getAllLines2D();
    for (const line of allLines) {
      // Skip invisible lines
      if (!line.visible) continue;
      
      // REALIZE: Get computed line equation (numeric data)
      const realization = context.world.getLine2DRealization(line.id!);
      // Get plane transformation matrix
      const transform = context.planeTransforms.get(line.planeId!);
      
      if (realization && transform) {
        // HalfHingeLine2D uses special styling, other lines use normal styling
        if (line.type === 'half-hinge') {
          const halfHinge = line as HalfHingeLine2D;
          const primitive = this.halfHingeLineToPrimitive(halfHinge, realization, transform, line.planeId!, context);
          primitives.push(primitive);
        } else {
          // RENDER: Generate primitive using realization (numeric) + line (structural)
          const primitive = this.lineToPrimitive(line, realization, transform, context);
          primitives.push(primitive);
        }
      } else {
        console.warn('[PaperService] Skipping line - missing realization or transform');
      }
    }

    // WALK: Iterate over all segments in the world
    const allSegments = context.world.getAllSegments2D();
    for (const segment of allSegments) {
      // Skip invisible segments
      if (!segment.visible) continue;
      
      // REALIZE: Get computed segment endpoints (numeric data)
      const realization = context.world.getSegment2DRealization(segment.id!);
      // Get plane transformation matrix
      const transform = context.planeTransforms.get(segment.planeId!);
      
      if (realization && transform) {
        // RENDER: Generate primitive using realization (numeric) + segment (structural)
        const primitive = this.segmentToPrimitive(segment, realization, transform, context);
        primitives.push(primitive);
      } else {
        console.warn('[PaperService] Skipping segment - missing realization or transform');
      }
    }

    // WALK: Iterate over all circles in the world
    const allCircles = context.world.getAllCircles2D();
    for (const circle of allCircles) {
      // Skip invisible circles
      if (!circle.visible) continue;
      
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
    const allGuides = context.world.getAllGuides2D();
    for (const guide of allGuides) {
      // Skip invisible guides
      if (!guide.visible) continue;
      
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
    realization: Point2DRealization2D,
    planeToPaperMatrix: Matrix3,
    context: PrimitiveContext
  ): PointPrimitive {
    const isHighlighted = context.highlightedEntityIds?.has(point.id!) || false;
    const isSnapTarget = context.activeSnapTargetId === point.id;

    // Transform from plane <u,v> to paper coordinates
    const paperPos = realization.position.clone().applyMatrix3(planeToPaperMatrix);

    // Resolve visual style
    const style = this.resolvePointStyle(point, isHighlighted, isSnapTarget, context.activePlaneId);

    return {
      type: 'point',
      id: `point-${point.id}`,
      sourceEntityId: point.id,
      planeId: point.planeId,  // FR-002: For active plane hit testing filter
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
    isSnapTarget: boolean,
    activePlaneId?: string
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

    // FR-002: Active plane visual emphasis - 50% opacity for inactive planes
    const opacity = (activePlaneId && point.planeId !== activePlaneId) ? 0.5 : 1.0;

    // Active plane boost: +100 to z-index to render on top of inactive plane elements
    const zIndexBoost = (activePlaneId && point.planeId === activePlaneId) ? 100 : 0;

    return {
      stroke,
      strokeWidth: isHighlighted ? 2 : 1.5,
      strokeStyle: 'solid',
      fill,
      opacity,
      zIndex: 10 + zIndexBoost,
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
    realization: Line2DRealization2D,
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
    const style = this.resolveLineStyle(line, isHighlighted, context.activePlaneId);

    return {
      type: 'line',
      id: `line-${line.id}`,
      sourceEntityId: line.id,
      planeId: line.planeId,  // FR-002: For active plane hit testing filter
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
    line: Line2D,
    isHighlighted: boolean,
    activePlaneId?: string
  ): ResolvedStyle {
    const stroke = isHighlighted ? '#6BB6FF' : '#333333';
    const strokeWidth = isHighlighted ? 2 : 1.5;

    // FR-002: Active plane visual emphasis - 50% opacity for inactive planes
    const opacity = (activePlaneId && line.planeId !== activePlaneId) ? 0.5 : 1.0;

    // Active plane boost: +100 to z-index to render on top of inactive plane elements
    const zIndexBoost = (activePlaneId && line.planeId === activePlaneId) ? 100 : 0;

    return {
      stroke,
      strokeWidth,
      strokeStyle: 'solid',
      fill: 'none',
      opacity,
      zIndex: 5 + zIndexBoost, // Lines render below points
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
    realization: Segment2DRealization2D,
    planeToPaperMatrix: Matrix3,
    context: PrimitiveContext
  ): SegmentPrimitive {
    if (!segment.id) {
      console.error('[PaperService] Segment missing ID:', segment);
      throw new Error('Segment must have an ID');
    }
    
    const isHighlighted = context.highlightedEntityIds?.has(segment.id) || false;

    // Transform both endpoints from plane <u,v> to paper coordinates
    const paperPoint1 = realization.point1.clone().applyMatrix3(planeToPaperMatrix);
    const paperPoint2 = realization.point2.clone().applyMatrix3(planeToPaperMatrix);

    // Resolve visual style
    const style = this.resolveSegmentStyle(segment, isHighlighted, context.activePlaneId);

    return {
      type: 'segment',
      id: `segment-${segment.id}`,
      sourceEntityId: segment.id,
      planeId: segment.planeId,  // FR-002: For active plane hit testing filter
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
    segment: Segment2D,
    isHighlighted: boolean,
    activePlaneId?: string
  ): ResolvedStyle {
    const stroke = isHighlighted ? '#6BB6FF' : '#2C3E50';
    const strokeWidth = isHighlighted ? 2.5 : 2;

    // FR-002: Active plane visual emphasis - 50% opacity for inactive planes
    const opacity = (activePlaneId && segment.planeId !== activePlaneId) ? 0.5 : 1.0;

    // Active plane boost: +100 to z-index to render on top of inactive plane elements
    const zIndexBoost = (activePlaneId && segment.planeId === activePlaneId) ? 100 : 0;

    return {
      stroke,
      strokeWidth,
      strokeStyle: 'solid',
      fill: 'none',
      opacity,
      zIndex: 5 + zIndexBoost, // Segments render at same level as lines
    };
  }

  /**
   * Convert a Circle2D + realization to a CirclePrimitive
   * Applies plane-to-paper transformation
   */
  private circleToPrimitive(
    circle: Circle2D,
    realization: Circle2DRealization2D,
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
    const style = this.resolveCircleStyle(circle, isHighlighted, context.activePlaneId);

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
    circle: Circle2D,
    isHighlighted: boolean,
    activePlaneId?: string
  ): ResolvedStyle {
    const stroke = isHighlighted ? '#6BB6FF' : '#333333';
    const strokeWidth = isHighlighted ? 2 : 1.5;

    // FR-002: Active plane visual emphasis - 50% opacity for inactive planes
    const opacity = (activePlaneId && circle.planeId !== activePlaneId) ? 0.5 : 1.0;

    // Active plane boost: +100 to z-index to render on top of inactive plane elements
    const zIndexBoost = (activePlaneId && circle.planeId === activePlaneId) ? 100 : 0;

    return {
      stroke,
      strokeWidth,
      strokeStyle: 'solid',
      fill: 'none',
      opacity,
      zIndex: 5 + zIndexBoost, // Circles render at same level as lines/segments
    };
  }

  /**
   * Convert a Guide2D + realization to a LinePrimitive
   * Guides are rendered as dashed lines extending to viewport edges
   * Applies plane-to-paper transformation
   */
  private guideToPrimitive(
    guide: Guide2D,
    realization: Guide2DRealization2D,
    planeToPaperMatrix: Matrix3,
    context: PrimitiveContext
  ): LinePrimitive {
    const isHighlighted = context.highlightedEntityIds?.has(guide.id!) || false;

    // Transform point on guide (includes translation)
    const paperPoint = realization.point.clone().applyMatrix3(planeToPaperMatrix);
    
    // Transform direction vector (NO translation - direction is invariant under translation)
    const paperDirection = realization.direction.clone().applyMatrix3(planeToPaperMatrix);

    // Resolve visual style (dashed line)
    const style = this.resolveGuideStyle(guide, isHighlighted, context.activePlaneId);

    return {
      type: 'line',
      id: `guide-${guide.id}`,
      sourceEntityId: guide.id,
      planeId: undefined,  // FR-002: Guides have no plane - always pickable
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
   * FR-002: Guides always 100% opacity (belong to all planes)
   * TODO: Implement style inheritance from process tree
   */
  private resolveGuideStyle(
    _guide: Guide2D,  // Reserved for future style inheritance
    isHighlighted: boolean,
    _activePlaneId?: string  // Ignored - guides always 100% opacity
  ): ResolvedStyle {
    const stroke = isHighlighted ? '#6BB6FF' : '#9C27B0';  // Purple for guides
    const strokeWidth = isHighlighted ? 2 : 1.5;

    return {
      stroke,
      strokeWidth,
      strokeStyle: 'dashed',  // Dashed style distinguishes guides from lines
      fill: 'none',
      opacity: 1.0,  // FR-002: Guides always 100% opacity
      zIndex: 3, // Guides render below regular lines
    };
  }

  /**
   * Convert a HingeLine + realization to a LinePrimitive
   * 
   * Hinge lines are fixed elements representing folds between projection planes.
   * They render as dashed gray lines on both planes they connect.
   * 
   * @param hingeLine The HingeLine entity
   * @param realization The 2D realization on a specific plane
   * @param planeToPaperMatrix Transformation from plane to paper coordinates
   * @param planeId Which plane this realization is for
   * @param context Rendering context
   */
  private hingeLineToPrimitive(
    hingeLine: HingeLine,
    realization: Line2DRealization2D,
    planeToPaperMatrix: Matrix3,
    planeId: string,
    context: PrimitiveContext
  ): LinePrimitive {
    const isHighlighted = context.highlightedEntityIds?.has(hingeLine.id) || false;

    // Transform point on hinge line (includes translation)
    const paperPoint = realization.point.clone().applyMatrix3(planeToPaperMatrix);
    
    // Transform direction vector (NO translation - direction is invariant under translation)
    const paperDirection = realization.direction.clone().applyMatrix3(planeToPaperMatrix);

    // Resolve visual style (dashed gray line)
    const style = this.resolveHingeLineStyle(hingeLine, isHighlighted, context.activePlaneId);

    return {
      type: 'line',
      id: `hingeline-${hingeLine.id}-${planeId}`,  // Unique ID per plane
      sourceEntityId: hingeLine.id,
      planeId: undefined,  // FR-002: Hinge lines have no plane - always pickable
      layer: RenderLayer.HingeLines,  // Hinge lines render on their own layer (fixed elements)
      visible: true,
      style,
      point: paperPoint,            // Keep as Vector3 - SVGRenderer extracts x/y
      direction: paperDirection,    // Keep as Vector3 - SVGRenderer extracts x/y
    };
  }

  /**
   * Resolve visual style for a hinge line
   * Hinge lines render as dashed gray lines (per spec: #333333)
   * FR-002: Hinge lines always 100% opacity (belong to all planes)
   */
  private resolveHingeLineStyle(
    _hingeLine: HingeLine,
    isHighlighted: boolean,
    _activePlaneId?: string  // Ignored - hinge lines always 100% opacity
  ): ResolvedStyle {
    const stroke = isHighlighted ? '#666666' : '#333333';  // Gray for hinge lines
    const strokeWidth = isHighlighted ? 2 : 1.5;

    return {
      stroke,
      strokeWidth,
      strokeStyle: 'dashed',  // Dashed style per spec
      fill: 'none',
      opacity: 1.0,  // FR-002: Hinge lines always 100% opacity
      zIndex: 2, // Hinge lines render below guides
    };
  }

  /**
   * Convert a HalfHingeLine2D + realization to a LinePrimitive
   * Applies plane-to-paper transformation
   * 
   * @param halfHinge The HalfHingeLine2D definition (2D representation on a specific plane)
   * @param realization The computed geometric data (point + direction)
   * @param planeToPaperMatrix Transformation matrix from plane coords to paper coords
   * @param planeId Which plane this half-hinge belongs to
   * @param context Rendering context
   */
  private halfHingeLineToPrimitive(
    halfHinge: HalfHingeLine2D,
    realization: Line2DRealization2D,
    planeToPaperMatrix: Matrix3,
    planeId: string,
    context: PrimitiveContext
  ): LinePrimitive {
    const isHighlighted = context.highlightedEntityIds?.has(halfHinge.id) || false;

    // Transform point on hinge line (includes translation)
    const paperPoint = realization.point.clone().applyMatrix3(planeToPaperMatrix);
    
    // Transform direction vector (NO translation - direction is invariant under translation)
    const paperDirection = realization.direction.clone().applyMatrix3(planeToPaperMatrix);

    // Resolve visual style (dashed gray line)
    const style = this.resolveHalfHingeLineStyle(halfHinge, isHighlighted, context.activePlaneId);

    return {
      type: 'line',
      id: `halfhingeline-${halfHinge.id}`,
      sourceEntityId: halfHinge.id,  // Use actual line ID for highlighting
      planeId: halfHinge.planeId,  // HalfHingeLine2D belongs to specific plane
      layer: RenderLayer.HingeLines,  // Hinge lines render on their own layer (fixed elements)
      visible: true,
      style,
      point: paperPoint,            // Keep as Vector3 - SVGRenderer extracts x/y
      direction: paperDirection,    // Keep as Vector3 - SVGRenderer extracts x/y
    };
  }

  /**
   * Resolve visual style for a half-hinge line
   * Hinge lines render as dashed gray lines (per spec: #333333)
   * FR-002: Hinge lines always 100% opacity (belong to all planes)
   */
  private resolveHalfHingeLineStyle(
    halfHinge: HalfHingeLine2D,
    isHighlighted: boolean,
    activePlaneId?: string
  ): ResolvedStyle {
    const stroke = isHighlighted ? '#6BB6FF' : '#333333';  // Blue when highlighted, gray otherwise
    const strokeWidth = isHighlighted ? 2 : 1.5;

    // Active plane boost: +100 to z-index to render on top of inactive plane elements
    const zIndexBoost = (activePlaneId && halfHinge.planeId === activePlaneId) ? 100 : 0;

    return {
      stroke,
      strokeWidth,
      strokeStyle: 'dashed',  // Dashed style per spec
      fill: 'none',
      opacity: 1.0,  // FR-002: Always 100% opacity
      zIndex: 2 + zIndexBoost, // Hinge lines render below guides
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
    const point = context.world.getPoint2DById(entityId);
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

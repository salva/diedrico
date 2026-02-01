/**
 * PaperService - Converts domain entities and realizations to Paper primitives
 * 
 * **RENDERING PATTERN**: Iterate planes, get elements and realizations, render primitives.
 * 
 * This service implements the core rendering pattern (Phase 22.5.4):
 * 1. WALK: Iterate projection planes, then elements (plane.getAllPoints(), etc.)
 * 2. REALIZE: Compute numeric data via plane.realizePoint2D(point, world)
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
import { HalfHingeLine2D } from '@/domain/world/HingeLine';
import { FreePoint2D } from '@/domain/world/Point';
import { Segment2DByPoints } from '@/domain/world/Segment';
import { Guide2D, SiblingGuide2D, isGuide2D, isSiblingGuide2D } from '@/domain/world/Guide';
import type { Point2D, Point2DRealization2D } from '../domain/world/Point';
import type { Line2D, Line2DRealization2D } from '../domain/world/Line';
import type { Circle2D, Circle2DRealization2D } from '../domain/world/Circle';
import type { Guide2D } from '../domain/world/Guide';
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
  highlightedEntityIds?: Set<string>;  // Hover/selection state (legacy - use hoveredIds/selectedIds instead)
  hoveredIds?: Set<string>;            // Hovered entities (lighter highlight)
  selectedIds?: Set<string>;           // Selected entities (bold highlight)
  cascadeHighlightIds?: Set<string>;   // Elements that will be cascade deleted (orange warning)
  activeSnapTargetId?: string;         // Current snap target
  activePlaneId?: string;              // Active plane for visual emphasis (FR-002)
}

import { resolveVisibility } from '../domain/world/styleService';

/**
 * Service for converting domain entities to Paper primitives
 */
export class PaperService {
  /**
   * Generate primitives for all entities
   * 
   * RENDERING PATTERN:
   * 1. WALK: Iterate planes, then domain objects (plane.getAllPoints())
   * 2. REALIZE: Get numeric data (plane.getPointRealization2D(point.id))
   * 3. RENDER: Generate primitive using realization + point metadata
   */
  generatePrimitives(context: PrimitiveContext): Primitive[] {
    const primitives: Primitive[] = [];

    // WALK: Iterate over all projection planes
    for (const plane of context.world.projectionPlanes.values()) {
      const transform = context.planeTransforms.get(plane.id!);
      if (!transform) continue;

      // WALK: Iterate over all points in this plane
      for (const point of plane.getAllPoints()) {
        // Skip invisible points (Phase 87: Encapsulation support via styleService)
        if (!resolveVisibility(point, context.world)) continue;
        
        // REALIZE: Compute position (numeric data) from plane - computes and caches
        const realization = plane.realizePoint2D(point, context.world);
        
        if (realization) {
          // RENDER: Generate primitive using realization (numeric) + point (structural)
          const primitive = this.pointToPrimitive(point, realization, transform, context);
          primitives.push(primitive);
        }
      }

      // WALK: Iterate over all lines in this plane (including HalfHingeLine2D)
      // HalfHingeLine2D are Line2D entities with type 'half-hinge'
      for (const line of plane.getAllLines()) {
        // Skip invisible lines (Phase 87: Encapsulation support via styleService)
        if (!resolveVisibility(line, context.world)) continue;
        
        // REALIZE: Compute line equation (numeric data) from plane - computes and caches
        const realization = plane.realizeLine2D(line, context.world);
        
        if (realization) {
          // Check most specific types first (subclasses before base classes)
          if (line instanceof HalfHingeLine2D) {
            const primitive = this.halfHingeLineToPrimitive(line, realization, transform, line.planeId!, context);
            primitives.push(primitive);
          } else if (line instanceof Segment2DByPoints) {
            // Segments are Line2D subclass with finite endpoints
            const primitive = this.segmentToPrimitive(line, realization, transform, context);
            primitives.push(primitive);
          } else if (line instanceof Guide2D || line instanceof SiblingGuide2D) {
            // Guides (both primary and sibling) are perpendicular lines with special rendering
            const primitive = this.guideToPrimitive(line as Guide2D | SiblingGuide2D, realization, transform, context);
            primitives.push(primitive);
          } else {
            // RENDER: Normal infinite lines
            const primitive = this.lineToPrimitive(line, realization, transform, context);
            primitives.push(primitive);
          }
        } else {
          // console.warn('[PaperService] Skipping line - missing realization');
        }
      }

      // WALK: Iterate over all circles in this plane
      for (const circle of plane.getAllCircles()) {
        // Skip invisible circles (Phase 87: Encapsulation support via styleService)
        if (!resolveVisibility(circle, context.world)) continue;
        
        // REALIZE: Compute circle geometry (numeric data) from plane - computes and caches
        const realization = plane.realizeCircle2D(circle, context.world);
        
        if (realization) {
          // RENDER: Generate primitive using realization (numeric) + circle (structural)
          const primitive = this.circleToPrimitive(circle, realization, transform, context);
          primitives.push(primitive);
        }
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
    // Check hover/selection state (prefer new fields, fallback to legacy highlightedEntityIds)
    const isHovered = context.hoveredIds?.has(point.id!) || false;
    const isSelected = context.selectedIds?.has(point.id!) || false;
    const isHighlighted = isSelected || isHovered || context.highlightedEntityIds?.has(point.id!) || false;
    const isSnapTarget = context.activeSnapTargetId === point.id;

    // Transform from plane <u,v> to paper coordinates
    const paperPos = realization.position.clone().applyMatrix3(planeToPaperMatrix);

    // Resolve visual style
    const style = this.resolvePointStyle(point, isSelected, isHovered, isSnapTarget, context.activePlaneId);

    return {
      type: 'point',
      id: `point-${point.id}`,
      sourceEntityId: point.id,
      planeId: point.planeId,  // FR-002: For active plane hit testing filter
      layer: isSnapTarget ? RenderLayer.Highlights : RenderLayer.Elements,
      visible: true, // TODO: Compute from subprocess visibility + infeasibility
      style,
      position: paperPos,           // Keep as Vector3 - SVGRenderer extracts x/y
      radius: point instanceof FreePoint2D ? 5 : 4,
    };
  }

  /**
   * Resolve visual style for a point
   * Per ui-spec.md: Hover = #4A90E2 glow (20% opacity), Selection = #0066CC (2px outline)
   * Cascade highlight = #FF9800 (orange warning) for elements that will be deleted due to dependencies
   */
  private resolvePointStyle(
    point: Point2D,
    isSelected: boolean,
    isHovered: boolean,
    isSnapTarget: boolean,
    activePlaneId?: string,
    isCascadeHighlighted?: boolean
  ): ResolvedStyle {
    // Base colors by point type
    let fill: string;
    let stroke: string;
    let strokeWidth: number;

    if (isCascadeHighlighted) {
      // Cascade delete preview: Orange warning color (highest priority except snap)
      fill = '#FF9800'; // Orange
      stroke = '#F57C00'; // Darker orange
      strokeWidth = 2.5;
    } else if (isSnapTarget) {
      fill = '#FFA500'; // Orange for snap targets
      stroke = '#FF8C00';
      strokeWidth = 2;
    } else if (isSelected) {
      // Selection highlight: Bold blue outline per ui-spec.md
      fill = point instanceof FreePoint2D ? '#4A90E2' : '#E94E77';
      stroke = '#0066CC';
      strokeWidth = 2;
    } else if (isHovered) {
      // Hover highlight: Lighter blue glow per ui-spec.md
      fill = point instanceof FreePoint2D ? '#6BB6FF' : '#FF6B9D';
      stroke = '#4A90E2';
      strokeWidth = 1.5;
    } else {
      // Normal state
      fill = point instanceof FreePoint2D ? '#4A90E2' : '#E94E77';
      stroke = '#333333';
      strokeWidth = 1.5;
    }

    // FR-002: Active plane visual emphasis - 50% opacity for inactive planes
    const opacity = (activePlaneId && point.planeId !== activePlaneId) ? 0.5 : 1.0;

    // Active plane boost: +100 to z-index to render on top of inactive plane elements
    const zIndexBoost = (activePlaneId && point.planeId === activePlaneId) ? 100 : 0;

    return {
      stroke,
      strokeWidth,
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
    // Check hover/selection state (prefer new fields, fallback to legacy highlightedEntityIds)
    const isHovered = context.hoveredIds?.has(line.id!) || false;
    const isSelected = context.selectedIds?.has(line.id!) || false;
    const isCascadeHighlighted = context.cascadeHighlightIds?.has(line.id!) || false;
    const isHighlighted = isSelected || isHovered || context.highlightedEntityIds?.has(line.id!) || false;

    // Transform point on line (includes translation)
    const paperPoint = realization.point1.clone().applyMatrix3(planeToPaperMatrix);
    
    // Transform direction vector (NO translation - direction is invariant under translation)
    // For direction vectors, we only apply rotation/scale part of matrix
    const paperDirection = realization.getDirection().applyMatrix3(planeToPaperMatrix);

    // Resolve visual style
    const style = this.resolveLineStyle(line, isSelected, isHovered, context.activePlaneId, isCascadeHighlighted);

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
   * Per ui-spec.md: Hover = #4A90E2 glow (lighter), Selection = #0066CC (bold)
   */
  private resolveLineStyle(
    line: Line2D,
    isSelected: boolean,
    isHovered: boolean,
    activePlaneId?: string,
    isCascadeHighlighted?: boolean
  ): ResolvedStyle {
    let stroke: string;
    let strokeWidth: number;

    if (isCascadeHighlighted) {
      // Cascade delete preview: Orange warning color
      stroke = '#FF9800'; // Orange
      strokeWidth = 2.5;
    } else if (isSelected) {
      stroke = '#0066CC'; // Bold blue for selection
      strokeWidth = 2;
    } else if (isHovered) {
      stroke = '#4A90E2'; // Lighter blue for hover
      strokeWidth = 1.8;
    } else {
      stroke = '#333333';
      strokeWidth = 1.5;
    }

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
   * Phase 22.5: Uses Line2DRealization2D with point1/point2 set
   */
  private segmentToPrimitive(
    segment: Segment2D,
    realization: Line2DRealization2D,
    planeToPaperMatrix: Matrix3,
    context: PrimitiveContext
  ): SegmentPrimitive {
    if (!segment.id) {
      console.error('[PaperService] Segment missing ID:', segment);
      throw new Error('Segment must have an ID');
    }
    
    // Phase 22.5: Verify segment realization has endpoints
    if (!realization.point1 || !realization.point2) {
      console.error('[PaperService] Segment realization missing endpoints:', segment.id);
      throw new Error('Segment realization must have point1 and point2');
    }
    
    // Check hover/selection state
    const isHovered = context.hoveredIds?.has(segment.id) || false;
    const isSelected = context.selectedIds?.has(segment.id) || false;
    const isCascadeHighlighted = context.cascadeHighlightIds?.has(segment.id) || false;

    // Transform both endpoints from plane <u,v> to paper coordinates
    const paperPoint1 = realization.point1.clone().applyMatrix3(planeToPaperMatrix);
    const paperPoint2 = realization.point2.clone().applyMatrix3(planeToPaperMatrix);

    // Resolve visual style
    const style = this.resolveSegmentStyle(segment, isSelected, isHovered, context.activePlaneId, isCascadeHighlighted);

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
   * Per ui-spec.md: Hover = #4A90E2 (lighter), Selection = #0066CC (bold)
   */
  private resolveSegmentStyle(
    segment: Segment2D,
    isSelected: boolean,
    isHovered: boolean,
    activePlaneId?: string,
    isCascadeHighlighted?: boolean
  ): ResolvedStyle {
    let stroke: string;
    let strokeWidth: number;

    if (isCascadeHighlighted) {
      stroke = '#FF9800'; // Orange warning
      strokeWidth = 3;
    } else if (isSelected) {
      stroke = '#0066CC'; // Bold blue for selection
      strokeWidth = 2.5;
    } else if (isHovered) {
      stroke = '#4A90E2'; // Lighter blue for hover
      strokeWidth = 2.2;
    } else {
      stroke = '#2C3E50';
      strokeWidth = 2;
    }

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
    // Check hover/selection state
    const isHovered = context.hoveredIds?.has(circle.id!) || false;
    const isSelected = context.selectedIds?.has(circle.id!) || false;
    const isCascadeHighlighted = context.cascadeHighlightIds?.has(circle.id!) || false;

    // Transform center from plane <u,v> to paper coordinates
    const paperCenter = realization.center.clone().applyMatrix3(planeToPaperMatrix);

    // Transform radius vector to get paper-space radius
    // Apply matrix to radius vector, then get length
    const paperRadiusVector = realization.radiusVector.clone().applyMatrix3(planeToPaperMatrix);
    const paperRadius = paperRadiusVector.length();

    // Resolve visual style
    const style = this.resolveCircleStyle(circle, isSelected, isHovered, context.activePlaneId, isCascadeHighlighted);

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
   * Per ui-spec.md: Hover = #4A90E2 (lighter), Selection = #0066CC (bold)
   */
  private resolveCircleStyle(
    circle: Circle2D,
    isSelected: boolean,
    isHovered: boolean,
    activePlaneId?: string,
    isCascadeHighlighted?: boolean
  ): ResolvedStyle {
    let stroke: string;
    let strokeWidth: number;

    if (isCascadeHighlighted) {
      stroke = '#FF9800'; // Orange warning
      strokeWidth = 2.5;
    } else if (isSelected) {
      stroke = '#0066CC'; // Bold blue for selection
      strokeWidth = 2;
    } else if (isHovered) {
      stroke = '#4A90E2'; // Lighter blue for hover
      strokeWidth = 1.8;
    } else {
      stroke = '#333333';
      strokeWidth = 1.5;
    }

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
   * Convert a Guide2D or SiblingGuide2D + realization to a LinePrimitive
   * Guides are rendered as dashed lines extending to viewport edges
   * Applies plane-to-paper transformation
   * 
   * Both Guide2D and SiblingGuide2D render identically - as dashed purple lines.
   * The distinction is semantic (primary vs sibling), not visual.
   * 
   * NOTE: Uses Line2DRealization2D per architectural principle - guides are
   * geometrically just lines with special rendering. Type distinction happens
   * at domain level (Guide2D vs Line2D), not realization level.
   */
  private guideToPrimitive(
    guide: Guide2D | SiblingGuide2D,
    realization: Line2DRealization2D,
    planeToPaperMatrix: Matrix3,
    context: PrimitiveContext
  ): LinePrimitive {
    // Check hover/selection state
    const isHovered = context.hoveredIds?.has(guide.id!) || false;
    const isSelected = context.selectedIds?.has(guide.id!) || false;
    const isCascadeHighlighted = context.cascadeHighlightIds?.has(guide.id!) || false;

    // Transform point on guide (includes translation)
    const paperPoint = realization.point1.clone().applyMatrix3(planeToPaperMatrix);
    
    // Transform direction vector (NO translation - direction is invariant under translation)
    const paperDirection = realization.getDirection().applyMatrix3(planeToPaperMatrix);

    // Resolve visual style (dashed line)
    const style = this.resolveGuideStyle(guide, isSelected, isHovered, context.activePlaneId, isCascadeHighlighted);

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
   * Resolve visual style for a guide (primary or sibling)
   * Guides render as dashed lines with distinct color
   * FR-002: Guides always 100% opacity (belong to all planes)
   * Per ui-spec.md: Hover = lighter purple, Selection = #0066CC
   */
  private resolveGuideStyle(
    _guide: Guide2D | SiblingGuide2D,  // Reserved for future style inheritance
    isSelected: boolean,
    isHovered: boolean,
    _activePlaneId?: string,  // Ignored - guides always 100% opacity
    isCascadeHighlighted?: boolean
  ): ResolvedStyle {
    let stroke: string;
    let strokeWidth: number;

    if (isCascadeHighlighted) {
      stroke = '#FF9800'; // Orange warning
      strokeWidth = 2.5;
    } else if (isSelected) {
      stroke = '#0066CC'; // Bold blue for selection
      strokeWidth = 2;
    } else if (isHovered) {
      stroke = '#BA68C8'; // Lighter purple for hover
      strokeWidth = 1.8;
    } else {
      stroke = '#9C27B0'; // Purple for guides
      strokeWidth = 1.5;
    }

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
    // Check hover/selection state (prefer new fields, fallback to legacy highlightedEntityIds)
    const isHovered = context.hoveredIds?.has(hingeLine.id) || false;
    const isSelected = context.selectedIds?.has(hingeLine.id) || false;
    const isHighlighted = isSelected || isHovered || context.highlightedEntityIds?.has(hingeLine.id) || false;

    // Transform point on hinge line (includes translation)
    const paperPoint = realization.point1.clone().applyMatrix3(planeToPaperMatrix);
    
    // Transform direction vector (NO translation - direction is invariant under translation)
    const paperDirection = realization.getDirection().applyMatrix3(planeToPaperMatrix);

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
    // Check hover/selection state (prefer new fields, fallback to legacy highlightedEntityIds)
    const isHovered = context.hoveredIds?.has(halfHinge.id) || false;
    const isSelected = context.selectedIds?.has(halfHinge.id) || false;
    const isHighlighted = isSelected || isHovered || context.highlightedEntityIds?.has(halfHinge.id) || false;

    // Transform point on hinge line (includes translation)
    const paperPoint = realization.point1.clone().applyMatrix3(planeToPaperMatrix);
    
    // Transform direction vector (NO translation - direction is invariant under translation)
    const paperDirection = realization.getDirection().applyMatrix3(planeToPaperMatrix);

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

    // Find the entity by searching through planes
    for (const plane of context.world.projectionPlanes.values()) {
      const point = plane.getPoint(entityId);
      if (point) {
        const realization = plane.realizePoint2D(point, context.world);
        const transform = context.planeTransforms.get(point.planeId!);
        
        if (realization && transform) {
          const primitive = this.pointToPrimitive(point, realization, transform, context);
          paper.setPrimitive(primitive);
        }
        return;
      }

      // TODO: Handle other element types (lines, circles)
    }
  }
}

/**
 * SVGRenderer - Converts Paper primitives to SVG elements
 * 
 * This renderer applies viewport transformation (pan/zoom) to primitives
 * in paper coordinate system and generates final SVG elements.
 * 
 * Pipeline:
 * Paper primitives (paper coords) → Viewport transform → Canvas coords → SVG
 * 
 * Note: Plane-to-paper transformation is already applied when generating primitives.
 * This renderer only handles viewport transformation (pan/zoom).
 * 
 * Responsibilities:
 * - Apply viewport transformation to primitive coordinates
 * - Convert primitives to SVG element attributes
 * - Handle coordinate transformations for different primitive types
 * 
 * @see specs/001-dihedral-learning-mvp/data-model.md#coordinate-transformations
 */

import { Vector3 } from 'three';
import { vec3 } from '../utils/threeUtils';

import type {
  Primitive,
  PointPrimitive,
  PathPrimitive,
  LinePrimitive,
  CirclePrimitive,
  ArcPrimitive,
  TextPrimitive,
} from '../domain/presentation/Paper';

/**
 * SVG element attributes ready for rendering
 */
export interface SVGAttributes {
  [key: string]: string | number;
}

/**
 * Viewport transformation parameters
 */
export interface ViewportTransform {
  zoom: number;                     // Zoom level (1.0 = 100%)
  panX: number;                     // Pan offset X in paper space
  panY: number;                     // Pan offset Y in paper space
}

/**
 * Renderer for converting Paper primitives to SVG
 */
export class SVGRenderer {
  /**
   * Transform a point from paper space to canvas coordinates
   * Forward: paper coords → screen coords
   * Applies viewport transformation (pan + zoom)
   */
  transformPoint(
    point: Vector3,
    viewport: ViewportTransform
  ): Vector3 {
    // Apply viewport transformation: pan then zoom
    const finalX = (point.x + viewport.panX) * viewport.zoom;
    const finalY = (point.y + viewport.panY) * viewport.zoom;

    return vec3(finalX, finalY);
  }

  /**
   * Transform a point from canvas coordinates to paper space
   * Inverse: screen coords → paper coords
   * Used for mouse input processing
   */
  inverseTransformPoint(
    point: Vector3,
    viewport: ViewportTransform
  ): Vector3 {
    // Reverse viewport transformation: un-zoom then un-pan
    const paperX = point.x / viewport.zoom - viewport.panX;
    const paperY = point.y / viewport.zoom - viewport.panY;

    return vec3(paperX, paperY);
  }

  /**
   * Render a PointPrimitive to SVG circle attributes
   */
  private renderPoint(
    primitive: PointPrimitive,
    viewport: ViewportTransform
  ): SVGAttributes {
    // Transform Vector3 position from paper space to canvas space
    const canvasPos = this.transformPoint(
      primitive.position,
      viewport
    );

    return {
      cx: canvasPos.x,
      cy: canvasPos.y,
      r: primitive.radius,
      fill: primitive.style.fill,
      stroke: primitive.style.stroke,
      'stroke-width': primitive.style.strokeWidth,
      opacity: primitive.style.opacity,
      'data-primitive-id': primitive.id,
      'data-entity-id': primitive.sourceEntityId || 'unknown',
    };
  }

  /**
   * Render a PathPrimitive to SVG path attributes
   */
  private renderPath(
    primitive: PathPrimitive,
    viewport: ViewportTransform
  ): SVGAttributes {
    if (primitive.points.length === 0) {
      return { d: '' };
    }

    // Transform all points
    const transformedPoints = primitive.points.map(([x, y]) =>
      this.transformPoint(vec3(x, y), viewport)
    );

    // Build SVG path data
    let pathData = `M ${transformedPoints[0].x} ${transformedPoints[0].y}`;
    for (let i = 1; i < transformedPoints.length; i++) {
      pathData += ` L ${transformedPoints[i].x} ${transformedPoints[i].y}`;
    }
    if (primitive.closed) {
      pathData += ' Z';
    }

    return {
      d: pathData,
      fill: primitive.closed ? primitive.style.fill : 'none',
      stroke: primitive.style.stroke,
      'stroke-width': primitive.style.strokeWidth,
      'stroke-dasharray': this.getStrokeDashArray(primitive.style.strokeStyle),
      opacity: primitive.style.opacity,
      'data-primitive-id': primitive.id,
      'data-entity-id': primitive.sourceEntityId || 'unknown',
    };
  }

  /**
   * Render a CirclePrimitive to SVG circle attributes
   */
  private renderCircle(
    primitive: CirclePrimitive,
    viewport: ViewportTransform
  ): SVGAttributes {
    const canvasPos = this.transformPoint(
      vec3(primitive.cx, primitive.cy),
      viewport
    );

    // Transform radius (affected by zoom)
    const radius = primitive.radius * viewport.zoom;

    return {
      cx: canvasPos.x,
      cy: canvasPos.y,
      r: radius,
      fill: primitive.style.fill,
      stroke: primitive.style.stroke,
      'stroke-width': primitive.style.strokeWidth,
      'stroke-dasharray': this.getStrokeDashArray(primitive.style.strokeStyle),
      opacity: primitive.style.opacity,
      'data-primitive-id': primitive.id,
      'data-entity-id': primitive.sourceEntityId || 'unknown',
    };
  }

  /**
   * Render a LinePrimitive to SVG line element
   * 
   * Line in parametric form: P(t) = point + t * direction (in paper space)
   * Clip line to viewport bounds by finding t values where line intersects viewport edges
   * 
   * Algorithm:
   * 1. Apply viewport transform to point and direction
   * 2. Compute viewport bounding box
   * 3. Find t values where line intersects viewport edges
   * 4. Render line segment between intersection points
   */
  private renderLine(
    primitive: LinePrimitive,
    viewport: ViewportTransform
  ): SVGAttributes {
    // Transform point from paper space to canvas space (Vector3 stays as Vector3)
    const canvasPoint = this.transformPoint(
      primitive.point,
      viewport
    );
    
    // Transform direction vector (scale by zoom, no pan offset)
    // Direction is invariant under translation
    const canvasDirection = {
      x: primitive.direction.x * viewport.zoom,
      y: primitive.direction.y * viewport.zoom
    };

    // Get viewport bounds (TODO: get actual canvas dimensions)
    const viewportBounds = {
      xMin: -5000,
      xMax: 5000,
      yMin: -5000,
      yMax: 5000,
    };

    // Find t values where line intersects viewport edges
    // Line: P(t) = point + t * direction
    // For each edge, solve for t
    const tValues: number[] = [];
    
    // Avoid division by zero
    const eps = 1e-10;
    
    // Left edge (x = xMin): xMin = point.x + t * direction.x
    if (Math.abs(canvasDirection.x) > eps) {
      const t = (viewportBounds.xMin - canvasPoint.x) / canvasDirection.x;
      const y = canvasPoint.y + t * canvasDirection.y;
      if (y >= viewportBounds.yMin && y <= viewportBounds.yMax) {
        tValues.push(t);
      }
    }
    
    // Right edge (x = xMax)
    if (Math.abs(canvasDirection.x) > eps) {
      const t = (viewportBounds.xMax - canvasPoint.x) / canvasDirection.x;
      const y = canvasPoint.y + t * canvasDirection.y;
      if (y >= viewportBounds.yMin && y <= viewportBounds.yMax) {
        tValues.push(t);
      }
    }
    
    // Top edge (y = yMin)
    if (Math.abs(canvasDirection.y) > eps) {
      const t = (viewportBounds.yMin - canvasPoint.y) / canvasDirection.y;
      const x = canvasPoint.x + t * canvasDirection.x;
      if (x >= viewportBounds.xMin && x <= viewportBounds.xMax) {
        tValues.push(t);
      }
    }
    
    // Bottom edge (y = yMax)
    if (Math.abs(canvasDirection.y) > eps) {
      const t = (viewportBounds.yMax - canvasPoint.y) / canvasDirection.y;
      const x = canvasPoint.x + t * canvasDirection.x;
      if (x >= viewportBounds.xMin && x <= viewportBounds.xMax) {
        tValues.push(t);
      }
    }

    // Need at least 2 intersection points
    if (tValues.length < 2) {
      // Line doesn't intersect viewport - return invisible line
      return {
        x1: 0,
        y1: 0,
        x2: 0,
        y2: 0,
        stroke: 'none',
        'data-primitive-id': primitive.id,
        'data-entity-id': primitive.sourceEntityId || 'unknown',
      };
    }

    // Sort t values and use first two (handles case where line intersects corners)
    tValues.sort((a, b) => a - b);
    const t1 = tValues[0];
    const t2 = tValues[tValues.length - 1];
    
    // Compute endpoints
    const p1 = {
      x: canvasPoint.x + t1 * canvasDirection.x,
      y: canvasPoint.y + t1 * canvasDirection.y
    };
    const p2 = {
      x: canvasPoint.x + t2 * canvasDirection.x,
      y: canvasPoint.y + t2 * canvasDirection.y
    };

    // Render line segment
    return {
      x1: p1.x,
      y1: p1.y,
      x2: p2.x,
      y2: p2.y,
      stroke: primitive.style.stroke,
      'stroke-width': primitive.style.strokeWidth,
      'stroke-dasharray': this.getStrokeDashArray(primitive.style.strokeStyle),
      opacity: primitive.style.opacity,
      'data-primitive-id': primitive.id,
      'data-entity-id': primitive.sourceEntityId || 'unknown',
    };
  }

  /**
   * Render an ArcPrimitive to SVG path attributes
   */
  private renderArc(
    primitive: ArcPrimitive,
    viewport: ViewportTransform
  ): SVGAttributes {
    const center = this.transformPoint(
      vec3(primitive.cx, primitive.cy),
      viewport
    );

    // Transform radius
    const radius = primitive.radius * viewport.zoom;

    // Calculate start and end points
    const startX = center.x + radius * Math.cos(primitive.startAngle);
    const startY = center.y + radius * Math.sin(primitive.startAngle);
    const endX = center.x + radius * Math.cos(primitive.endAngle);
    const endY = center.y + radius * Math.sin(primitive.endAngle);

    // Build SVG arc path
    const largeArcFlag = primitive.largeArc ? 1 : 0;
    const sweepFlag = primitive.sweep ? 1 : 0;
    const pathData = `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${endX} ${endY}`;

    return {
      d: pathData,
      fill: 'none',
      stroke: primitive.style.stroke,
      'stroke-width': primitive.style.strokeWidth,
      'stroke-dasharray': this.getStrokeDashArray(primitive.style.strokeStyle),
      opacity: primitive.style.opacity,
      'data-primitive-id': primitive.id,
      'data-entity-id': primitive.sourceEntityId || 'unknown',
    };
  }

  /**
   * Render a TextPrimitive to SVG text attributes
   */
  private renderText(
    primitive: TextPrimitive,
    viewport: ViewportTransform
  ): SVGAttributes {
    const canvasPos = this.transformPoint(
      vec3(primitive.x, primitive.y),
      viewport
    );

    return {
      x: canvasPos.x,
      y: canvasPos.y,
      'text-anchor': primitive.anchor,
      'font-size': primitive.fontSize,
      fill: primitive.style.fill,
      opacity: primitive.style.opacity,
      'data-primitive-id': primitive.id,
      'data-entity-id': primitive.sourceEntityId || 'unknown',
      textContent: primitive.text,
    };
  }

  /**
   * Convert stroke style to SVG dasharray
   */
  private getStrokeDashArray(style: 'solid' | 'dashed' | 'dotted'): string {
    switch (style) {
      case 'dashed':
        return '5,5';
      case 'dotted':
        return '2,2';
      default:
        return 'none';
    }
  }

  /**
   * Render a primitive to SVG attributes
   */
  renderPrimitive(
    primitive: Primitive,
    viewport: ViewportTransform
  ): { element: string; attributes: SVGAttributes } {
    switch (primitive.type) {
      case 'point':
        return { element: 'circle', attributes: this.renderPoint(primitive, viewport) };
      case 'path':
        return { element: 'path', attributes: this.renderPath(primitive, viewport) };
      case 'line':
        return { element: 'line', attributes: this.renderLine(primitive, viewport) };
      case 'circle':
        return { element: 'circle', attributes: this.renderCircle(primitive, viewport) };
      case 'arc':
        return { element: 'path', attributes: this.renderArc(primitive, viewport) };
      case 'text':
        return { element: 'text', attributes: this.renderText(primitive, viewport) };
    }
  }

  /**
   * Render all primitives from a Paper to SVG attributes
   */
  renderPaper(
    primitives: Primitive[],
    viewport: ViewportTransform
  ): Array<{ element: string; attributes: SVGAttributes }> {
    return primitives
      .filter(p => p.visible)
      .map(p => this.renderPrimitive(p, viewport));
  }
}

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
    const canvasPos = this.transformPoint(
      vec3(primitive.x, primitive.y),
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
   * Line equation: ax + by + c = 0 (in paper space)
   * Clip line to viewport bounds and render as SVG line segment
   * 
   * Algorithm:
   * 1. Apply viewport transform to line equation
   * 2. Compute viewport bounding box
   * 3. Find intersection points with viewport edges
   * 4. Render line segment between intersection points
   */
  private renderLine(
    primitive: LinePrimitive,
    viewport: ViewportTransform
  ): SVGAttributes {
    // Transform line equation from paper space to canvas space
    // Line in paper: a·x_p + b·y_p + c = 0
    // With viewport transform: x_c = (x_p + panX) * zoom, y_c = (y_p + panY) * zoom
    // Inverse: x_p = x_c/zoom - panX, y_p = y_c/zoom - panY
    // Substitute into line equation:
    // a·(x_c/zoom - panX) + b·(y_c/zoom - panY) + c = 0
    // (a/zoom)·x_c + (b/zoom)·y_c + (c - a·panX - b·panY) = 0
    // Multiply by zoom: a·x_c + b·y_c + zoom·(c - a·panX - b·panY) = 0
    
    const a = primitive.a;
    const b = primitive.b;
    const c_canvas = viewport.zoom * (primitive.c - primitive.a * viewport.panX - primitive.b * viewport.panY);

    // Get viewport bounds (assume canvas size, will be clipped by SVG viewBox)
    // For now, use large bounds - TODO: get actual canvas dimensions
    const viewportBounds = {
      xMin: -5000,
      xMax: 5000,
      yMin: -5000,
      yMax: 5000,
    };

    // Find intersection points with viewport edges
    // Line: a·x + b·y + c = 0
    // Solve for intersections with each edge
    const intersections: Array<[number, number]> = [];

    // Check if line is more horizontal or vertical
    if (Math.abs(a) > Math.abs(b)) {
      // More vertical - intersect with top and bottom edges
      // Top edge (y = yMin): x = -(b·yMin + c) / a
      if (Math.abs(a) > 1e-10) {
        const xTop = -(b * viewportBounds.yMin + c_canvas) / a;
        if (xTop >= viewportBounds.xMin && xTop <= viewportBounds.xMax) {
          intersections.push([xTop, viewportBounds.yMin]);
        }
        // Bottom edge (y = yMax)
        const xBottom = -(b * viewportBounds.yMax + c_canvas) / a;
        if (xBottom >= viewportBounds.xMin && xBottom <= viewportBounds.xMax) {
          intersections.push([xBottom, viewportBounds.yMax]);
        }
      }
    } else {
      // More horizontal - intersect with left and right edges
      // Left edge (x = xMin): y = -(a·xMin + c) / b
      if (Math.abs(b) > 1e-10) {
        const yLeft = -(a * viewportBounds.xMin + c_canvas) / b;
        if (yLeft >= viewportBounds.yMin && yLeft <= viewportBounds.yMax) {
          intersections.push([viewportBounds.xMin, yLeft]);
        }
        // Right edge (x = xMax)
        const yRight = -(a * viewportBounds.xMax + c_canvas) / b;
        if (yRight >= viewportBounds.yMin && yRight <= viewportBounds.yMax) {
          intersections.push([viewportBounds.xMax, yRight]);
        }
      }
    }

    // Need at least 2 intersection points
    if (intersections.length < 2) {
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

    // Render line segment between first two intersection points
    return {
      x1: intersections[0][0],
      y1: intersections[0][1],
      x2: intersections[1][0],
      y2: intersections[1][1],
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

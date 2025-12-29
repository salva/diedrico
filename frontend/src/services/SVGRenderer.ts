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

import type {
  Primitive,
  PointPrimitive,
  PathPrimitive,
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
   * Applies viewport transformation (pan + zoom)
   */
  private transformPoint(
    x: number,
    y: number,
    viewport: ViewportTransform
  ): [number, number] {
    // Apply viewport transformation: pan then zoom
    const finalX = (x + viewport.panX) * viewport.zoom;
    const finalY = (y + viewport.panY) * viewport.zoom;

    return [finalX, finalY];
  }

  /**
   * Render a PointPrimitive to SVG circle attributes
   */
  private renderPoint(
    primitive: PointPrimitive,
    viewport: ViewportTransform
  ): SVGAttributes {
    const [cx, cy] = this.transformPoint(
      primitive.x,
      primitive.y,
      viewport
    );

    return {
      cx,
      cy,
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
      this.transformPoint(x, y, viewport)
    );

    // Build SVG path data
    let pathData = `M ${transformedPoints[0][0]} ${transformedPoints[0][1]}`;
    for (let i = 1; i < transformedPoints.length; i++) {
      pathData += ` L ${transformedPoints[i][0]} ${transformedPoints[i][1]}`;
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
    const [cx, cy] = this.transformPoint(
      primitive.cx,
      primitive.cy,
      viewport
    );

    // Transform radius (affected by zoom)
    const radius = primitive.radius * viewport.zoom;

    return {
      cx,
      cy,
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
   * Render an ArcPrimitive to SVG path attributes
   */
  private renderArc(
    primitive: ArcPrimitive,
    viewport: ViewportTransform
  ): SVGAttributes {
    const [cx, cy] = this.transformPoint(
      primitive.cx,
      primitive.cy,
      viewport
    );

    // Transform radius
    const radius = primitive.radius * viewport.zoom;

    // Calculate start and end points
    const startX = cx + radius * Math.cos(primitive.startAngle);
    const startY = cy + radius * Math.sin(primitive.startAngle);
    const endX = cx + radius * Math.cos(primitive.endAngle);
    const endY = cy + radius * Math.sin(primitive.endAngle);

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
    const [x, y] = this.transformPoint(
      primitive.x,
      primitive.y,
      viewport
    );

    return {
      x,
      y,
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

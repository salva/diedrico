import { Vector3 } from 'three';
import { vec3 } from '@/utils/threeUtils';

import type {
  ArcPrimitive,
  CirclePrimitive,
  LinePrimitive,
  PathPrimitive,
  PointPrimitive,
  Primitive,
  SegmentPrimitive,
  TextPrimitive,
  ViewportTransform,
} from '@/domain/presentation/Paper';

export interface SVGAttributes {
  [key: string]: string | number;
}

export interface SvgPoint {
  readonly x: number;
  readonly y: number;
}

export function transformSvgPoint(point: SvgPoint, viewport: ViewportTransform): SvgPoint {
  return {
    x: (point.x + viewport.panX) * viewport.zoom,
    y: (point.y + viewport.panY) * viewport.zoom,
  };
}

export function inverseTransformSvgPoint(point: SvgPoint, viewport: ViewportTransform): SvgPoint {
  return {
    x: point.x / viewport.zoom - viewport.panX,
    y: point.y / viewport.zoom - viewport.panY,
  };
}

function transformVector(point: Vector3, viewport: ViewportTransform): Vector3 {
  const transformed = transformSvgPoint(point, viewport);
  return vec3(transformed.x, transformed.y);
}

function renderPoint(primitive: PointPrimitive, viewport: ViewportTransform): SVGAttributes {
  const canvasPos = transformVector(primitive.position, viewport);

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

function renderPath(primitive: PathPrimitive, viewport: ViewportTransform): SVGAttributes {
  if (primitive.points.length === 0) {
    return { d: '' };
  }

  const transformedPoints = primitive.points.map(([x, y]) => transformSvgPoint({ x, y }, viewport));

  let pathData: string;
  if (transformedPoints.length === 3 && !primitive.closed) {
    const [start, control, end] = transformedPoints;
    pathData = `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`;
  } else {
    pathData = `M ${transformedPoints[0].x} ${transformedPoints[0].y}`;
    for (let i = 1; i < transformedPoints.length; i++) {
      pathData += ` L ${transformedPoints[i].x} ${transformedPoints[i].y}`;
    }
    if (primitive.closed) {
      pathData += ' Z';
    }
  }

  return {
    d: pathData,
    fill: primitive.closed ? primitive.style.fill : 'none',
    stroke: primitive.style.stroke,
    'stroke-width': primitive.style.strokeWidth,
    'stroke-dasharray': getStrokeDashArray(primitive.style.strokeStyle),
    opacity: primitive.style.opacity,
    'data-primitive-id': primitive.id,
    'data-entity-id': primitive.sourceEntityId || 'unknown',
  };
}

function renderCircle(primitive: CirclePrimitive, viewport: ViewportTransform): SVGAttributes {
  const canvasPos = transformSvgPoint({ x: primitive.cx, y: primitive.cy }, viewport);

  return {
    cx: canvasPos.x,
    cy: canvasPos.y,
    r: primitive.radius * viewport.zoom,
    fill: primitive.style.fill,
    stroke: primitive.style.stroke,
    'stroke-width': primitive.style.strokeWidth,
    'stroke-dasharray': getStrokeDashArray(primitive.style.strokeStyle),
    opacity: primitive.style.opacity,
    'data-primitive-id': primitive.id,
    'data-entity-id': primitive.sourceEntityId || 'unknown',
  };
}

function renderLine(
  primitive: LinePrimitive,
  viewport: ViewportTransform,
  bounds: { width: number; height: number },
): SVGAttributes {
  const canvasPoint = transformVector(primitive.point, viewport);
  const canvasDirection = {
    x: primitive.direction.x * viewport.zoom,
    y: primitive.direction.y * viewport.zoom,
  };

  const margin = Math.max(bounds.width, bounds.height);
  const viewportBounds = {
    xMin: -margin,
    xMax: bounds.width + margin,
    yMin: -margin,
    yMax: bounds.height + margin,
  };

  const tValues: number[] = [];
  const eps = 1e-10;

  if (Math.abs(canvasDirection.x) > eps) {
    const leftT = (viewportBounds.xMin - canvasPoint.x) / canvasDirection.x;
    const leftY = canvasPoint.y + leftT * canvasDirection.y;
    if (leftY >= viewportBounds.yMin && leftY <= viewportBounds.yMax) {
      tValues.push(leftT);
    }

    const rightT = (viewportBounds.xMax - canvasPoint.x) / canvasDirection.x;
    const rightY = canvasPoint.y + rightT * canvasDirection.y;
    if (rightY >= viewportBounds.yMin && rightY <= viewportBounds.yMax) {
      tValues.push(rightT);
    }
  }

  if (Math.abs(canvasDirection.y) > eps) {
    const topT = (viewportBounds.yMin - canvasPoint.y) / canvasDirection.y;
    const topX = canvasPoint.x + topT * canvasDirection.x;
    if (topX >= viewportBounds.xMin && topX <= viewportBounds.xMax) {
      tValues.push(topT);
    }

    const bottomT = (viewportBounds.yMax - canvasPoint.y) / canvasDirection.y;
    const bottomX = canvasPoint.x + bottomT * canvasDirection.x;
    if (bottomX >= viewportBounds.xMin && bottomX <= viewportBounds.xMax) {
      tValues.push(bottomT);
    }
  }

  if (tValues.length < 2) {
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

  tValues.sort((a, b) => a - b);
  const t1 = tValues[0];
  const t2 = tValues[tValues.length - 1];
  const p1 = {
    x: canvasPoint.x + t1 * canvasDirection.x,
    y: canvasPoint.y + t1 * canvasDirection.y,
  };
  const p2 = {
    x: canvasPoint.x + t2 * canvasDirection.x,
    y: canvasPoint.y + t2 * canvasDirection.y,
  };

  return {
    x1: p1.x,
    y1: p1.y,
    x2: p2.x,
    y2: p2.y,
    stroke: primitive.style.stroke,
    'stroke-width': primitive.style.strokeWidth,
    'stroke-dasharray': getStrokeDashArray(primitive.style.strokeStyle),
    opacity: primitive.style.opacity,
    'data-primitive-id': primitive.id,
    'data-entity-id': primitive.sourceEntityId || 'unknown',
  };
}

function renderSegment(primitive: SegmentPrimitive, viewport: ViewportTransform): SVGAttributes {
  const p1Canvas = transformVector(primitive.point1, viewport);
  const p2Canvas = transformVector(primitive.point2, viewport);

  return {
    x1: p1Canvas.x,
    y1: p1Canvas.y,
    x2: p2Canvas.x,
    y2: p2Canvas.y,
    stroke: primitive.style.stroke,
    'stroke-width': primitive.style.strokeWidth,
    'stroke-dasharray': getStrokeDashArray(primitive.style.strokeStyle),
    opacity: primitive.style.opacity,
    'data-primitive-id': primitive.id,
    'data-entity-id': primitive.sourceEntityId || 'unknown',
  };
}

function renderArc(primitive: ArcPrimitive, viewport: ViewportTransform): SVGAttributes {
  const center = transformSvgPoint({ x: primitive.cx, y: primitive.cy }, viewport);
  const radius = primitive.radius * viewport.zoom;
  const startX = center.x + radius * Math.cos(primitive.startAngle);
  const startY = center.y + radius * Math.sin(primitive.startAngle);
  const endX = center.x + radius * Math.cos(primitive.endAngle);
  const endY = center.y + radius * Math.sin(primitive.endAngle);
  const largeArcFlag = primitive.largeArc ? 1 : 0;
  const sweepFlag = primitive.sweep ? 1 : 0;

  return {
    d: `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${endX} ${endY}`,
    fill: 'none',
    stroke: primitive.style.stroke,
    'stroke-width': primitive.style.strokeWidth,
    'stroke-dasharray': getStrokeDashArray(primitive.style.strokeStyle),
    opacity: primitive.style.opacity,
    'data-primitive-id': primitive.id,
    'data-entity-id': primitive.sourceEntityId || 'unknown',
  };
}

function renderText(primitive: TextPrimitive, viewport: ViewportTransform): SVGAttributes {
  const canvasPos = transformSvgPoint({ x: primitive.x, y: primitive.y }, viewport);

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

function getStrokeDashArray(style: 'solid' | 'dashed' | 'dotted'): string {
  switch (style) {
    case 'dashed':
      return '5,5';
    case 'dotted':
      return '2,2';
    default:
      return 'none';
  }
}

export function renderPrimitive(
  primitive: Primitive,
  viewport: ViewportTransform,
  bounds: { width: number; height: number } = { width: 1600, height: 1000 },
): { element: string; attributes: SVGAttributes } {
  if (primitive.type === 'point') return { element: 'circle', attributes: renderPoint(primitive, viewport) };
  if (primitive.type === 'path') return { element: 'path', attributes: renderPath(primitive, viewport) };
  if (primitive.type === 'line') return { element: 'line', attributes: renderLine(primitive, viewport, bounds) };
  if (primitive.type === 'segment') return { element: 'line', attributes: renderSegment(primitive, viewport) };
  if (primitive.type === 'circle') return { element: 'circle', attributes: renderCircle(primitive, viewport) };
  if (primitive.type === 'arc') return { element: 'path', attributes: renderArc(primitive, viewport) };
  if (primitive.type === 'text') return { element: 'text', attributes: renderText(primitive, viewport) };

  const _exhaustive: never = primitive;
  throw new Error(`Unhandled primitive type: ${(_exhaustive as any).type}`);
}

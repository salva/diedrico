import type { Primitive } from '@/domain/presentation/Paper';
import { SVGRenderer, type SVGAttributes } from '@/rendering/svg/SVGRenderer';
import type { ViewportTransform } from './CanvasCoordinateConverter';

const renderer = new SVGRenderer();

export interface RenderedCanvasPrimitive {
  readonly primitive: Primitive;
  readonly attrs: SVGAttributes;
}

export function renderCanvasPrimitive(
  primitive: Primitive,
  viewport: ViewportTransform,
  bounds: { width: number; height: number },
): RenderedCanvasPrimitive {
  const result = renderer.renderPrimitive(primitive, viewport, bounds);
  return { primitive, attrs: result.attributes };
}

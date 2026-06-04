import type { CanvasRenderItem, CanvasViewportModel } from '@/application/canvasPresentation/CanvasPresentationModel';
import { inverseTransformSvgPoint as inverseTransformRendererPoint, renderPrimitive, transformSvgPoint as transformRendererPoint, type SVGAttributes } from '@/rendering/svg/SVGRenderer';
import type { CanvasPoint } from './CanvasCoordinateConverter';

export interface RenderedCanvasPrimitive {
  readonly primitive: CanvasRenderItem['primitive'];
  readonly attrs: SVGAttributes;
}

export function renderSvgPrimitive(
  item: CanvasRenderItem,
  viewport: CanvasViewportModel,
): RenderedCanvasPrimitive | null {
  if (!item.visible) return null;

  const result = renderPrimitive(item.primitive, viewport, { width: viewport.width, height: viewport.height });
  return { primitive: item.primitive, attrs: result.attributes };
}

export function transformSvgPoint(point: CanvasPoint, viewport: CanvasViewportModel): CanvasPoint {
  return transformRendererPoint(point, viewport);
}

export function inverseTransformSvgPoint(point: CanvasPoint, viewport: CanvasViewportModel): CanvasPoint {
  return inverseTransformRendererPoint(point, viewport);
}

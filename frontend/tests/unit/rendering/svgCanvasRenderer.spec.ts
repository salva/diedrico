import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { inverseTransformSvgPoint, renderSvgPrimitive, transformSvgPoint } from '@/application/canvas/CanvasSvgRendering';
import { canvasRenderItem } from '@/application/canvasPresentation/CanvasRenderItemFactory';
import { RenderLayer, type LinePrimitive } from '@/domain/presentation/Paper';

describe('SVG canvas rendering functions', () => {
  it('clips infinite lines to explicit canvas bounds instead of hidden constants', () => {
    const primitive: LinePrimitive = { type: 'line', id: 'line-l1', sourceEntityId: 'l1', layer: RenderLayer.Elements, visible: true, style: { stroke: '#000', strokeWidth: 1, strokeStyle: 'solid', fill: 'none', opacity: 1, zIndex: 1 }, point: new Vector3(50, 50, 1), direction: new Vector3(1, 0, 0) };
    const rendered = renderSvgPrimitive(canvasRenderItem(primitive, 'infinite-line'), { zoom: 1, panX: 0, panY: 0, width: 100, height: 100 });
    expect(rendered?.attrs.x1).toBe(-100);
    expect(rendered?.attrs.x2).toBe(200);
  });

  it('transforms points between paper and canvas coordinates', () => {
    const viewport = { zoom: 2, panX: 10, panY: -5, width: 100, height: 100 };
    const canvasPoint = transformSvgPoint({ x: 4, y: 8 }, viewport);

    expect(canvasPoint).toEqual({ x: 28, y: 6 });
    expect(inverseTransformSvgPoint(canvasPoint, viewport)).toEqual({ x: 4, y: 8 });
  });
});

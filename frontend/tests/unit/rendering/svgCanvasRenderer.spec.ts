import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { SVGRenderer } from '@/rendering/svg/SVGRenderer';
import { RenderLayer, type LinePrimitive } from '@/domain/presentation/Paper';

describe('SVGRenderer canvas DTO adapter', () => {
  it('clips infinite lines to explicit canvas bounds instead of hidden constants', () => {
    const renderer = new SVGRenderer();
    const primitive: LinePrimitive = { type: 'line', id: 'line-l1', sourceEntityId: 'l1', layer: RenderLayer.Elements, visible: true, style: { stroke: '#000', strokeWidth: 1, strokeStyle: 'solid', fill: 'none', opacity: 1, zIndex: 1 }, point: new Vector3(50, 50, 1), direction: new Vector3(1, 0, 0) };
    const rendered = renderer.renderPrimitive(primitive, { zoom: 1, panX: 0, panY: 0 }, { width: 100, height: 100 });
    expect(rendered.attributes.x1).toBe(-100);
    expect(rendered.attributes.x2).toBe(200);
  });
});

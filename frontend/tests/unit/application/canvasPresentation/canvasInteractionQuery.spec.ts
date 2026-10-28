import { describe, expect, it } from 'vitest';
import { Matrix3, Vector3 } from 'three';
import { CanvasInteractionQuery } from '@/application/canvasPresentation/CanvasInteractionQuery';
import type { CanvasQueryItem } from '@/application/canvasPresentation/CanvasPresentationModel';
import { SelectionMask } from '@/types/SelectionMask';

const ctx = { viewport: { zoom: 1, panX: 0, panY: 0 }, activePlaneId: 'plane-a', paperToPlaneTransform: new Matrix3().identity() };

describe('CanvasInteractionQuery', () => {
  it('filters ineligible overlapping operands before ranking', () => {
    const items: CanvasQueryItem[] = ['rejected', 'eligible'].map((id, index) => ({
      id, kind: 'infinite-line', elementId: id, elementType: 'line', planeId: 'plane-a', selectable: true,
      planeGeometry: { type: 'line', point: new Vector3(0, index, 1), direction: new Vector3(1, 0, 0) },
    }));
    expect(new CanvasInteractionQuery(items).hitTest(new Vector3(0, 0, 1), 10, ctx, SelectionMask.line(), id => id === 'eligible')?.elementId).toBe('eligible');
  });

  it('keeps finite segments finite and misses outside extents', () => {
    const item: CanvasQueryItem = { id: 'segment-s1', kind: 'finite-segment', elementId: 's1', elementType: 'segment', planeId: 'plane-a', selectable: true, planeGeometry: { type: 'segment', point1: new Vector3(0, 0, 1), point2: new Vector3(10, 0, 1) } };
    const query = new CanvasInteractionQuery([item]);
    expect(query.hitTest(new Vector3(5, 1, 1), 5, ctx)?.elementId).toBe('s1');
    expect(query.hitTest(new Vector3(50, 1, 1), 5, ctx)).toBeNull();
  });

  it('applies active-plane and selection-mask filtering', () => {
    const items: CanvasQueryItem[] = [
      { id: 'point-p1', kind: 'point', elementId: 'p1', elementType: 'point', planeId: 'plane-b', selectable: true, planeGeometry: { type: 'point', position: new Vector3(0, 0, 1), visualRadiusPixels: 5 } },
      { id: 'line-l1', kind: 'infinite-line', elementId: 'l1', elementType: 'line', planeId: 'plane-a', selectable: true, planeGeometry: { type: 'line', point: new Vector3(0, 0, 1), direction: new Vector3(1, 0, 0) } }
    ];
    const query = new CanvasInteractionQuery(items);
    expect(query.hitTest(new Vector3(0, 0, 1), 10, ctx, SelectionMask.point())).toBeNull();
    expect(query.hitTest(new Vector3(0, 0, 1), 10, ctx, SelectionMask.line())?.elementId).toBe('l1');
  });

  it('returns snap points for points, lines, circles, guides and half-hinges', () => {
    const items: CanvasQueryItem[] = [
      { id: 'guide-g1', kind: 'guide', elementId: 'g1', elementType: 'guide', planeId: 'plane-a', selectable: true, planeGeometry: { type: 'line', point: new Vector3(0, 0, 1), direction: new Vector3(0, 1, 0) } },
      { id: 'half-hinge-h1', kind: 'half-hinge-line', elementId: 'h1', elementType: 'half-hinge-line', planeId: 'plane-a', selectable: true, planeGeometry: { type: 'line', point: new Vector3(10, 0, 1), direction: new Vector3(0, 1, 0) } },
      { id: 'circle-c1', kind: 'circle', elementId: 'c1', elementType: 'circle', planeId: 'plane-a', selectable: true, planeGeometry: { type: 'circle', center: new Vector3(20, 0, 1), radius: 5 } }
    ];
    const query = new CanvasInteractionQuery(items);
    expect(query.hitTest(new Vector3(1, 4, 1), 5, ctx)?.elementId).toBe('g1');
    expect(query.hitTest(new Vector3(11, 4, 1), 5, ctx)?.elementId).toBe('h1');
    const circleHit = query.hitTest(new Vector3(25, 1, 1), 5, ctx);
    expect(circleHit?.elementId).toBe('c1');
    expect(circleHit?.snapPoint.x).toBeCloseTo(24.9, 0);
  });
});

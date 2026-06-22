import { describe, expect, it } from 'vitest';
import { Matrix3 } from 'three';
import { computeAdaptiveGridParams, selectCanvasGrid } from '@/application/canvasPresentation/CanvasGridSelector';

describe('CanvasGridSelector', () => {
  it('derives grid lines and labels from explicit plane transform and viewport DTO', () => {
    const grid = selectCanvasGrid(new Matrix3().identity(), { zoom: 1, panX: 0, panY: 0, width: 400, height: 300 });
    expect(grid.lines.length).toBeGreaterThan(0);
    expect(grid.lines[0]).toEqual(expect.objectContaining({ key: expect.any(String), x1: expect.any(Number), major: expect.any(Boolean) }));
    expect(grid.labels).toEqual(expect.objectContaining({ top: expect.any(Array), bottom: expect.any(Array), left: expect.any(Array), right: expect.any(Array) }));
    expect(grid.labels.top.map(label => label.position)).toEqual([0, 100, 200, 300, 400]);
    expect(grid.labels.bottom.map(label => label.position)).toEqual([0, 100, 200, 300, 400]);
    expect(grid.labels.left.map(label => label.position)).toEqual([0, 100, 200, 300]);
    expect(grid.labels.right.map(label => label.position)).toEqual([0, 100, 200, 300]);
  });

  it('chooses coarser spacing when zoomed out', () => {
    expect(computeAdaptiveGridParams(0.1).spacing).toBeGreaterThan(computeAdaptiveGridParams(10).spacing);
  });

  it('places labels by exact viewport-edge intersections for rotated planes', () => {
    const planeToPaper = new Matrix3().set(
      1, -1, 0,
      1, 1, 0,
      0, 0, 1,
    );
    const grid = selectCanvasGrid(planeToPaper, { zoom: 1, panX: 150, panY: 150, width: 300, height: 300 });

    expect(grid.labels.top.length).toBeGreaterThan(1);
    expect(grid.labels.bottom.length).toBeGreaterThan(1);
    expect(grid.labels.left.length).toBeGreaterThan(1);
    expect(grid.labels.right.length).toBeGreaterThan(1);
    for (const label of [...grid.labels.top, ...grid.labels.bottom]) {
      expect(label.position).toBeGreaterThanOrEqual(-10);
      expect(label.position).toBeLessThanOrEqual(310);
    }
    for (const label of [...grid.labels.left, ...grid.labels.right]) {
      expect(label.position).toBeGreaterThanOrEqual(-10);
      expect(label.position).toBeLessThanOrEqual(310);
    }
  });
});

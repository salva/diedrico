import { describe, expect, it } from 'vitest';
import { Matrix3 } from 'three';
import { computeAdaptiveGridParams, selectCanvasGrid } from '@/application/canvasPresentation/CanvasGridSelector';

describe('CanvasGridSelector', () => {
  it('derives grid lines and labels from explicit plane transform and viewport DTO', () => {
    const grid = selectCanvasGrid(new Matrix3().identity(), { zoom: 1, panX: 0, panY: 0, width: 400, height: 300 });
    expect(grid.lines.length).toBeGreaterThan(0);
    expect(grid.lines[0]).toEqual(expect.objectContaining({ key: expect.any(String), x1: expect.any(Number), major: expect.any(Boolean) }));
    expect(grid.labels).toEqual(expect.objectContaining({ top: expect.any(Array), bottom: expect.any(Array), left: expect.any(Array), right: expect.any(Array) }));
  });

  it('chooses coarser spacing when zoomed out', () => {
    expect(computeAdaptiveGridParams(0.1).spacing).toBeGreaterThan(computeAdaptiveGridParams(10).spacing);
  });
});

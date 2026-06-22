import { describe, it, expect, beforeEach } from 'vitest';
import { useViewStore } from '@/stores/viewStore';

describe('viewStore', () => {
  let viewStore: ReturnType<typeof useViewStore>;

  beforeEach(() => {
    viewStore = useViewStore();
    viewStore.setZoom(1);
    viewStore.setPan(0, 0);
  });

  it('tracks viewport state', () => {
    viewStore.setZoom(2);
    viewStore.setPan(100, 200);
    expect(viewStore.zoom.value).toBe(2);
    expect(viewStore.panX.value).toBe(100);
    expect(viewStore.panY.value).toBe(200);
    expect(viewStore.viewportState.value.zoom).toBe(2);
  });

  it('adjusts pan and clamps zoom', () => {
    viewStore.adjustPan(50, -25);
    expect(viewStore.panX.value).toBe(50);
    expect(viewStore.panY.value).toBe(-25);
    viewStore.setZoom(300);
    expect(viewStore.zoom.value).toBe(250);
    viewStore.setZoom(1);
    viewStore.adjustZoom(-0.99);
    expect(viewStore.zoom.value).toBeCloseTo(0.1);
  });

  it('toggles display flags and updates 3D options individually', () => {
    const beforeGrid = viewStore.gridVisible.value;
    viewStore.toggleGrid();
    expect(viewStore.gridVisible.value).toBe(!beforeGrid);
    const beforeProjected = viewStore.showProjectedElements.value;
    viewStore.toggleProjectedElements();
    expect(viewStore.showProjectedElements.value).toBe(!beforeProjected);
    viewStore.updateThreeViewOption('showGrid', false);
    expect(viewStore.threeViewOptions.value.showGrid).toBe(false);
  });
});

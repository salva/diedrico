import { describe, it, expect, beforeEach } from 'vitest';
import { useViewStore } from '@/stores/viewStore';

describe('viewStore', () => {
  let viewStore: ReturnType<typeof useViewStore>;

  beforeEach(() => {
    localStorage.clear();
    viewStore = useViewStore();
    viewStore.setZoom(1);
    viewStore.setPan(0, 0);
    viewStore.resetThreeViewWindow({ width: 1200, height: 800 });
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

  it('moves and clamps the 3D view window inside the canvas container', () => {
    viewStore.setThreeViewWindowBounds({ x: 100, y: 120, width: 500, height: 360 }, { width: 900, height: 700 });

    viewStore.moveThreeViewWindow(50, -30, { width: 900, height: 700 });
    expect(viewStore.threeViewWindow.value).toMatchObject({ x: 150, y: 90, width: 500, height: 360 });

    viewStore.moveThreeViewWindow(2000, 2000, { width: 900, height: 700 });
    expect(viewStore.threeViewWindow.value.x).toBe(384);
    expect(viewStore.threeViewWindow.value.y).toBe(324);
  });

  it('resizes the 3D view window with minimum and container bounds', () => {
    viewStore.setThreeViewWindowBounds({ x: 40, y: 40, width: 500, height: 360 }, { width: 900, height: 700 });

    viewStore.resizeThreeViewWindow(100, 100, { width: 900, height: 700 });
    expect(viewStore.threeViewWindow.value.width).toBe(320);
    expect(viewStore.threeViewWindow.value.height).toBe(220);

    viewStore.resizeThreeViewWindow(2000, 2000, { width: 900, height: 700 });
    expect(viewStore.threeViewWindow.value.width).toBe(868);
    expect(viewStore.threeViewWindow.value.height).toBe(668);
  });

  it('minimizes, maximizes, and restores the 3D view window', () => {
    const container = { width: 1000, height: 760 };
    const floating = { x: 80, y: 90, width: 520, height: 380 };
    viewStore.setThreeViewWindowBounds(floating, container);

    viewStore.maximizeThreeViewWindow(container);
    expect(viewStore.threeViewWindow.value.mode).toBe('maximized');
    expect(viewStore.threeViewWindow.value).toMatchObject({ x: 8, y: 8, width: 984, height: 744 });
    expect(viewStore.threeViewWindow.value.restoreBounds).toEqual(floating);

    viewStore.restoreThreeViewWindow(container);
    expect(viewStore.threeViewWindow.value).toMatchObject({ mode: 'floating', ...floating, restoreBounds: null });

    viewStore.minimizeThreeViewWindow(container);
    expect(viewStore.threeViewWindow.value.mode).toBe('minimized');
    expect(viewStore.threeViewWindow.value.height).toBe(34);
    expect(viewStore.threeViewWindow.value.restoreBounds).toEqual(floating);

    viewStore.restoreThreeViewWindow(container);
    expect(viewStore.threeViewWindow.value).toMatchObject({ mode: 'floating', ...floating, restoreBounds: null });
  });

  it('moves a minimized bar without restoring it or changing restore bounds', () => {
    const container = { width: 1000, height: 760 };
    viewStore.minimizeThreeViewWindow(container);
    const before = { ...viewStore.threeViewWindow.value };
    viewStore.moveThreeViewWindow(-30, -100, container);
    expect(viewStore.threeViewWindow.value).toMatchObject({
      mode: 'minimized', height: 34, y: before.y - 100,
      restoreBounds: before.restoreBounds,
    });
  });

  it('persists 3D view window state to localStorage', () => {
    const container = { width: 1000, height: 760 };
    viewStore.setThreeViewWindowBounds({ x: 90, y: 100, width: 540, height: 390 }, container);
    viewStore.minimizeThreeViewWindow(container);
    viewStore.saveToStorage();

    viewStore.resetThreeViewWindow(container);
    viewStore.initFromStorage();

    expect(viewStore.threeViewWindow.value.mode).toBe('minimized');
    expect(viewStore.threeViewWindow.value).toMatchObject({ x: 90, y: 710, width: 540, height: 34 });
    expect(viewStore.threeViewWindow.value.restoreBounds).toEqual({ x: 90, y: 100, width: 540, height: 390 });

    viewStore.initializeThreeViewWindow(container);
    viewStore.restoreThreeViewWindow(container);
    expect(viewStore.threeViewWindow.value).toMatchObject({ mode: 'floating', x: 90, y: 100, width: 540, height: 390 });
  });
});

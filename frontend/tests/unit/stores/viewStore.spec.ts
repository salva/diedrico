/**
 * Tests for viewStore.ts - Viewport state management
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useViewStore } from '@/stores/viewStore';

describe('viewStore', () => {
  let viewStore: ReturnType<typeof useViewStore>;

  beforeEach(() => {
    viewStore = useViewStore();
    // Reset to default state
    viewStore.resetViewport();
  });

  describe('Initial State', () => {
    it('should have default zoom of 1.0', () => {
      expect(viewStore.zoom.value).toBe(1.0);
    });

    it('should have default pan of (0, 0)', () => {
      expect(viewStore.panX.value).toBe(0);
      expect(viewStore.panY.value).toBe(0);
    });

    it('should provide viewport state object', () => {
      const state = viewStore.viewportState.value;
      expect(state).toEqual({
        zoom: 1.0,
        panX: 0,
        panY: 0,
        gridVisible: true,
        threeViewOptions: {
          showPlanes: true,
          showGrid: true,
          showLinkingVisuals: false,
          show2DElementsOnPlanes: false
        }
      });
    });
  });

  describe('setZoom', () => {
    it('should set zoom level', () => {
      viewStore.setZoom(2.0);
      expect(viewStore.zoom.value).toBe(2.0);
    });

    it('should clamp zoom to minimum 0.1', () => {
      viewStore.setZoom(0.05);
      expect(viewStore.zoom.value).toBe(0.1);
    });

    it('should clamp zoom to maximum 10', () => {
      viewStore.setZoom(15.0);
      expect(viewStore.zoom.value).toBe(10);
    });

    it('should allow zoom within range', () => {
      viewStore.setZoom(0.5);
      expect(viewStore.zoom.value).toBe(0.5);
      
      viewStore.setZoom(5.0);
      expect(viewStore.zoom.value).toBe(5.0);
    });
  });

  describe('setPan', () => {
    it('should set pan offset', () => {
      viewStore.setPan(100, 200);
      expect(viewStore.panX.value).toBe(100);
      expect(viewStore.panY.value).toBe(200);
    });

    it('should allow negative pan values', () => {
      viewStore.setPan(-50, -75);
      expect(viewStore.panX.value).toBe(-50);
      expect(viewStore.panY.value).toBe(-75);
    });

    it('should override previous pan values', () => {
      viewStore.setPan(10, 20);
      viewStore.setPan(30, 40);
      expect(viewStore.panX.value).toBe(30);
      expect(viewStore.panY.value).toBe(40);
    });
  });

  describe('adjustPan', () => {
    it('should adjust pan by delta', () => {
      viewStore.setPan(100, 100);
      viewStore.adjustPan(50, 25);
      expect(viewStore.panX.value).toBe(150);
      expect(viewStore.panY.value).toBe(125);
    });

    it('should work with negative deltas', () => {
      viewStore.setPan(100, 100);
      viewStore.adjustPan(-30, -40);
      expect(viewStore.panX.value).toBe(70);
      expect(viewStore.panY.value).toBe(60);
    });

    it('should accumulate multiple adjustments', () => {
      viewStore.adjustPan(10, 10);
      viewStore.adjustPan(20, 20);
      viewStore.adjustPan(15, 15);
      expect(viewStore.panX.value).toBe(45);
      expect(viewStore.panY.value).toBe(45);
    });
  });

  describe('adjustZoom', () => {
    it('should increase zoom with positive delta', () => {
      viewStore.setZoom(1.0);
      viewStore.adjustZoom(0.5); // 50% increase
      expect(viewStore.zoom.value).toBe(1.5);
    });

    it('should decrease zoom with negative delta', () => {
      viewStore.setZoom(2.0);
      viewStore.adjustZoom(-0.5); // 50% decrease
      expect(viewStore.zoom.value).toBe(1.0);
    });

    it('should clamp adjusted zoom to valid range', () => {
      viewStore.setZoom(0.2);
      viewStore.adjustZoom(-0.9); // Would go to 0.02
      expect(viewStore.zoom.value).toBe(0.1);
    });

    it('should zoom toward focus point', () => {
      viewStore.setZoom(1.0);
      viewStore.setPan(0, 0);
      
      // Zoom in 2x toward point (100, 100)
      viewStore.adjustZoom(1.0, 100, 100); // delta=1.0 → newZoom=2.0
      
      // Pan should adjust to keep focus point stationary
      expect(viewStore.zoom.value).toBe(2.0);
      // Focus point (100,100) in viewport should map to same paper coords before/after
    });
  });

  describe('resetViewport', () => {
    it('should reset all values to defaults', () => {
      viewStore.setZoom(3.0);
      viewStore.setPan(200, 300);
      
      viewStore.resetViewport();
      
      expect(viewStore.zoom.value).toBe(1.0);
      expect(viewStore.panX.value).toBe(0);
      expect(viewStore.panY.value).toBe(0);
    });
  });

  describe('viewportState', () => {
    it('should reflect current state', () => {
      viewStore.setZoom(2.5);
      viewStore.setPan(150, 250);
      
      const state = viewStore.viewportState.value;
      expect(state.zoom).toBe(2.5);
      expect(state.panX).toBe(150);
      expect(state.panY).toBe(250);
    });

    it('should update reactively', () => {
      const state1 = viewStore.viewportState.value;
      expect(state1.zoom).toBe(1.0);
      
      viewStore.setZoom(3.0);
      
      const state2 = viewStore.viewportState.value;
      expect(state2.zoom).toBe(3.0);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle typical zoom sequence', () => {
      // Start at default
      expect(viewStore.zoom.value).toBe(1.0);
      
      // Zoom in several times
      viewStore.adjustZoom(0.2); // 1.2x
      viewStore.adjustZoom(0.2); // 1.44x
      viewStore.adjustZoom(0.2); // 1.728x
      
      expect(viewStore.zoom.value).toBeCloseTo(1.728, 2);
    });

    it('should handle typical pan sequence', () => {
      // Pan right and down
      viewStore.adjustPan(50, 30);
      viewStore.adjustPan(20, 10);
      
      expect(viewStore.panX.value).toBe(70);
      expect(viewStore.panY.value).toBe(40);
    });

    it('should handle combined zoom and pan', () => {
      viewStore.setZoom(2.0);
      viewStore.setPan(100, 100);
      
      expect(viewStore.viewportState.value).toEqual({
        zoom: 2.0,
        panX: 100,
        panY: 100,
        gridVisible: true,
        threeViewOptions: {
          showPlanes: true,
          showGrid: true,
          showLinkingVisuals: false,
          show2DElementsOnPlanes: false
        }
      });
    });
  });
});

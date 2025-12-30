/**
 * viewStore.ts - Viewport state management
 * 
 * Manages the viewport transformation state (pan and zoom).
 * The viewport transform is applied AFTER the plane-to-paper transformation
 * to provide canvas navigation.
 * 
 * Transformation hierarchy:
 * 1. Plane intrinsic coordinates <u,v> (stored in Point2D)
 * 2. Paper coordinates (x,y) (after plane-to-paper transform)
 * 3. Viewport coordinates (after pan/zoom transform)
 * 
 * Reference: specs/001-dihedral-learning-mvp/data-model.md - View Transformation
 */

import { ref, computed } from 'vue';

export interface ViewportState {
  zoom: number;
  panX: number;
  panY: number;
}

// Default viewport state (identity transform)
const zoom = ref(1.0);
const panX = ref(0);
const panY = ref(0);

export function useViewStore() {
  /**
   * Set zoom level
   * @param newZoom Zoom factor (1.0 = 100%, 2.0 = 200%, etc.)
   */
  function setZoom(newZoom: number) {
    // Clamp zoom to reasonable range
    zoom.value = Math.max(0.1, Math.min(10, newZoom));
  }

  /**
   * Set pan offset
   * @param x Horizontal pan offset in canvas pixels
   * @param y Vertical pan offset in canvas pixels
   */
  function setPan(x: number, y: number) {
    panX.value = x;
    panY.value = y;
  }

  /**
   * Adjust pan by delta
   * @param dx Delta X in canvas pixels
   * @param dy Delta Y in canvas pixels
   */
  function adjustPan(dx: number, dy: number) {
    panX.value += dx;
    panY.value += dy;
  }

  /**
   * Adjust zoom by delta factor
   * @param delta Zoom delta (positive = zoom in, negative = zoom out)
   * @param focusX Optional focus point X (zoom toward this point)
   * @param focusY Optional focus point Y (zoom toward this point)
   */
  function adjustZoom(delta: number, focusX?: number, focusY?: number) {
    const oldZoom = zoom.value;
    const newZoom = Math.max(0.1, Math.min(10, oldZoom * (1 + delta)));
    
    // If focus point provided, adjust pan to zoom toward that point
    if (focusX !== undefined && focusY !== undefined) {
      // Convert focus point from viewport to paper coordinates
      const paperFocusX = (focusX - panX.value) / oldZoom;
      const paperFocusY = (focusY - panY.value) / oldZoom;
      
      // After zoom, adjust pan to keep focus point in same viewport position
      panX.value = focusX - paperFocusX * newZoom;
      panY.value = focusY - paperFocusY * newZoom;
    }
    
    zoom.value = newZoom;
  }

  /**
   * Reset viewport to default state
   */
  function resetViewport() {
    zoom.value = 1.0;
    panX.value = 0;
    panY.value = 0;
  }

  /**
   * Get current viewport state as immutable object
   */
  const viewportState = computed<ViewportState>(() => ({
    zoom: zoom.value,
    panX: panX.value,
    panY: panY.value
  }));

  return {
    // State
    zoom: computed(() => zoom.value),
    panX: computed(() => panX.value),
    panY: computed(() => panY.value),
    viewportState,
    
    // Actions
    setZoom,
    setPan,
    adjustPan,
    adjustZoom,
    resetViewport
  };
}

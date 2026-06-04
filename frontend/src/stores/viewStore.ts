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
 */

import { ref, computed } from 'vue';
import { defaultThreeViewDisplayOptions, type ThreeViewDisplayOptions } from '../types/ThreeViewDisplayOptions';

interface ViewportState {
  zoom: number;
  panX: number;
  panY: number;
  gridVisible: boolean;
  threeViewOptions: ThreeViewDisplayOptions;
}

// Default viewport state (identity transform)
const zoom = ref(1.0);
const panX = ref(0);
const panY = ref(0);
const gridVisible = ref(true); // Grid visible by default

const PROJECTION_DISPLAY_KEY = 'diedrico-show-projected-elements';
const THREE_VIEW_OPTIONS_KEY = 'diedrico-threeview-options';

const showProjectedElements = ref(false);

const threeViewOptions = ref<ThreeViewDisplayOptions>({ ...defaultThreeViewDisplayOptions });

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
   * @param focusX Optional focus point X in canvas coordinates (zoom toward this point)
   * @param focusY Optional focus point Y in canvas coordinates (zoom toward this point)
   */
  function adjustZoom(delta: number, focusX?: number, focusY?: number) {
    const oldZoom = zoom.value;
    const newZoom = Math.max(0.1, Math.min(10, oldZoom * (1 + delta)));
    
    // If focus point provided, adjust pan to zoom toward that point
    if (focusX !== undefined && focusY !== undefined) {
      // Convert focus point from canvas to paper coordinates
      // Viewport transformation: canvas = (paper + pan) * zoom
      // Inverse: paper = canvas / zoom - pan
      const paperFocusX = focusX / oldZoom - panX.value;
      const paperFocusY = focusY / oldZoom - panY.value;
      
      // After zoom, adjust pan to keep focus point in same canvas position
      // We want: focusX = (paperFocusX + newPanX) * newZoom
      // Solving for newPanX: newPanX = focusX / newZoom - paperFocusX
      panX.value = focusX / newZoom - paperFocusX;
      panY.value = focusY / newZoom - paperFocusY;
    }
    
    zoom.value = newZoom;
  }

  /**
   * Toggle grid visibility (T276)
   */
  function toggleGrid() {
    gridVisible.value = !gridVisible.value;
  }

  /**
   * Toggle 3D element projection display (Phase 106 - T1831/T1832)
   */
  function toggleProjectedElements() {
    showProjectedElements.value = !showProjectedElements.value;
  }

  /**
   * Update a single 3D view display option
   * @param key Option key
   * @param value New value
   */
  function updateThreeViewOption<K extends keyof ThreeViewDisplayOptions>(
    key: K,
    value: ThreeViewDisplayOptions[K]
  ) {
    threeViewOptions.value[key] = value;
  }

  function initFromStorage(): void {
    try {
      const storedProjection = localStorage.getItem(PROJECTION_DISPLAY_KEY);
      if (storedProjection !== null) {
        showProjectedElements.value = storedProjection === 'true';
      }
    } catch {
      // Keep default value
    }
    try {
      const storedOptions = localStorage.getItem(THREE_VIEW_OPTIONS_KEY);
      if (storedOptions) {
        const parsed = JSON.parse(storedOptions);
        threeViewOptions.value = { ...defaultThreeViewDisplayOptions, ...parsed };
      }
    } catch (e) {
      console.warn('Failed to load 3D view options from localStorage:', e);
    }
  }

  function saveToStorage(): void {
    try {
      localStorage.setItem(PROJECTION_DISPLAY_KEY, String(showProjectedElements.value));
    } catch {
      // Silent: persistence failure should not break UI
    }
    try {
      localStorage.setItem(THREE_VIEW_OPTIONS_KEY, JSON.stringify(threeViewOptions.value));
    } catch {
      // Silent: persistence failure should not break UI
    }
  }

  /**
   * Get current viewport state as immutable object
   */
  const viewportState = computed<ViewportState>(() => ({
    zoom: zoom.value,
    panX: panX.value,
    panY: panY.value,
    gridVisible: gridVisible.value,
    threeViewOptions: threeViewOptions.value
  }));

  return {
    // State
    zoom: computed(() => zoom.value),
    panX: computed(() => panX.value),
    panY: computed(() => panY.value),
    gridVisible: computed(() => gridVisible.value),
    showProjectedElements: computed(() => showProjectedElements.value),
    threeViewOptions: computed(() => threeViewOptions.value),
    viewportState,
    
    // Actions
    setZoom,
    setPan,
    adjustPan,
    adjustZoom,
    toggleGrid,
    toggleProjectedElements,
    updateThreeViewOption,
    initFromStorage,
    saveToStorage,
  };
}

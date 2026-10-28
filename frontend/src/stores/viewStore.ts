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

export type ThreeViewWindowMode = 'floating' | 'minimized' | 'maximized';

export interface ThreeViewWindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ThreeViewWindowContainer {
  width: number;
  height: number;
}

export interface ThreeViewWindowState extends ThreeViewWindowBounds {
  mode: ThreeViewWindowMode;
  restoreBounds: ThreeViewWindowBounds | null;
}

// Default viewport state (identity transform)
const zoom = ref(1.0);
const panX = ref(0);
const panY = ref(0);
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 250;
const gridVisible = ref(true); // Grid visible by default

const PROJECTION_DISPLAY_KEY = 'diedrico-show-projected-elements';
const THREE_VIEW_OPTIONS_KEY = 'diedrico-threeview-options';
const THREE_VIEW_WINDOW_KEY = 'diedrico-threeview-window';

const THREE_VIEW_MIN_WIDTH = 320;
const THREE_VIEW_MIN_HEIGHT = 220;
const THREE_VIEW_MINIMIZED_HEIGHT = 34;
const THREE_VIEW_MARGIN = 16;

const defaultThreeViewWindowState: ThreeViewWindowState = {
  mode: 'floating',
  x: 0,
  y: 0,
  width: 800,
  height: 600,
  restoreBounds: null,
};

const showProjectedElements = ref(false);

const threeViewOptions = ref<ThreeViewDisplayOptions>({ ...defaultThreeViewDisplayOptions });
const threeViewWindow = ref<ThreeViewWindowState>({ ...defaultThreeViewWindowState });

function normalizedContainer(container?: ThreeViewWindowContainer): ThreeViewWindowContainer {
  return {
    width: Math.max(THREE_VIEW_MIN_WIDTH + THREE_VIEW_MARGIN * 2, container?.width ?? 1200),
    height: Math.max(THREE_VIEW_MIN_HEIGHT + THREE_VIEW_MARGIN * 2, container?.height ?? 800),
  };
}

function clampBounds(bounds: ThreeViewWindowBounds, container?: ThreeViewWindowContainer): ThreeViewWindowBounds {
  const safeContainer = normalizedContainer(container);
  const width = Math.min(Math.max(bounds.width, THREE_VIEW_MIN_WIDTH), Math.max(THREE_VIEW_MIN_WIDTH, safeContainer.width - THREE_VIEW_MARGIN * 2));
  const height = Math.min(Math.max(bounds.height, THREE_VIEW_MIN_HEIGHT), Math.max(THREE_VIEW_MIN_HEIGHT, safeContainer.height - THREE_VIEW_MARGIN * 2));
  const maxX = Math.max(THREE_VIEW_MARGIN, safeContainer.width - width - THREE_VIEW_MARGIN);
  const maxY = Math.max(THREE_VIEW_MARGIN, safeContainer.height - height - THREE_VIEW_MARGIN);
  return {
    x: Math.min(Math.max(bounds.x, THREE_VIEW_MARGIN), maxX),
    y: Math.min(Math.max(bounds.y, THREE_VIEW_MARGIN), maxY),
    width,
    height,
  };
}

function defaultFloatingBounds(container?: ThreeViewWindowContainer): ThreeViewWindowBounds {
  const safeContainer = normalizedContainer(container);
  return clampBounds({
    x: safeContainer.width - defaultThreeViewWindowState.width - 20,
    y: safeContainer.height - defaultThreeViewWindowState.height - 20,
    width: defaultThreeViewWindowState.width,
    height: defaultThreeViewWindowState.height,
  }, safeContainer);
}

function currentFloatingBounds(container?: ThreeViewWindowContainer): ThreeViewWindowBounds {
  return clampBounds({
    x: threeViewWindow.value.x,
    y: threeViewWindow.value.y,
    width: threeViewWindow.value.width,
    height: threeViewWindow.value.height,
  }, container);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function parseStoredBounds(value: unknown): ThreeViewWindowBounds | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<ThreeViewWindowBounds>;
  if (!isFiniteNumber(candidate.x) || !isFiniteNumber(candidate.y) || !isFiniteNumber(candidate.width) || !isFiniteNumber(candidate.height)) return null;
  return {
    x: candidate.x,
    y: candidate.y,
    width: candidate.width,
    height: candidate.height,
  };
}

function applyThreeViewWindowState(state: ThreeViewWindowState): void {
  threeViewWindow.value = {
    mode: state.mode,
    x: state.x,
    y: state.y,
    width: state.width,
    height: state.height,
    restoreBounds: state.restoreBounds ? { ...state.restoreBounds } : null,
  };
}

export function useViewStore() {
  /**
   * Set zoom level
   * @param newZoom Zoom factor (1.0 = 100%, 2.0 = 200%, etc.)
   */
  function setZoom(newZoom: number) {
    // Clamp zoom to reasonable range
    zoom.value = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
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
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, oldZoom * (1 + delta)));
    
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

  function initializeThreeViewWindow(container?: ThreeViewWindowContainer): void {
    const defaultBounds = defaultFloatingBounds(container);
    if (
      threeViewWindow.value.x === defaultThreeViewWindowState.x &&
      threeViewWindow.value.y === defaultThreeViewWindowState.y &&
      threeViewWindow.value.width === defaultThreeViewWindowState.width &&
      threeViewWindow.value.height === defaultThreeViewWindowState.height
    ) {
      applyThreeViewWindowState({
        mode: 'floating',
        ...defaultBounds,
        restoreBounds: null,
      });
      return;
    }
    clampThreeViewWindow(container);
  }

  function setThreeViewWindowBounds(bounds: ThreeViewWindowBounds, container?: ThreeViewWindowContainer): void {
    const clamped = clampBounds(bounds, container);
    applyThreeViewWindowState({
      ...threeViewWindow.value,
      mode: 'floating',
      ...clamped,
    });
  }

  function moveThreeViewWindow(dx: number, dy: number, container?: ThreeViewWindowContainer): void {
    if (threeViewWindow.value.mode === 'maximized') return;
    const state = threeViewWindow.value;
    const clamped = clampBounds({
      x: state.x + dx,
      y: state.y + dy,
      width: state.width,
      height: state.height,
    }, container);
    if (state.mode === 'minimized') {
      const safeContainer = normalizedContainer(container);
      clamped.height = THREE_VIEW_MINIMIZED_HEIGHT;
      clamped.y = Math.min(Math.max(state.y + dy, THREE_VIEW_MARGIN), safeContainer.height - THREE_VIEW_MINIMIZED_HEIGHT - THREE_VIEW_MARGIN);
    }
    applyThreeViewWindowState({
      ...state,
      ...clamped,
    });
  }

  function resizeThreeViewWindow(width: number, height: number, container?: ThreeViewWindowContainer): void {
    if (threeViewWindow.value.mode !== 'floating') return;
    const clamped = clampBounds({
      x: threeViewWindow.value.x,
      y: threeViewWindow.value.y,
      width,
      height,
    }, container);
    applyThreeViewWindowState({
      ...threeViewWindow.value,
      ...clamped,
    });
  }

  function minimizeThreeViewWindow(container?: ThreeViewWindowContainer): void {
    const restoreBounds = threeViewWindow.value.mode === 'maximized' || threeViewWindow.value.mode === 'minimized'
      ? threeViewWindow.value.restoreBounds ?? defaultFloatingBounds(container)
      : currentFloatingBounds(container);
    const safeContainer = normalizedContainer(container);
    const minimizedWidth = Math.min(Math.max(restoreBounds.width, THREE_VIEW_MIN_WIDTH), safeContainer.width - THREE_VIEW_MARGIN * 2);
    const maxX = Math.max(THREE_VIEW_MARGIN, safeContainer.width - minimizedWidth - THREE_VIEW_MARGIN);
    applyThreeViewWindowState({
      mode: 'minimized',
      x: Math.min(Math.max(restoreBounds.x, THREE_VIEW_MARGIN), maxX),
      y: Math.max(THREE_VIEW_MARGIN, safeContainer.height - THREE_VIEW_MINIMIZED_HEIGHT - THREE_VIEW_MARGIN),
      width: minimizedWidth,
      height: THREE_VIEW_MINIMIZED_HEIGHT,
      restoreBounds,
    });
  }

  function maximizeThreeViewWindow(container?: ThreeViewWindowContainer): void {
    const restoreBounds = threeViewWindow.value.mode === 'floating'
      ? currentFloatingBounds(container)
      : threeViewWindow.value.restoreBounds ?? defaultFloatingBounds(container);
    const safeContainer = normalizedContainer(container);
    applyThreeViewWindowState({
      mode: 'maximized',
      x: THREE_VIEW_MARGIN / 2,
      y: THREE_VIEW_MARGIN / 2,
      width: Math.max(THREE_VIEW_MIN_WIDTH, safeContainer.width - THREE_VIEW_MARGIN),
      height: Math.max(THREE_VIEW_MIN_HEIGHT, safeContainer.height - THREE_VIEW_MARGIN),
      restoreBounds,
    });
  }

  function restoreThreeViewWindow(container?: ThreeViewWindowContainer): void {
    const restored = clampBounds(threeViewWindow.value.restoreBounds ?? defaultFloatingBounds(container), container);
    applyThreeViewWindowState({
      mode: 'floating',
      ...restored,
      restoreBounds: null,
    });
  }

  function clampThreeViewWindow(container?: ThreeViewWindowContainer): void {
    if (threeViewWindow.value.mode === 'maximized') {
      maximizeThreeViewWindow(container);
      return;
    }
    if (threeViewWindow.value.mode === 'minimized') {
      minimizeThreeViewWindow(container);
      return;
    }
    setThreeViewWindowBounds(currentFloatingBounds(container), container);
  }

  function resetThreeViewWindow(container?: ThreeViewWindowContainer): void {
    applyThreeViewWindowState({
      mode: 'floating',
      ...defaultFloatingBounds(container),
      restoreBounds: null,
    });
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
    try {
      const storedWindow = localStorage.getItem(THREE_VIEW_WINDOW_KEY);
      if (storedWindow) {
        const parsed = JSON.parse(storedWindow);
        const bounds = parseStoredBounds(parsed);
        const restoreBounds = parseStoredBounds(parsed.restoreBounds);
        const mode: ThreeViewWindowMode = parsed.mode === 'minimized' || parsed.mode === 'maximized' ? parsed.mode : 'floating';
        if (bounds) {
          const clampedBounds = mode === 'minimized'
            ? {
                x: Math.max(THREE_VIEW_MARGIN, bounds.x),
                y: Math.max(THREE_VIEW_MARGIN, bounds.y),
                width: Math.max(THREE_VIEW_MIN_WIDTH, bounds.width),
                height: THREE_VIEW_MINIMIZED_HEIGHT,
              }
            : clampBounds(bounds);
          applyThreeViewWindowState({
            mode,
            ...clampedBounds,
            restoreBounds: restoreBounds ? clampBounds(restoreBounds) : null,
          });
        }
      }
    } catch (e) {
      console.warn('Failed to load 3D view window from localStorage:', e);
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
    try {
      localStorage.setItem(THREE_VIEW_WINDOW_KEY, JSON.stringify(threeViewWindow.value));
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
    threeViewWindow: computed(() => threeViewWindow.value),
    viewportState,
    
    // Actions
    setZoom,
    setPan,
    adjustPan,
    adjustZoom,
    toggleGrid,
    toggleProjectedElements,
    updateThreeViewOption,
    initializeThreeViewWindow,
    setThreeViewWindowBounds,
    moveThreeViewWindow,
    resizeThreeViewWindow,
    minimizeThreeViewWindow,
    maximizeThreeViewWindow,
    restoreThreeViewWindow,
    clampThreeViewWindow,
    resetThreeViewWindow,
    initFromStorage,
    saveToStorage,
  };
}

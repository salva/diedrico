/**
 * useViewport.ts - Viewport interaction composable
 * 
 * Provides pan and zoom functionality for the canvas.
 * Handles mouse/touch events and updates viewport state.
 * 
 * Controls:
 * - Pan: Shift + drag, Space + drag, or middle mouse button drag
 * - Zoom: Mouse wheel or pinch gesture
 * 
 * Reference: specs/001-dihedral-learning-mvp/ui-spec.md - Viewport Navigation
 */

import { ref, onMounted, onUnmounted, type Ref } from 'vue';
import { useViewStore } from '@/stores/viewStore';

export interface ViewportOptions {
  element: Ref<HTMLElement | SVGElement | null>;
  enabled?: boolean;
}

export function useViewport(options: ViewportOptions) {
  const viewStore = useViewStore();
  
  const isPanning = ref(false);
  const lastMouseX = ref(0);
  const lastMouseY = ref(0);
  const isShiftPressed = ref(false);
  const isSpacePressed = ref(false);

  /**
   * Handle mouse down - start panning
   */
  function handleMouseDown(event: MouseEvent) {
    // Pan with: Shift + left click, Space + left click, or middle mouse button
    const shouldPan = 
      (event.button === 0 && (isShiftPressed.value || isSpacePressed.value)) ||
      event.button === 1; // Middle mouse button

    if (shouldPan) {
      event.preventDefault();
      isPanning.value = true;
      lastMouseX.value = event.clientX;
      lastMouseY.value = event.clientY;
    }
  }

  /**
   * Handle mouse move - pan if dragging
   */
  function handleMouseMove(event: MouseEvent) {
    if (!isPanning.value) return;

    event.preventDefault();
    
    const dx = event.clientX - lastMouseX.value;
    const dy = event.clientY - lastMouseY.value;
    
    // Adjust pan by dividing by zoom - at high zoom, screen pixels translate to smaller world movement
    const currentZoom = viewStore.viewportState.value.zoom;
    viewStore.adjustPan(dx / currentZoom, dy / currentZoom);
    
    lastMouseX.value = event.clientX;
    lastMouseY.value = event.clientY;
  }

  /**
   * Handle mouse up - stop panning
   */
  function handleMouseUp() {
    isPanning.value = false;
  }

  /**
   * Handle mouse wheel - zoom
   */
  function handleWheel(event: WheelEvent) {
    event.preventDefault();
    
    // Calculate zoom delta from wheel event
    // Negative deltaY = scroll up = zoom in
    const zoomDelta = -event.deltaY * 0.001;
    
    // Get mouse position relative to canvas
    const rect = options.element.value?.getBoundingClientRect();
    if (!rect) return;
    
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    // Zoom toward mouse position
    viewStore.adjustZoom(zoomDelta, mouseX, mouseY);
  }

  /**
   * Handle keyboard - track modifier keys
   */
  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Shift') {
      isShiftPressed.value = true;
    } else if (event.key === ' ') {
      isSpacePressed.value = true;
      // Prevent page scroll when space is pressed
      event.preventDefault();
    }
  }

  function handleKeyUp(event: KeyboardEvent) {
    if (event.key === 'Shift') {
      isShiftPressed.value = false;
    } else if (event.key === ' ') {
      isSpacePressed.value = false;
    }
  }

  /**
   * Setup event listeners
   */
  function setupListeners() {
    const element = options.element.value;
    if (!element) return;

    element.addEventListener('mousedown', handleMouseDown as EventListener);
    element.addEventListener('wheel', handleWheel as EventListener, { passive: false });
    
    // Window listeners for mouse up (catch events outside canvas)
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
  }

  /**
   * Remove event listeners
   */
  function cleanupListeners() {
    const element = options.element.value;
    if (!element) return;

    element.removeEventListener('mousedown', handleMouseDown as EventListener);
    element.removeEventListener('wheel', handleWheel as EventListener);
    
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
  }

  // Setup on mount
  onMounted(() => {
    if (options.enabled !== false) {
      setupListeners();
    }
  });

  // Cleanup on unmount
  onUnmounted(() => {
    cleanupListeners();
  });

  return {
    isPanning,
    isShiftPressed,
    isSpacePressed,
    setupListeners,
    cleanupListeners
  };
}

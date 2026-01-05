/**
 * useHoverHighlight - Composable for managing hover highlighting state
 * 
 * Provides reactive hover state management for geometric elements.
 * Tracks which element is currently hovered and provides methods to
 * set/clear hover state.
 * 
 * Usage:
 * - Canvas: Call setHoveredElement() on mouseover, clearHover() on mouseout
 * - Panels: Call setHoveredElement() on mouse enter, clearHover() on mouse leave
 * - Components: Watch hoveredElementId to apply visual feedback
 * 
 * Reference: specs/001-dihedral-learning-mvp/ui-spec.md §Unified Hover Highlighting
 */

import { ref, computed, type Ref } from 'vue';

export interface HoverState {
  elementId: string | null;
  elementType: string | null;
  label: string | null;
  temporary: boolean; // True for transient hovers (no tooltip), false for persistent
}

/**
 * Composable for hover highlighting management
 * 
 * Provides:
 * - hoveredElementId: Currently hovered element ID (null if none)
 * - hoveredElementType: Type of hovered element ('point', 'line', etc.)
 * - hoveredElementLabel: Label/description of hovered element
 * - isHovering: Whether any element is currently hovered
 * - setHoveredElement(): Set element as hovered
 * - clearHover(): Clear hover state
 * - isElementHovered(): Check if specific element is hovered
 */
export function useHoverHighlight() {
  // Hover state
  const hoverState = ref<HoverState>({
    elementId: null,
    elementType: null,
    label: null,
    temporary: false
  });

  // Computed properties for easy access
  const hoveredElementId = computed(() => hoverState.value.elementId);
  const hoveredElementType = computed(() => hoverState.value.elementType);
  const hoveredElementLabel = computed(() => hoverState.value.label);
  const isHovering = computed(() => hoverState.value.elementId !== null);

  /**
   * Set an element as hovered
   * 
   * @param elementId - ID of element to hover
   * @param elementType - Type of element ('point', 'line', 'circle', etc.)
   * @param label - Optional label to display in tooltip
   * @param temporary - If true, hover is transient (no tooltip shown)
   */
  function setHoveredElement(
    elementId: string,
    elementType: string,
    label?: string,
    temporary: boolean = false
  ): void {
    hoverState.value = {
      elementId,
      elementType,
      label: label || elementId,
      temporary
    };
  }

  /**
   * Clear hover state
   */
  function clearHover(): void {
    hoverState.value = {
      elementId: null,
      elementType: null,
      label: null,
      temporary: false
    };
  }

  /**
   * Check if a specific element is currently hovered
   * 
   * @param elementId - ID of element to check
   * @returns True if element is hovered
   */
  function isElementHovered(elementId: string): boolean {
    return hoverState.value.elementId === elementId;
  }

  return {
    // State
    hoverState,
    hoveredElementId,
    hoveredElementType,
    hoveredElementLabel,
    isHovering,
    
    // Actions
    setHoveredElement,
    clearHover,
    isElementHovered
  };
}

/**
 * Global hover state instance (singleton pattern)
 * Allows different components to share the same hover state
 */
let globalHoverInstance: ReturnType<typeof useHoverHighlight> | null = null;

/**
 * Get or create global hover highlight instance
 * Use this when you need shared hover state across components
 */
export function useGlobalHoverHighlight(): ReturnType<typeof useHoverHighlight> {
  if (!globalHoverInstance) {
    globalHoverInstance = useHoverHighlight();
  }
  return globalHoverInstance;
}

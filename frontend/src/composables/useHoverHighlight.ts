import { ref } from 'vue';
import { useWorldStore } from '@/stores/worldStore';

/**
 * Composable for hover highlighting with dependency visualization
 */
export function useHoverHighlight() {
  const worldStore = useWorldStore();
  const hoveredElementId = ref<string | null>(null);
  const highlightedElementIds = ref<Set<string>>(new Set());

  /**
   * Set hovered element and highlight its dependencies
   */
  const setHoveredElement = (elementId: string | null) => {
    hoveredElementId.value = elementId;
    
    if (elementId) {
      // Get all elements that depend on this element (descendants in dependency graph)
      const descendants = worldStore.dependencyGraph.getDescendants(elementId);
      highlightedElementIds.value = new Set([elementId, ...descendants]);
    } else {
      highlightedElementIds.value.clear();
    }
  };

  /**
   * Check if element should be highlighted
   */
  const isHighlighted = (elementId: string): boolean => {
    return highlightedElementIds.value.has(elementId);
  };

  /**
   * Check if element is directly hovered
   */
  const isHovered = (elementId: string): boolean => {
    return hoveredElementId.value === elementId;
  };

  /**
   * Clear hover state
   */
  const clearHover = () => {
    hoveredElementId.value = null;
    highlightedElementIds.value.clear();
  };

  return {
    hoveredElementId,
    highlightedElementIds,
    setHoveredElement,
    isHighlighted,
    isHovered,
    clearHover
  };
}

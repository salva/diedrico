import { ref, computed } from 'vue';

export interface ToolFeedback {
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  position?: { x: number; y: number };
}

/**
 * Composable for visual feedback during tool use
 * Shows cursor feedback, preview elements, and messages
 */
export function useToolFeedback() {
  const feedback = ref<ToolFeedback | null>(null);
  const previewElements = ref<any[]>([]);
  const cursorPosition = ref<{ x: number; y: number } | null>(null);

  /**
   * Show feedback message
   */
  const showFeedback = (
    type: ToolFeedback['type'],
    message: string,
    position?: { x: number; y: number }
  ) => {
    feedback.value = { type, message, position };
  };

  /**
   * Clear feedback
   */
  const clearFeedback = () => {
    feedback.value = null;
  };

  /**
   * Set preview elements (e.g., line being drawn)
   */
  const setPreview = (elements: any[]) => {
    previewElements.value = elements;
  };

  /**
   * Clear preview elements
   */
  const clearPreview = () => {
    previewElements.value = [];
  };

  /**
   * Update cursor position for coordinate display
   */
  const updateCursor = (x: number | null, y: number | null) => {
    if (x !== null && y !== null) {
      cursorPosition.value = { x, y };
    } else {
      cursorPosition.value = null;
    }
  };

  /**
   * Clear all feedback
   */
  const clearAll = () => {
    clearFeedback();
    clearPreview();
    cursorPosition.value = null;
  };

  /**
   * Computed cursor text for display
   */
  const cursorText = computed(() => {
    if (cursorPosition.value) {
      return `(${cursorPosition.value.x.toFixed(1)}, ${cursorPosition.value.y.toFixed(1)})`;
    }
    return null;
  });

  return {
    feedback,
    previewElements,
    cursorPosition,
    cursorText,
    showFeedback,
    clearFeedback,
    setPreview,
    clearPreview,
    updateCursor,
    clearAll
  };
}

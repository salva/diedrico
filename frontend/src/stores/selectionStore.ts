/**
 * Selection Store
 * 
 * Manages object selection state globally across the application.
 * Supports single-select and multi-select (Ctrl+click).
 * 
 * Per ui-spec.md §Element Interaction:
 * - Click element: Select (single selection)
 * - Click + Shift: Add to selection (multi-select)
 * - Click empty space: Deselect all
 * 
 * Selection syncs bidirectionally between:
 * - Canvas (SvgCanvas)
 * - Elements Panel
 * - Actions Panel (shows related actions)
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useSelectionStore = defineStore('selection', () => {
  // Selected element IDs
  const selectedIds = ref<Set<string>>(new Set());
  
  // Cascade highlight IDs (elements that will be deleted due to dependencies)
  const cascadeHighlightIds = ref<Set<string>>(new Set());

  // Computed: Get array of selected IDs
  const selectedIdsArray = computed(() => Array.from(selectedIds.value));
  
  // Computed: Get array of cascade highlight IDs
  const cascadeHighlightIdsArray = computed(() => Array.from(cascadeHighlightIds.value));

  // Computed: Check if any elements are selected
  const hasSelection = computed(() => selectedIds.value.size > 0);

  // Computed: Get count of selected elements
  const selectionCount = computed(() => selectedIds.value.size);

  /**
   * Select a single element (replaces current selection)
   */
  function selectSingle(elementId: string): void {
    selectedIds.value.clear();
    selectedIds.value.add(elementId);
  }

  /**
   * Add element to selection (multi-select)
   */
  function addToSelection(elementId: string): void {
    selectedIds.value.add(elementId);
  }

  /**
   * Remove element from selection
   */
  function removeFromSelection(elementId: string): void {
    selectedIds.value.delete(elementId);
  }

  /**
   * Toggle element selection (add if not selected, remove if selected)
   */
  function toggleSelection(elementId: string): void {
    if (selectedIds.value.has(elementId)) {
      selectedIds.value.delete(elementId);
    } else {
      selectedIds.value.add(elementId);
    }
  }

  /**
   * Clear all selections
   */
  function clearSelection(): void {
    selectedIds.value.clear();
  }

  /**
   * Check if element is selected
   */
  function isSelected(elementId: string): boolean {
    return selectedIds.value.has(elementId);
  }

  /**
   * Select multiple elements at once (replaces current selection)
   */
  function selectMultiple(elementIds: string[]): void {
    selectedIds.value.clear();
    elementIds.forEach(id => selectedIds.value.add(id));
  }
  
  /**
   * Set cascade highlight elements (elements that will be deleted due to dependencies)
   */
  function setCascadeHighlight(elementIds: string[]): void {
    cascadeHighlightIds.value.clear();
    elementIds.forEach(id => cascadeHighlightIds.value.add(id));
  }
  
  /**
   * Clear cascade highlight
   */
  function clearCascadeHighlight(): void {
    cascadeHighlightIds.value.clear();
  }
  
  /**
   * Check if element is cascade highlighted
   */
  function isCascadeHighlighted(elementId: string): boolean {
    return cascadeHighlightIds.value.has(elementId);
  }

  return {
    // State
    selectedIds,
    cascadeHighlightIds,
    
    // Computed
    selectedIdsArray,
    cascadeHighlightIdsArray,
    hasSelection,
    selectionCount,
    
    // Actions
    selectSingle,
    addToSelection,
    removeFromSelection,
    toggleSelection,
    clearSelection,
    isSelected,
    selectMultiple,
    setCascadeHighlight,
    clearCascadeHighlight,
    isCascadeHighlighted,
  };
});

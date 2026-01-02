/**
 * toolStore.ts - Tool selection state management
 * 
 * Manages the currently active geometric construction tool.
 * When a tool is selected, the canvas changes its interaction mode
 * to match the tool's behavior (point placement, line creation, etc.)
 * 
 * Reference: specs/001-dihedral-learning-mvp/ui-spec.md - Tool Interactions
 */

import { ref, computed } from 'vue';

export type ToolType = 'select' | 'point' | 'line' | 'circle' | 'segment' | 'guide' | 'intersection';

const activeTool = ref<ToolType>('select');

export function useToolStore() {
  /**
   * Set the active tool
   */
  function setTool(tool: ToolType) {
    activeTool.value = tool;
  }

  /**
   * Check if a specific tool is active
   */
  function isToolActive(tool: ToolType): boolean {
    return activeTool.value === tool;
  }

  /**
   * Get the current active tool
   */
  const currentTool = computed(() => activeTool.value);

  return {
    currentTool,
    setTool,
    isToolActive
  };
}

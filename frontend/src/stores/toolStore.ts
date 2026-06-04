/**
 * toolStore.ts - Tool selection state management
 * 
 * Manages the currently active geometric construction tool.
 * When a tool is selected, the canvas changes its interaction mode
 * to match the tool's behavior (point placement, line creation, etc.)
 * 
 * Supports tool families with dropdown menus and last-used sub-tool memory.
 * 
 * Tool interaction state is UI/runtime state; command construction belongs to application controllers.
 */

import { ref, computed } from 'vue';
import type { ToolType } from '@/application/tools/ToolTypes';
import type { ToolFamilyConfig } from '../types/ToolConfig';

export const TOOL_TYPE = {
  SELECT: 'select',
  POINT: 'point',
  LINE: 'line',
  CIRCLE: 'circle',
  SEGMENT: 'segment',
  GUIDE: 'guide',
  INTERSECTION: 'intersection',
  TRANSPORT: 'transport',
  PARALLEL_LINE: 'parallel-line',
  PERPENDICULAR_LINE: 'perpendicular-line',
  TANGENT_LINE_TO_CIRCLE_THROUGH_POINT: 'tangent-line-to-circle-through-point',
  TANGENT_LINE_TO_CIRCLE_PARALLEL: 'tangent-line-to-circle-parallel',
  CREATE3DPOINT: 'create3dpoint',
  CREATE3DLINE: 'create3dline',
  CREATE3DSEGMENT: 'create3dsegment',
  CREATE3DPLANE: 'create3dplane',
  CREATEPROJECTIONPLANE: 'createprojectionplane',
  INTERACTIVEPROJECTIONSETUP: 'interactiveprojectionsetup',
  QUICKPROJECTIONSETUP: 'quickprojectionsetup',
  QUICK3DLINE: 'quick3dline',
  QUICK3DSEGMENT: 'quick3dsegment',
} as const;

export const TOOL_PREFERENCE_KEY = 'diedrico-tool-last-used';

const activeTool = ref<ToolType>('select');
const lastUsedByFamily = ref<Record<string, string>>({});
const toolStepMessage = ref<string>('');
let toolFamilies: ToolFamilyConfig[] = [];

export function useToolStore() {
  /**
   * Set the active tool
   */
  function setTool(tool: ToolType) {
    activeTool.value = tool;
    toolStepMessage.value = ''; // Clear step message when tool changes
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
  const lastUsedTools = computed(() => lastUsedByFamily.value);

  /**
   * Initialize tool families configuration
   * Must be called once with TOOL_FAMILIES from config
   */
  function setToolFamilies(families: ToolFamilyConfig[]) {
    toolFamilies = families;
  }

  /**
   * Activate a tool family - uses last-used sub-tool or default
   */
  function activateToolFamily(familyId: string): void {
    const family = toolFamilies.find(f => f.id === familyId);
    if (!family) {
      console.warn(`Tool family not found: ${familyId}`);
      return;
    }

    // Use last-used tool for this family, or default if none
    const toolId = lastUsedByFamily.value[familyId] || family.defaultTool;
    setTool(toolId as ToolType);
  }

  /**
   * Select a specific sub-tool and update last-used memory
   */
  function selectSubTool(familyId: string, toolId: string): void {
    lastUsedByFamily.value[familyId] = toolId;
    setTool(toolId as ToolType);
  }

  /**
   * Get the last-used tool for a family (for UI state)
   */
  function getLastUsedTool(familyId: string): string | undefined {
    return lastUsedByFamily.value[familyId];
  }

  /**
   * Set contextual tool step feedback message
   */
  function setToolStepMessage(message: string) {
    toolStepMessage.value = message;
  }

  function initFromStorage(): void {
    try {
      const stored = localStorage.getItem(TOOL_PREFERENCE_KEY);
      if (stored) {
        lastUsedByFamily.value = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load tool preferences:', error);
    }
  }

  function saveToStorage(): void {
    try {
      localStorage.setItem(TOOL_PREFERENCE_KEY, JSON.stringify(lastUsedByFamily.value));
    } catch (error) {
      console.warn('Failed to save tool preferences:', error);
    }
  }

  /**
   * Get reactive tool step message
   */
  const currentToolStepMessage = computed(() => toolStepMessage.value);

  return {
    currentTool,
    lastUsedTools,
    currentToolStepMessage,
    setTool,
    setToolStepMessage,
    isToolActive,
    setToolFamilies,
    activateToolFamily,
    selectSubTool,
    getLastUsedTool,
    initFromStorage,
    saveToStorage,
  };
}

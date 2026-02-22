/**
 * toolStore.ts - Tool selection state management
 * 
 * Manages the currently active geometric construction tool.
 * When a tool is selected, the canvas changes its interaction mode
 * to match the tool's behavior (point placement, line creation, etc.)
 * 
 * Supports tool families with dropdown menus, last-used sub-tool memory,
 * and configurable completion behavior (stay-active vs return-to-selection).
 * 
 * Reference: specs/001-dihedral-learning-mvp/ui-spec.md - Tool Interactions
 * Reference: specs/001-dihedral-learning-mvp/data-model.md - Phase 67
 */

import { ref, computed } from 'vue';
import type { ToolFamilyConfig, ToolConfig } from '../types/ToolConfig';

export type ToolType = 'select' | 'point' | 'line' | 'circle' | 'segment' | 'guide' | 'intersection' | 'transport' | 'parallel-line' | 'perpendicular-line' | 'tangent-line-to-circle-through-point' | 'tangent-line-to-circle-parallel' | 'create3dpoint' | 'create3dline' | 'create3dsegment' | 'create3dplane' | 'createprojectionplane' | 'interactiveprojectionsetup' | 'quickprojectionsetup' | 'quick3dline' | 'quick3dsegment';

const STORAGE_KEY = 'diedrico-tool-last-used';

const activeTool = ref<ToolType>('select');
const lastUsedByFamily = ref<Record<string, string>>({});
let toolFamilies: ToolFamilyConfig[] = [];

// Load last-used preferences from localStorage on module initialization
function loadFromLocalStorage(): Record<string, string> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.warn('Failed to load last-used tool preferences:', error);
    return {};
  }
}

// Save last-used preferences to localStorage
function saveToLocalStorage(lastUsed: Record<string, string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lastUsed));
  } catch (error) {
    console.warn('Failed to save last-used tool preferences:', error);
  }
}

// Initialize lastUsedByFamily from localStorage
lastUsedByFamily.value = loadFromLocalStorage();

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

  /**
   * Initialize tool families configuration
   * Must be called once with TOOL_FAMILIES from config
   */
  function setToolFamilies(families: ToolFamilyConfig[]) {
    toolFamilies = families;
  }

  /**
   * Find the family that contains the given tool
   */
  function getToolFamily(toolId: string): ToolFamilyConfig | undefined {
    return toolFamilies.find(family => 
      family.tools.some(tool => tool.id === toolId)
    );
  }

  /**
   * Get configuration for a specific tool
   */
  function getToolConfig(toolId: string): ToolConfig | undefined {
    for (const family of toolFamilies) {
      const tool = family.tools.find(t => t.id === toolId);
      if (tool) return tool;
    }
    return undefined;
  }

  /**
   * Get completion behavior for a tool
   */
  function getCompletionBehavior(toolId: string): 'stay-active' | 'return-to-selection' | undefined {
    const config = getToolConfig(toolId);
    return config?.completionBehavior;
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
    // Update last-used for this family
    lastUsedByFamily.value[familyId] = toolId;
    saveToLocalStorage(lastUsedByFamily.value);
    
    // Activate the tool
    setTool(toolId as ToolType);
  }

  /**
   * Get the last-used tool for a family (for UI state)
   */
  function getLastUsedTool(familyId: string): string | undefined {
    return lastUsedByFamily.value[familyId];
  }

  return {
    currentTool,
    setTool,
    isToolActive,
    setToolFamilies,
    getToolFamily,
    getToolConfig,
    getCompletionBehavior,
    activateToolFamily,
    selectSubTool,
    getLastUsedTool
  };
}

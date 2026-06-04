/**
 * ToolConfig.ts - Tool configuration interfaces
 * 
 * Defines the structure for tool families and individual tools.
 * Used by toolStore for managing tool families with dropdown menus,
 * and last-used sub-tool memory.
 * 
 */

import type { Component } from 'vue';

/**
 * Configuration for an individual tool
 */
export interface ToolConfig {
  /** Unique tool identifier (matches ToolType) */
  id: string;
  
  /** Display label for UI */
  label: string;
  
  /** Icon component (Vue SFC component) */
  icon: Component;
  
  /** Optional keyboard shortcut */
  shortcut?: string;
  
  /** Tooltip text shown on hover */
  tooltip: string;
}

/**
 * Configuration for a tool family (dropdown menu group)
 */
export interface ToolFamilyConfig {
  /** Unique family identifier */
  id: string;
  
  /** Display label for family button */
  label: string;
  
  /** Icon component shown on family button */
  icon: Component;
  
  /** Tool ID to use if no last-used preference exists */
  defaultTool: string;
  
  /** Array of tools in this family */
  tools: ToolConfig[];
}

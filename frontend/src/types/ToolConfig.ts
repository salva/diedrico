/**
 * ToolConfig.ts - Tool configuration interfaces
 * 
 * Defines the structure for tool families and individual tools.
 * Used by toolStore for managing tool families with dropdown menus,
 * last-used sub-tool memory, and completion behavior.
 * 
 * Reference: specs/001-dihedral-learning-mvp/data-model.md - Phase 67
 */

/**
 * Configuration for an individual tool
 */
export interface ToolConfig {
  /** Unique tool identifier (matches ToolType) */
  id: string;
  
  /** Display label for UI */
  label: string;
  
  /** Icon identifier (can be emoji or icon class) */
  icon: string;
  
  /** Optional keyboard shortcut */
  shortcut?: string;
  
  /** Tooltip text shown on hover */
  tooltip: string;
  
  /** What happens after tool completes its operation */
  completionBehavior: 'stay-active' | 'return-to-selection';
}

/**
 * Configuration for a tool family (dropdown menu group)
 */
export interface ToolFamilyConfig {
  /** Unique family identifier */
  id: string;
  
  /** Display label for family button */
  label: string;
  
  /** Icon shown on family button */
  icon: string;
  
  /** Tool ID to use if no last-used preference exists */
  defaultTool: string;
  
  /** Array of tools in this family */
  tools: ToolConfig[];
}

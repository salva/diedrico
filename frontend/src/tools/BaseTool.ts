/**
 * BaseTool - Abstract base class for tools with common functionality
 * 
 * Subclasses override handleClick() to implement specific tool behavior.
 * 
 */

import type { ToolContext, ToolResult } from './ITool';

export abstract class BaseTool {
  abstract readonly name: string;
  readonly completionBehavior = 'stay-active' as const;

  /**
   * Abstract method: subclasses implement specific tool behavior
   */
  abstract handleClick(context: ToolContext): ToolResult;

  /**
   * Optional: Cancel ongoing operation
   */
  cancel?(): void;

  /**
   * Optional: Get current tool state
   */
  getState?(): Record<string, any>;
}

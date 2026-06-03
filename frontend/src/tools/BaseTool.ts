/**
 * BaseTool - Abstract base class for tools with common functionality
 * 
 * Provides helper methods for:
 * - Completion behavior (stay-active vs return-to-selection)
 * 
 * Subclasses override handleClick() to implement specific tool behavior.
 * Subclasses must declare completionBehavior to control post-operation behavior.
 * 
 */

import type { ToolContext, ToolResult } from './ITool';

export abstract class BaseTool {
  abstract readonly name: string;

  /**
   * Completion behavior: what happens after tool completes its operation
   * - 'stay-active': Tool remains active for repeated use (primitives: Point, Line, Segment, Circle)
   * - 'return-to-selection': Tool deactivates to selection mode (complex: Tangent, Intersection, etc.)
   */
  abstract readonly completionBehavior: 'stay-active' | 'return-to-selection';

  /**
   * Abstract method: subclasses implement specific tool behavior
   */
  abstract handleClick(context: ToolContext): ToolResult;

  /**
   * Handle tool completion: switch tool or stay active based on completionBehavior
   * Should be called after successful operation, before returning success result
   * 
   * @param completeTool Callback for completing return-to-selection tools
   */
  protected handleCompletion(completeTool?: () => void): void {
    if (this.completionBehavior === 'return-to-selection') {
      completeTool?.();
    }
    // If 'stay-active', do nothing - tool already called reset() to prepare for next operation
  }

  /**
   * Optional: Cancel ongoing operation
   */
  cancel?(): void;

  /**
   * Optional: Get current tool state
   */
  getState?(): Record<string, any>;
}

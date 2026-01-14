/**
 * BaseTool - Abstract base class for tools with common functionality
 * 
 * Provides helper methods for:
 * - Coordinate validation
 * - Element lookup and validation
 * - Error handling
 * - Completion behavior (stay-active vs return-to-selection)
 * 
 * Subclasses override handleClick() to implement specific tool behavior.
 * Subclasses must declare completionBehavior to control post-operation behavior.
 * 
 * Reference: specs/001-dihedral-learning-mvp/data-model.md - Phase 67
 */

import type { Vector3 } from 'three';
import type { ITool, ToolContext, ToolResult } from './ITool';
import type { SelectionMask } from '@/types/SelectionMask';
import type { World } from '@/domain/world/World';
import type { useToolStore } from '@/stores/toolStore';

export abstract class BaseTool implements ITool {
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
   * Abstract method: subclasses implement selection mask based on tool state
   */
  abstract getSelectionMask(): SelectionMask;

  /**
   * Handle tool completion: switch tool or stay active based on completionBehavior
   * Should be called after successful operation, before returning success result
   * 
   * @param toolStore Tool store for switching active tool
   */
  protected handleCompletion(toolStore: ReturnType<typeof useToolStore>): void {
    if (this.completionBehavior === 'return-to-selection') {
      toolStore.setTool('select');
    }
    // If 'stay-active', do nothing - tool already called reset() to prepare for next operation
  }

  /**
   * Abstract method: subclasses implement selection mask based on tool state
   */
  abstract getSelectionMask(): SelectionMask;

  /**
   * Validate that coordinates are within reasonable bounds
   */
  protected validateCoordinates(coords: Vector3): boolean {
    // Check for NaN or infinite values
    if (!isFinite(coords.x) || !isFinite(coords.y) || !isFinite(coords.z)) {
      return false;
    }
    
    // Homogeneous coordinates should have w=1 for 2D points
    if (coords.z !== 1) {
      return false;
    }
    
    return true;
  }

  /**
   * Validate that a plane exists in the world
   */
  protected validatePlane(planeId: string, world: World): boolean {
    const plane = world.getProjectionPlaneById(planeId);
    return plane !== undefined;
  }

  /**
   * Create a success result
   */
  protected success(message?: string): ToolResult {
    return {
      success: true,
      message
    };
  }

  /**
   * Create a failure result
   */
  protected failure(message: string): ToolResult {
    return {
      success: false,
      message
    };
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

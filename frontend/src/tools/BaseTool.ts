/**
 * BaseTool - Abstract base class for tools with common functionality
 * 
 * Provides helper methods for:
 * - Coordinate validation
 * - Element lookup and validation
 * - Error handling
 * 
 * Subclasses override handleClick() to implement specific tool behavior.
 */

import type { Vector3 } from 'three';
import type { ITool, ToolContext, ToolResult } from './ITool';
import type { World } from '@/domain/world/World';

export abstract class BaseTool implements ITool {
  abstract readonly name: string;

  /**
   * Abstract method: subclasses implement specific tool behavior
   */
  abstract handleClick(context: ToolContext): ToolResult;

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

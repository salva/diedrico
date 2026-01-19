/**
 * ITool - Interface for geometric construction tools
 * 
 * Tools are responsible for translating user input into commands.
 * They handle the interaction logic and validation, then create
 * and execute commands via the CommandStack.
 * 
 * Reference: specs/001-dihedral-learning-mvp/ui-spec.md §Tool Interactions
 * 
 * Architecture:
 * User input → Tool.handleClick() → Command creation → CommandStack.push()
 * 
 * Tools do NOT mutate World directly - they always go through commands.
 */

import type { Vector3 } from 'three';
import type { CommandStack } from '@/commands/CommandStack';
import type { World } from '@/domain/world/World';
import type { Paper } from '@/domain/presentation/Paper';
import type { SelectionMask } from '@/types/SelectionMask';
import type { useToolStore } from '@/stores/toolStore';

/**
 * Context provided to tools when handling user input
 */
export interface ToolContext {
  planeId: string;          // Which projection plane the click occurred on
  planeCoords: Vector3;     // Click position in plane intrinsic coordinates (u, v, 1)
  canvasCoords: { x: number; y: number }; // Click position in canvas/screen pixels
  commandStack: CommandStack;  // Stack for executing commands
  world: World;             // World for validation and queries
  paper: Paper;             // Paper for spatial queries (hit testing, snapping)
  paperToPlaneTransform: any;  // Transform matrix from paper to plane coordinates (Matrix3 | undefined)
  toolStore: ReturnType<typeof useToolStore>; // Tool store for managing tool state and completion behavior
}

/**
 * Result of a tool operation
 */
export interface ToolResult {
  success: boolean;
  message?: string;  // User-facing message (success or error)
}

/**
 * Base interface for all tools
 */
export interface ITool {
  /**
   * Tool identifier (matches ToolType from toolStore)
   */
  readonly name: string;
  
  /**
   * Handle a click event on the canvas
   * 
   * @param context - Tool context with planeId, coords (plane+canvas), commandStack, world
   * @returns Result indicating success/failure and optional message
   */
  handleClick(context: ToolContext): ToolResult;
  
  /**
   * Optional: Cancel ongoing multi-step operation
   */
  cancel?(): void;
  
  /**
   * Optional: Get current tool state for UI feedback
   */
  getState?(): Record<string, any>;
}

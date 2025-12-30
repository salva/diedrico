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
 * User input → Tool.handleClick() → Command creation → CommandStack.execute()
 * 
 * Tools do NOT mutate World directly - they always go through commands.
 */

import type { Vector3 } from 'three';
import type { CommandStack } from '@/commands/CommandStack';
import type { World } from '@/domain/world/World';

/**
 * Context provided to tools when handling user input
 */
export interface ToolContext {
  planeId: string;          // Which projection plane the click occurred on
  commandStack: CommandStack;  // Stack for executing commands
  world: World;             // World for validation and queries
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
   * @param coords - Plane intrinsic coordinates (u, v, 1)
   * @param context - Tool context with planeId, commandStack, world
   * @returns Result indicating success/failure and optional message
   */
  handleClick(coords: Vector3, context: ToolContext): ToolResult;
  
  /**
   * Optional: Cancel ongoing multi-step operation
   */
  cancel?(): void;
  
  /**
   * Optional: Get current tool state for UI feedback
   */
  getState?(): Record<string, any>;
}

/**
 * PointTool - Tool for creating free points
 * 
 * Handles user clicks and creates CreateFreePointCommand.
 * Validates coordinates and plane existence before creating points.
 * 
 * Reference: specs/001-dihedral-learning-mvp/spec.md §US1
 */

import type { Vector3 } from 'three';
import { BaseTool } from './BaseTool';
import type { ToolContext, ToolResult } from './ITool';
import { CreateFreePointCommand } from '@/commands/CreateFreePointCommand';
import type { SelectionMask } from '@/types/SelectionMask';

export class PointTool extends BaseTool {
  readonly name = 'point';

  /**
   * Handle click to create a free point
   */
  handleClick(context: ToolContext): ToolResult {
    const { planeId, planeCoords, commandStack, world } = context;

    // Validate coordinates
    if (!this.validateCoordinates(planeCoords)) {
      return this.failure('Invalid coordinates');
    }

    // Validate plane exists
    if (!this.validatePlane(planeId, world)) {
      return this.failure(`Plane not found: ${planeId}`);
    }

    try {
      // Create and execute command
      const command = new CreateFreePointCommand(planeCoords, planeId, world);
      commandStack.execute(command);

      const pointId = command.getPointId();
      return this.success(`Created point ${pointId}`);
      
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return this.failure(`Failed to create point: ${message}`);
    }
  }

  /**
   * Get selection mask - point tool creates new points, doesn't select existing elements
   * Empty mask means nothing is selectable (user clicks anywhere to create)
   */
  getSelectionMask(): SelectionMask {
    return []; // Nothing selectable - creates free points at click position
  }
}

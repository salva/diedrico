/**
 * PointTool - Tool for creating free points
 * 
 * Handles user clicks and builds generic Command with AddFreePoint2DOp.
 * Validates coordinates and plane existence before creating points.
 * 
 * Reference: specs/001-dihedral-learning-mvp/spec.md §US1
 */

import type { Vector3 } from 'three';
import { BaseTool } from './BaseTool';
import type { ToolContext, ToolResult } from './ITool';
import { Command } from '@/commands/Command';
import { AddFreePoint2DOp } from '@/commands/operations/world/AddFreePointOp';
import { createPointAction } from '@/domain/processTree/actions/CreatePointAction';
import { SelectionMask } from '@/types/SelectionMask';

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
      // Build Command directly
      const cmd = new Command("Create free point", world);
      
      // Use return value from addAndExecute
      const result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, planeCoords));
      
      // Extract outputs
      const pointId = result.outputs.pointId;
      
      // Record ProcessTree action using pointId from outputs
      const action = createPointAction(pointId, planeId, planeCoords);
      world.getProcessTree().addAction(action);
      
      // Commit
      cmd.commit();
      
      // Push to stack
      commandStack.push(cmd);

      return this.success(`Created point ${pointId}`);
      
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return this.failure(`Failed to create point: ${message}`);
    }
  }

  /**
   * Get selection mask - point tool creates new points, doesn't select existing elements
   * Uses explicit NoneMask to indicate nothing is selectable
   */
  getSelectionMask(): SelectionMask {
    return SelectionMask.none(); // Nothing selectable - creates free points at click position
  }
}

/**
 * CircleTool - Tool for creating circles by center point and radius
 * 
 * Implements two-click workflow:
 * 1. First click: Select center point (snaps to existing point)
 * 2. Second click: Set radius (distance from center to click position)
 * 3. Create circle with the specified center and radius
 * 
 * The tool calculates radius as the distance from center to the second click point,
 * allowing intuitive circle sizing by clicking at the desired circumference.
 * 
 * Reference: specs/001-dihedral-learning-mvp/spec.md §US2 - Create circles
 */

import { Vector3 } from 'three';
import { BaseTool } from './BaseTool';
import type { ToolContext, ToolResult } from './ITool';
import { Command } from '@/commands/Command';
import { AddCircle2DByCenterAndRadiusOp } from '@/commands/operations/AddCircleOp';
import { createCircleAction } from '@/domain/processTree/actions/CreateCircleAction';
import type { SelectionMask } from '@/types/SelectionMask';

/**
 * CircleTool state machine:
 * - State 0: Waiting for center point
 * - State 1: Center selected, waiting for radius point
 */
export class CircleTool extends BaseTool {
  readonly name = 'circle';
  private state: 'waiting-center' | 'waiting-radius' = 'waiting-center';
  private centerPointId?: string;
  private centerPosition?: Vector3;  // Store center position for radius calculation

  /**
   * Handle click event for circle creation
   * 
   * Two-click workflow:
   * 1. First click: Record center point
   * 2. Second click: Calculate radius and create circle
   */
  handleClick(context: ToolContext): ToolResult {
    const { planeId, planeCoords, canvasCoords, commandStack, world, paper, paperToPlaneTransform } = context;
    
    // Validate coordinates
    if (!this.validateCoordinates(planeCoords)) {
      return this.failure('Invalid coordinates');
    }
    
    // Validate plane exists
    if (!this.validatePlane(planeId, world)) {
      return this.failure(`Plane not found: ${planeId}`);
    }

    // State machine
    if (this.state === 'waiting-center') {
      // First click: Select center point
      
      // Use Paper.hitTest() for spatial queries
      const canvasPos = new Vector3(canvasCoords.x, canvasCoords.y, 1);
      const hit = paper.hitTest(canvasPos, 20, planeId, paperToPlaneTransform, world); // 20px snap radius
      
      console.log('[CircleTool] Paper.hitTest() result for center:', hit);
      
      // Filter for points only
      if (!hit || hit.elementType !== 'point') {
        return this.failure('No point found at click position. Please click near an existing point for the circle center.');
      }

      // Record center point
      this.centerPointId = hit.elementId;
      
      // Get center position for radius calculation
      const centerRealization = world.getPoint2DRealization(hit.elementId);
      if (!centerRealization) {
        this.reset();
        return this.failure('Failed to get center point position');
      }
      
      this.centerPosition = centerRealization.position.clone();
      this.state = 'waiting-radius';
      
      return this.success(`Selected center point: ${hit.elementId}. Click to set radius.`);
      
    } else {
      // Second click: Set radius and create circle
      
      // Calculate radius as distance from center to click position
      const clickPos = new Vector3(planeCoords.x, planeCoords.y, planeCoords.z);
      const radius = this.centerPosition!.distanceTo(clickPos);
      
      // Validate minimum radius
      if (radius < 1e-3) {
        this.reset();
        return this.failure('Radius too small. Please click farther from center.');
      }
      
      try {
        // Build Command directly
        const cmd = new Command("Create circle", world);
        
        // Use return value from addAndExecute
        const result = cmd.addAndExecute(new AddCircle2DByCenterAndRadiusOp(planeId, this.centerPointId!, radius));
        
        // Extract outputs
        const circleId = result.outputs.circleId;
        
        // Record ProcessTree action using circleId from outputs
        const action = createCircleAction(circleId, planeId, this.centerPointId!, radius);
        world.getProcessTree().addAction(action);
        
        // Commit
        cmd.commit();
        
        // Push to stack
        commandStack.push(cmd);
        
        const centerPointId = this.centerPointId; // Save before reset
        
        // Reset state for next circle
        this.reset();
        
        return this.success(`Created circle ${circleId} with center ${centerPointId} and radius ${radius.toFixed(2)}`);
        
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.reset();
        return this.failure(`Failed to create circle: ${message}`);
      }
    }
  }

  /**
   * Cancel current circle creation
   */
  cancel(): void {
    this.reset();
  }

  /**
   * Get selection mask - circle tool only selects points for both steps
   */
  getSelectionMask(): SelectionMask {
    return ['point'];
  }

  /**
   * Get current tool state
   */
  getState(): Record<string, any> {
    return {
      state: this.state,
      centerPointId: this.centerPointId,
      centerPosition: this.centerPosition
    };
  }

  /**
   * Reset tool state for new circle
   */
  private reset(): void {
    this.state = 'waiting-center';
    this.centerPointId = undefined;
    this.centerPosition = undefined;
  }
}

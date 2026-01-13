/**
 * CircleTool - Tool for creating circles by center point and circumference point
 * 
 * Implements two-click workflow:
 * 1. First click: Select/create center point
 * 2. Second click: Create/select circumference point (defines radius vector)
 * 3. Create circle with these two points
 * 
 * The circumference point defines both the radius magnitude and angle zero reference,
 * ensuring stable intersection indexing per Diedrico principles.
 * 
 * Reference: specs/001-dihedral-learning-mvp/spec.md §US2 - Create circles
 */

import { Vector3 } from 'three';
import { BaseTool } from './BaseTool';
import type { ToolContext, ToolResult } from './ITool';
import { Command } from '@/commands/Command';
import { AddCircle2DByCenterAndPointOp } from '@/commands/operations/world/AddCircleOp';
import { AddFreePoint2DOp } from '@/commands/operations/world/AddFreePointOp';
import { createCircleAction } from '@/domain/processTree/actions/CreateCircleAction';
import type { SelectionMask } from '@/types/SelectionMask';

/**
 * CircleTool state machine:
 * - State 0: Waiting for center point
 * - State 1: Center selected, waiting for circumference point
 */
export class CircleTool extends BaseTool {
  readonly name = 'circle';
  private state: 'waiting-center' | 'waiting-circumference' = 'waiting-center';
  private centerPointId?: string;

  /**
   * Handle click event for circle creation
   * 
   * Two-click workflow:
   * 1. First click: Record center point
   * 2. Second click: Create/select circumference point and create circle
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
      const selectionMask = this.getSelectionMask();
      const hit = paper.hitTest(canvasPos, 50, planeId, paperToPlaneTransform, world, selectionMask); // 50px snap radius for better point detection
      
      console.log('[CircleTool] Paper.hitTest() result for center:', hit);
      
      // Selection mask ensures only points are returned
      if (!hit) {
        return this.failure('No point found at click position. Please click near an existing point for the circle center.');
      }

      // Record center point
      this.centerPointId = hit.elementId;
      this.state = 'waiting-circumference';
      
      return this.success(`Selected center point: ${hit.elementId}. Click to set circumference point.`);
      
    } else {
      // Second click: Select/create circumference point and create circle
      
      // Use Paper.hitTest() to check for nearby points (consistent with first click)
      const canvasPos = new Vector3(canvasCoords.x, canvasCoords.y, 1);
      const selectionMask = this.getSelectionMask(); // ['point']
      const hit = paper.hitTest(canvasPos, 50, planeId, paperToPlaneTransform, world, selectionMask);
      
      try {
        const cmd = new Command("Create circle", world);
        let circumferencePointId: string;
        let wasSnapped = false;
        
        if (hit) {
          // Snap to existing point
          circumferencePointId = hit.elementId;
          wasSnapped = true;
          console.log('[CircleTool] Snapped to existing circumference point:', circumferencePointId);
        } else {
          // Create new free point at click position
          const circumferencePos = new Vector3(planeCoords.x, planeCoords.y, planeCoords.z);
          const pointResult = cmd.addAndExecute(new AddFreePoint2DOp(planeId, circumferencePos));
          circumferencePointId = pointResult.outputs.pointId;
          console.log('[CircleTool] Created new circumference point:', circumferencePointId);
        }
        
        // Validate minimum radius before creating circle
        const plane = world.getProjectionPlaneById(planeId);
        const centerPoint = plane?.getPoint(this.centerPointId!);
        const circumferencePoint = plane?.getPoint(circumferencePointId);
        const centerRealization = centerPoint?.realize2D(world);
        const circumferenceRealization = circumferencePoint?.realize2D(world);
        
        if (centerRealization && circumferenceRealization) {
          const radius = centerRealization.position.distanceTo(circumferenceRealization.position);
          if (radius < 1e-3) {
            cmd.rollback();
            this.reset();
            return this.failure('Radius too small. Please click farther from center.');
          }
        }
        
        // Operation 2: Create circle using center and circumference points
        const result = cmd.addAndExecute(new AddCircle2DByCenterAndPointOp(
          planeId,
          this.centerPointId!,
          circumferencePointId
        ));
        
        // Extract outputs
        const circleId = result.outputs.circleId;
        
        // Record ProcessTree action using circleId from outputs
        // Note: createCircleAction currently expects radius, but will be updated to use two points
        const action = createCircleAction(circleId, planeId, this.centerPointId!, 0);  // radius=0 as placeholder
        world.getProcessTree().addAction(action);
        
        // Commit
        cmd.commit();
        
        // Push to stack
        commandStack.push(cmd);
        
        const centerPointId = this.centerPointId; // Save before reset
        const pointStatus = wasSnapped ? 'snapped' : 'created';
        
        // Reset state for next circle
        this.reset();
        
        return this.success(`Created circle ${circleId} with center ${centerPointId} and circumference ${circumferencePointId} (${pointStatus})`);
        
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
      centerPointId: this.centerPointId
    };
  }

  /**
   * Reset tool state for new circle
   */
  private reset(): void {
    this.state = 'waiting-center';
    this.centerPointId = undefined;
  }
}

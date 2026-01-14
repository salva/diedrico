/**
 * SegmentTool - Tool for creating finite line segments between two points
 * 
 * Implements two-click workflow:
 * 1. First click: Select start point (snaps to existing point)
 * 2. Second click: Select end point (snaps to existing point)
 * 3. Create segment connecting the two points
 * 
 * Unlike LineTool which creates infinite lines, SegmentTool creates finite segments
 * that only exist between their two endpoints.
 * 
 * Reference: specs/001-dihedral-learning-mvp/spec.md §US2
 */

import { Vector3 } from 'three';
import { BaseTool } from './BaseTool';
import type { ToolContext, ToolResult } from './ITool';
import { Command } from '@/commands/Command';
import { AddSegment2DByPointsOp } from '@/commands/operations/world/AddSegmentOp';
import { createSegmentAction } from '@/domain/processTree/actions/CreateSegmentAction';
import { SelectionMask } from '@/types/SelectionMask';

/**
 * SegmentTool state machine:
 * - State 0: Waiting for first point
 * - State 1: First point selected, waiting for second point
 */
export class SegmentTool extends BaseTool {
  readonly name = 'segment';
  private state: 'waiting-first' | 'waiting-second' = 'waiting-first';
  private firstPointId?: string;

  /**
   * Handle click event for segment creation
   * 
   * Two-click workflow:
   * 1. First click: Record start point
   * 2. Second click: Create segment
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

    // Use Paper.hitTest() for spatial queries with correct coordinate transforms
    // Convert canvas coordinates to homogeneous Vector3
    const canvasPos = new Vector3(canvasCoords.x, canvasCoords.y, 1);
    const selectionMask = this.getSelectionMask();
    const hit = paper.hitTest(canvasPos, 50, planeId, paperToPlaneTransform, world, selectionMask); // 50px snap radius for better point detection
    
    console.log('[SegmentTool] Paper.hitTest() result:', hit);
    
    // Selection mask ensures only points are returned
    if (!hit) {
      return this.failure('No point found at click position. Please click near an existing point.');
    }

    // State machine
    if (this.state === 'waiting-first') {
      // First click: Record start point
      this.firstPointId = hit.elementId;
      this.state = 'waiting-second';
      return this.success(`Selected first point: ${hit.elementId}`);
      
    } else {
      // Second click: Create segment
      const secondPointId = hit.elementId;
      
      // Validate different points
      if (secondPointId === this.firstPointId) {
        // Same point clicked twice - reset state
        this.reset();
        return this.failure('Cannot create segment: same point selected twice');
      }
      
      try {
        // Build Command directly
        const cmd = new Command("Create segment", world);
        
        // Use return value from addAndExecute
        const result = cmd.addAndExecute(new AddSegment2DByPointsOp(planeId, this.firstPointId!, secondPointId));
        
        // Extract outputs
        const segmentId = result.outputs.segmentId;
        
        // Record ProcessTree action using segmentId from outputs
        const action = createSegmentAction(segmentId, planeId, this.firstPointId!, secondPointId);
        world.getProcessTree().addAction(action);
        
        // Commit
        cmd.commit();
        
        // Push to stack
        commandStack.push(cmd);
        
        const firstPointId = this.firstPointId; // Save before reset
        
        // Reset state for next segment
        this.reset();
        
        return this.success(`Created segment ${segmentId} between ${firstPointId} and ${secondPointId}`);
        
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.reset();
        return this.failure(`Failed to create segment: ${message}`);
      }
    }
  }

  /**
   * Cancel current segment creation
   */
  cancel(): void {
    this.reset();
  }

  /**
   * Get selection mask - segment tool only selects points
   */
  getSelectionMask(): SelectionMask {
    return SelectionMask.point();
  }

  /**
   * Get current tool state
   */
  getState(): Record<string, any> {
    return {
      state: this.state,
      firstPointId: this.firstPointId
    };
  }

  /**
   * Reset tool state for new segment
   */
  private reset(): void {
    this.state = 'waiting-first';
    this.firstPointId = undefined;
  }
}

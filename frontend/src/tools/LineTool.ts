/**
 * LineTool - Tool for creating lines through two points
 * 
 * Implements two-click workflow:
 * 1. First click: Select start point (snaps to existing point)
 * 2. Second click: Select end point (snaps to existing point)
 * 3. Create line connecting the two points
 * 
 * Reference: specs/001-dihedral-learning-mvp/spec.md §US2
 */

import { Vector3 } from 'three';
import { BaseTool } from './BaseTool';
import type { ToolContext, ToolResult } from './ITool';
import { Command } from '@/commands/Command';
import { AddLine2DByTwoPointsOp } from '@/commands/operations/AddLineOp';
import { createLineAction } from '@/domain/processTree/actions/CreateLineAction';
import type { SelectionMask } from '@/types/SelectionMask';

/**
 * LineTool state machine:
 * - State 0: Waiting for first point
 * - State 1: First point selected, waiting for second point
 */
export class LineTool extends BaseTool {
  readonly name = 'line';
  private state: 'waiting-first' | 'waiting-second' = 'waiting-first';
  private firstPointId?: string;

  /**
   * Handle click event for line creation
   * 
   * Two-click workflow:
   * 1. First click: Record start point
   * 2. Second click: Create line
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
    const hit = paper.hitTest(canvasPos, 20, planeId, paperToPlaneTransform, world); // 20px snap radius
    
    console.log('[LineTool] Paper.hitTest() result:', hit);
    
    // Filter for points only (for now, line tool only snaps to points)
    if (!hit || hit.elementType !== 'point') {
      return this.failure('No point found at click position. Please click near an existing point.');
    }

    // State machine
    if (this.state === 'waiting-first') {
      // First click: Record start point
      this.firstPointId = hit.elementId;
      this.state = 'waiting-second';
      return this.success(`Selected first point: ${hit.elementId}`);
      
    } else {
      // Second click: Create line
      const secondPointId = hit.elementId;
      
      // Validate different points
      if (secondPointId === this.firstPointId) {
        // Same point clicked twice - reset state
        this.reset();
        return this.failure('Cannot create line: same point selected twice');
      }
      
      try {
        // Build Command directly
        const cmd = new Command("Create line", world);
        
        // Use return value from addAndExecute
        const result = cmd.addAndExecute(new AddLine2DByTwoPointsOp(planeId, this.firstPointId!, secondPointId));
        
        // Extract outputs
        const lineId = result.outputs.lineId;
        
        // Record ProcessTree action using lineId from outputs
        const action = createLineAction(lineId, this.firstPointId!, secondPointId, planeId);
        world.getProcessTree().addAction(action);
        
        // Commit
        cmd.commit();
        
        // Push to stack
        commandStack.push(cmd);
        
        const firstPointId = this.firstPointId; // Save before reset
        
        // Reset state for next line
        this.reset();
        
        return this.success(`Created line ${lineId} between ${firstPointId} and ${secondPointId}`);
        
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.reset();
        return this.failure(`Failed to create line: ${message}`);
      }
    }
  }

  /**
   * Cancel current line creation
   */
  cancel(): void {
    this.reset();
  }

  /**
   * Get selection mask - line tool only selects points
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
      firstPointId: this.firstPointId
    };
  }

  /**
   * Reset tool state
   */
  private reset(): void {
    this.state = 'waiting-first';
    this.firstPointId = undefined;
  }
}

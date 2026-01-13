/**
 * ParallelLineTool - Tool for creating lines parallel to a reference line through a point
 * 
 * Implements two-click workflow:
 * 1. First click: Select reference line
 * 2. Second click: Select through-point (snaps to existing point)
 * 3. Create parallel line
 * 
 * Reference: specs/001-dihedral-learning-mvp/spec.md §Line tool family - Parallel line through point
 */

import { Vector3 } from 'three';
import { BaseTool } from './BaseTool';
import type { ToolContext, ToolResult } from './ITool';
import { Command } from '@/commands/Command';
import { AddLine2DParallelToLineOp } from '@/commands/operations/world/AddLineOp';
import { createParallelLineAction } from '@/domain/processTree/actions/CreateParallelLineAction';
import type { SelectionMask } from '@/types/SelectionMask';

/**
 * ParallelLineTool state machine:
 * - State 'waiting-line': Waiting for reference line
 * - State 'waiting-point': Reference line selected, waiting for through-point
 */
export class ParallelLineTool extends BaseTool {
  readonly name = 'parallel-line';
  private state: 'waiting-line' | 'waiting-point' = 'waiting-line';
  private referenceLineId?: string;

  /**
   * Handle click event for parallel line creation
   * 
   * Two-click workflow:
   * 1. First click: Record reference line
   * 2. Second click: Create parallel line
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
    const canvasPos = new Vector3(canvasCoords.x, canvasCoords.y, 1);
    const selectionMask = this.getSelectionMask();
    const hit = paper.hitTest(canvasPos, 50, planeId, paperToPlaneTransform, world, selectionMask);
    
    console.log('[ParallelLineTool] Paper.hitTest() result:', hit);
    
    if (!hit) {
      const expectedType = this.state === 'waiting-line' ? 'line' : 'point';
      return this.failure(`No ${expectedType} found at click position.`);
    }

    // State machine
    if (this.state === 'waiting-line') {
      // First click: Record reference line
      this.referenceLineId = hit.elementId;
      this.state = 'waiting-point';
      return this.success(`Selected reference line: ${hit.elementId}`);
      
    } else {
      // Second click: Create parallel line
      const throughPointId = hit.elementId;
      
      try {
        // Build Command directly
        const cmd = new Command("Create parallel line", world);
        
        // Use return value from addAndExecute
        const result = cmd.addAndExecute(
          new AddLine2DParallelToLineOp(planeId, this.referenceLineId!, throughPointId)
        );
        
        // Extract outputs
        const lineId = result.outputs.lineId;
        
        // Record ProcessTree action using lineId from outputs
        const action = createParallelLineAction(
          lineId,
          planeId,
          this.referenceLineId!,
          throughPointId
        );
        world.getProcessTree().addAction(action);
        
        // Commit
        cmd.commit();
        
        // Push to stack
        commandStack.push(cmd);
        
        const referenceLineId = this.referenceLineId; // Save before reset
        
        // Reset state for next line
        this.reset();
        
        return this.success(`Created parallel line ${lineId} parallel to ${referenceLineId} through ${throughPointId}`);
        
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.reset();
        return this.failure(`Failed to create parallel line: ${message}`);
      }
    }
  }

  /**
   * Cancel current parallel line creation
   */
  cancel(): void {
    this.reset();
  }

  /**
   * Get selection mask - parallel line tool selects lines first, then points
   */
  getSelectionMask(): SelectionMask {
    if (this.state === 'waiting-line') {
      return ['line'];  // Also works with guides/segments as they extend Line2D
    } else {
      return ['point'];
    }
  }

  /**
   * Get current tool state
   */
  getState(): Record<string, any> {
    return {
      state: this.state,
      referenceLineId: this.referenceLineId
    };
  }

  /**
   * Reset tool state
   */
  private reset(): void {
    this.state = 'waiting-line';
    this.referenceLineId = undefined;
  }
}

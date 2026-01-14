/**
 * ParallelLineTool - Tool for creating lines parallel to a reference line through a point
 * 
 * Implements flexible two-click workflow (Phase 62):
 * - Accepts arguments in either order: point→line or line→point
 * - Accepts any Line2D subtype as reference (lines, segments, guides, half-hinge-lines)
 * 
 * Workflow:
 * 1. First click: Select reference line (any Line2D) OR point
 * 2. Second click: Select the other argument (opposite of first)
 * 3. Create parallel line
 * 
 * Reference: specs/001-dihedral-learning-mvp/spec.md §FR-047
 */

import { Vector3 } from 'three';
import { BaseTool } from './BaseTool';
import type { ToolContext, ToolResult } from './ITool';
import { Command } from '@/commands/Command';
import { AddLine2DParallelToLineOp } from '@/commands/operations/world/AddLineOp';
import { createParallelLineAction } from '@/domain/processTree/actions/CreateParallelLineAction';
import type { SelectionMask } from '@/types/SelectionMask';

/**
 * ParallelLineTool state machine (Phase 62: flexible workflow):
 * - State 'waiting-first': Waiting for either point or reference line (any Line2D)
 * - State 'waiting-second': First argument selected, waiting for the other type
 */
export class ParallelLineTool extends BaseTool {
  readonly name = 'parallel-line';
  private state: 'waiting-first' | 'waiting-second' = 'waiting-first';
  private referenceLineId?: string;
  private throughPointId?: string;

  /**
   * Handle click event for parallel line creation
   * 
   * Flexible two-click workflow (Phase 62):
   * 1. First click: Accept either point or any-line reference
   * 2. Second click: Accept the opposite type
   * 3. Create parallel line once both collected
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
      if (this.state === 'waiting-first') {
        return this.failure('No point or line found at click position.');
      } else {
        const expectedType = this.referenceLineId ? 'point' : 'line';
        return this.failure(`No ${expectedType} found at click position.`);
      }
    }

    // State machine with flexible argument order
    if (this.state === 'waiting-first') {
      // First click: Accept either point or any-line
      if (hit.elementType === 'point') {
        this.throughPointId = hit.elementId;
        this.state = 'waiting-second';
        return this.success(`Selected point: ${hit.elementId}. Now select reference line.`);
      } else {
        // any-line type (line, segment, guide, half-hinge-line)
        this.referenceLineId = hit.elementId;
        this.state = 'waiting-second';
        return this.success(`Selected reference ${hit.elementType}: ${hit.elementId}. Now select through-point.`);
      }
      
    } else {
      // Second click: Complete the pair
      if (this.referenceLineId) {
        // First was line, second must be point
        this.throughPointId = hit.elementId;
      } else {
        // First was point, second must be line
        this.referenceLineId = hit.elementId;
      }
      
      try {
        // Build Command directly
        const cmd = new Command("Create parallel line", world);
        
        // Use return value from addAndExecute
        const result = cmd.addAndExecute(
          new AddLine2DParallelToLineOp(planeId, this.referenceLineId!, this.throughPointId!)
        );
        
        // Extract outputs
        const lineId = result.outputs.lineId;
        
        // Record ProcessTree action using lineId from outputs
        const action = createParallelLineAction(
          lineId,
          planeId,
          this.referenceLineId!,
          this.throughPointId!
        );
        world.getProcessTree().addAction(action);
        
        // Commit
        cmd.commit();
        
        // Push to stack
        commandStack.push(cmd);
        
        const referenceLineId = this.referenceLineId; // Save before reset
        
        // Reset state for next line
        this.reset();
        
        return this.success(`Created parallel line ${lineId} parallel to ${referenceLineId} through ${this.throughPointId}`);
        
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
   * Get selection mask - flexible workflow (Phase 62)
   * 
   * Returns:
   * - waiting-first: ['point', 'any-line'] - accept either first
   * - waiting-second: ['point'] if line selected first, ['any-line'] if point selected first
   */
  getSelectionMask(): SelectionMask {
    if (this.state === 'waiting-first') {
      // Accept either point or any-line first
      return ['point', 'any-line'];
    } else {
      // Return opposite of what was selected first
      if (this.referenceLineId) {
        return ['point']; // Line selected first, need point
      } else {
        return ['any-line']; // Point selected first, need line
      }
    }
  }

  /**
   * Get current tool state
   */
  getState(): Record<string, any> {
    return {
      state: this.state,
      referenceLineId: this.referenceLineId,
      throughPointId: this.throughPointId
    };
  }

  /**
   * Reset tool state
   */
  private reset(): void {
    this.state = 'waiting-first';
    this.referenceLineId = undefined;
    this.throughPointId = undefined;
  }
}

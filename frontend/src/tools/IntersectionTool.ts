/**
 * IntersectionTool - Tool for creating intersection points between two lines
 * 
 * Two-click workflow:
 * 1. Click first line (visual feedback via message)
 * 2. Click second line → create intersection point if lines intersect
 * 
 * Validation:
 * - Both clicks must hit lines (not other elements)
 * - Lines must not be parallel (cross product check)
 * - Lines must not be the same line
 * 
 * @see specs/001-dihedral-learning-mvp/tasks.md#phase-14-line-line-intersections
 */

import { Vector3 } from 'three';
import { BaseTool } from './BaseTool';
import type { ToolContext, ToolResult } from './ITool';
import type { SelectionMask } from '@/types/SelectionMask';
import { Command } from '@/commands/Command';
import { AddIntersectionPoint2DOp } from '@/commands/operations/AddIntersectionPointOp';
import { createIntersectionPointAction } from '@/domain/processTree/actions/CreateIntersectionPointAction';
import { areLinesParallel } from '@/domain/calculations/Intersections';

/**
 * IntersectionTool state machine:
 * - State 0: Waiting for first line selection
 * - State 1: First line selected, waiting for second line
 */
export class IntersectionTool extends BaseTool {
  readonly name = 'intersection';
  private state: 'waiting-first-line' | 'waiting-second-line' = 'waiting-first-line';
  private firstLineId?: string;

  /**
   * Handle click event for intersection point creation
   * 
   * Two-click workflow:
   * 1. First click: Select first line
   * 2. Second click: Select second line and create intersection
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
    if (this.state === 'waiting-first-line') {
      // First click: Select first line
      
      // Use Paper.hitTest() for spatial queries
      const canvasPos = new Vector3(canvasCoords.x, canvasCoords.y, 1);
      const hit = paper.hitTest(canvasPos, 20, planeId, paperToPlaneTransform, world); // 20px snap radius
      
      console.log('[IntersectionTool] Paper.hitTest() result for first line:', hit);
      
      // Filter for lines only
      if (!hit || hit.elementType !== 'line') {
        return this.failure('No line found at click position. Please click near a line.');
      }

      // Record first line
      this.firstLineId = hit.elementId;
      this.state = 'waiting-second-line';
      
      return this.success(`Selected first line: ${hit.elementId}. Click second line for intersection.`);
      
    } else {
      // Second click: Select second line and create intersection
      
      // Use Paper.hitTest() to find line
      const canvasPos = new Vector3(canvasCoords.x, canvasCoords.y, 1);
      const hit = paper.hitTest(canvasPos, 20, planeId, paperToPlaneTransform, world); // 20px snap radius
      
      console.log('[IntersectionTool] Paper.hitTest() result for second line:', hit);
      
      // Filter for lines only
      if (!hit || hit.elementType !== 'line') {
        return this.failure('No line found at click position. Please click near a line.');
      }

      const secondLineId = hit.elementId;

      // Validate: cannot intersect line with itself
      if (secondLineId === this.firstLineId) {
        this.reset();
        return this.failure('Cannot intersect line with itself. Please select two different lines.');
      }

      // Get line realizations to check for parallel lines
      const line1Realization = world.getLine2DRealization(this.firstLineId!);
      const line2Realization = world.getLine2DRealization(secondLineId);

      if (!line1Realization || !line2Realization) {
        this.reset();
        return this.failure('Error: Cannot compute line realizations');
      }

      // Check if lines are parallel
      if (areLinesParallel(line1Realization, line2Realization)) {
        this.reset();
        return this.failure('Lines are parallel - no intersection point exists.');
      }

      try {
        // Build Command directly
        const cmd = new Command("Create intersection point", world);
        
        // Use return value from addAndExecute
        const result = cmd.addAndExecute(new AddIntersectionPoint2DOp(planeId, this.firstLineId!, secondLineId, 0));
        
        // Extract outputs
        const pointId = result.outputs.pointId;
        
        // Record ProcessTree action using pointId from outputs
        const action = createIntersectionPointAction(pointId, planeId, this.firstLineId!, secondLineId, 0);
        world.getProcessTree().addAction(action);
        
        // Commit
        cmd.commit();
        
        // Push to stack
        commandStack.push(cmd);
        
        // Reset state for next intersection
        this.reset();
        
        return this.success('Intersection point created');
        
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.reset();
        return this.failure(`Failed to create intersection: ${message}`);
      }
    }
  }

  /**
   * Cancel the current operation
   */
  cancel(): void {
    this.reset();
  }

  /**
   * Get selection mask for intersection point creation
   * Both states need to select lines (first line, then second line)
   */
  getSelectionMask(): SelectionMask {
    return ['line', 'half-hinge-line'];
  }

  /**
   * Reset tool state
   */
  private reset(): void {
    this.state = 'waiting-first-line';
    this.firstLineId = undefined;
  }
}

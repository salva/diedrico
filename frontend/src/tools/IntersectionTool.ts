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
import { CreateIntersectionPointCommand } from '@/commands/CreateIntersectionPointCommand';
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
    const { planeId, planeCoords, canvasCoords, commandStack, world, paper } = context;
    
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
      const hit = paper.hitTest(canvasPos, 20); // 20px snap radius
      
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
      const hit = paper.hitTest(canvasPos, 20); // 20px snap radius
      
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

      // Create intersection point command
      const command = new CreateIntersectionPointCommand(
        world,
        {
          line1Id: this.firstLineId!,
          line2Id: secondLineId,
          planeId: planeId
        }
      );

      // Execute command
      commandStack.execute(command);
      
      // Reset state for next intersection
      this.reset();
      
      return this.success('Intersection point created');
    }
  }

  /**
   * Cancel the current operation
   */
  cancel(): void {
    this.reset();
  }

  /**
   * Reset tool state
   */
  private reset(): void {
    this.state = 'waiting-first-line';
    this.firstLineId = undefined;
  }
}

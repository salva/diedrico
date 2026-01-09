/**
 * IntersectionTool - Tool for creating intersection points between geometric elements
 * 
 * Supports intersections between:
 * - Line-Line
 * - Line-Circle
 * - Circle-Circle
 * 
 * Two-click workflow:
 * 1. Click first element (line or circle, visual feedback via message)
 * 2. Click second element → create intersection point if elements intersect
 * 
 * When multiple intersection points exist (line-circle or circle-circle),
 * the tool picks the intersection point nearest to the mouse cursor.
 * 
 * Validation:
 * - Both clicks must hit lines or circles (not other elements)
 * - Elements must not be parallel/non-intersecting
 * - Elements must not be the same element
 * 
 * @see specs/001-dihedral-learning-mvp/tasks.md#phase-17-more-intersection-types
 */

import { Vector3 } from 'three';
import { BaseTool } from './BaseTool';
import type { ToolContext, ToolResult } from './ITool';
import type { SelectionMask } from '@/types/SelectionMask';
import { Command } from '@/commands/Command';
import { AddIntersectionPoint2DOp } from '@/commands/operations/AddIntersectionPointOp';
import { createIntersectionPointAction } from '@/domain/processTree/actions/CreateIntersectionPointAction';
import { 
  areLinesParallel, 
  intersectLineCircle, 
  intersectCircleCircle 
} from '@/domain/calculations/Intersections';
import type { World } from '@/domain/world/World';
import { Line2D } from '@/domain/world/Line';
import { Circle2D } from '@/domain/world/Circle';

/**
 * IntersectionTool state machine:
 * - State 0: Waiting for first element selection (line or circle)
 * - State 1: First element selected, waiting for second element
 */
export class IntersectionTool extends BaseTool {
  readonly name = 'intersection';
  private state: 'waiting-first-element' | 'waiting-second-element' = 'waiting-first-element';
  private firstElementId?: string;

  /**
   * Handle click event for intersection point creation
   * 
   * Two-click workflow:
   * 1. First click: Select first element (line or circle)
   * 2. Second click: Select second element and create intersection
   * 
   * When multiple intersections exist, picks the one nearest to mouse.
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
    if (this.state === 'waiting-first-element') {
      // First click: Select first element (line or circle)
      
      // Use Paper.hitTest() for spatial queries
      const canvasPos = new Vector3(canvasCoords.x, canvasCoords.y, 1);
      const selectionMask = this.getSelectionMask();
      const hit = paper.hitTest(canvasPos, 50, planeId, paperToPlaneTransform, world, selectionMask); // 50px snap radius for better point detection
      
      console.log('[IntersectionTool] Paper.hitTest() result for first element:', hit);
      
      // Selection mask ensures only lines and circles are returned
      if (!hit) {
        return this.failure('No line or circle found at click position. Please click near a line or circle.');
      }

      // Record first element
      this.firstElementId = hit.elementId;
      this.state = 'waiting-second-element';
      
      const elementTypeName = hit.elementType === 'circle' ? 'circle' : 'line';
      return this.success(`Selected first ${elementTypeName}: ${hit.elementId}. Click second element for intersection.`);
      
    } else {
      // Second click: Select second element and create intersection
      
      // Use Paper.hitTest() to find element
      const canvasPos = new Vector3(canvasCoords.x, canvasCoords.y, 1);
      const selectionMask = this.getSelectionMask();
      const hit = paper.hitTest(canvasPos, 50, planeId, paperToPlaneTransform, world, selectionMask); // 50px snap radius for better point detection
      
      console.log('[IntersectionTool] Paper.hitTest() result for second element:', hit);
      
      // Selection mask ensures only lines and circles are returned
      if (!hit) {
        return this.failure('No line or circle found at click position. Please click near a line or circle.');
      }

      const secondElementId = hit.elementId;

      // Validate: cannot intersect element with itself
      if (secondElementId === this.firstElementId) {
        this.reset();
        return this.failure('Cannot intersect element with itself. Please select two different elements.');
      }

      // Determine intersection type and compute intersections
      const intersectionIndex = this.computeIntersectionIndex(
        this.firstElementId!,
        secondElementId,
        planeCoords,
        world
      );

      if (intersectionIndex === null) {
        this.reset();
        return this.failure('Elements do not intersect or are parallel.');
      }

      try {
        // Build Command directly
        const cmd = new Command("Create intersection point", world);
        
        // Use return value from addAndExecute
        const result = cmd.addAndExecute(new AddIntersectionPoint2DOp(
          planeId,
          this.firstElementId!,
          secondElementId,
          intersectionIndex
        ));
        
        // Extract outputs
        const pointId = result.outputs.pointId;
        
        // Record ProcessTree action using pointId from outputs
        const action = createIntersectionPointAction(
          pointId,
          planeId,
          this.firstElementId!,
          secondElementId,
          intersectionIndex
        );
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
   * Compute intersection index for the intersection point nearest to mouse position
   * 
   * When multiple intersections exist (line-circle or circle-circle), this method
   * determines which intersection is closest to the user's click position.
   * 
   * @returns Intersection index (0 for first/only point, 1 for second point) or null if no intersection
   */
  private computeIntersectionIndex(
    element1Id: string,
    element2Id: string,
    mousePos: Vector3,
    world: World
  ): number | null {
    // Get actual domain objects
    const element1 = world.getLine2DFromPlanes(element1Id) || world.getCircle2DFromPlanes(element1Id);
    const element2 = world.getLine2DFromPlanes(element2Id) || world.getCircle2DFromPlanes(element2Id);
    
    if (!element1 || !element2) {
      return null;
    }

    // Line-Line intersection (using instanceof instead of type strings)
    if (element1 instanceof Line2D && element2 instanceof Line2D) {
      const line1 = world.getLine2DRealization(element1Id);
      const line2 = world.getLine2DRealization(element2Id);
      
      if (!line1 || !line2) {
        return null;
      }
      
      // Check if lines are parallel
      if (areLinesParallel(line1, line2)) {
        return null;
      }
      
      // Line-line always has 0 or 1 intersection, so index is always 0
      return 0;
    }

    // Line-Circle intersection
    if (element1 instanceof Line2D && element2 instanceof Circle2D) {
      return this.computeLineCircleIntersectionIndex(element1Id, element2Id, mousePos, world);
    }
    
    if (element1 instanceof Circle2D && element2 instanceof Line2D) {
      return this.computeLineCircleIntersectionIndex(element2Id, element1Id, mousePos, world);
    }

    // Circle-Circle intersection
    if (element1 instanceof Circle2D && element2 instanceof Circle2D) {
      return this.computeCircleCircleIntersectionIndex(element1Id, element2Id, mousePos, world);
    }

    return null;
  }

  /**
   * Compute which line-circle intersection point is nearest to mouse
   */
  private computeLineCircleIntersectionIndex(
    lineId: string,
    circleId: string,
    mousePos: Vector3,
    world: World
  ): number | null {
    const lineRealization = world.getLine2DRealization(lineId);
    const circleRealization = world.getCircle2DRealization(circleId);
    
    if (!lineRealization || !circleRealization) {
      return null;
    }
    
    const result = intersectLineCircle(lineRealization, circleRealization);
    
    if (result.points.length === 0) {
      return null;
    }
    
    if (result.points.length === 1) {
      return 0; // Only one intersection point
    }
    
    // Two intersection points - pick the one nearest to mouse
    const dist0 = mousePos.distanceTo(result.points[0]);
    const dist1 = mousePos.distanceTo(result.points[1]);
    
    return dist0 <= dist1 ? 0 : 1;
  }

  /**
   * Compute which circle-circle intersection point is nearest to mouse
   */
  private computeCircleCircleIntersectionIndex(
    circle1Id: string,
    circle2Id: string,
    mousePos: Vector3,
    world: World
  ): number | null {
    const circle1Realization = world.getCircle2DRealization(circle1Id);
    const circle2Realization = world.getCircle2DRealization(circle2Id);
    
    if (!circle1Realization || !circle2Realization) {
      return null;
    }
    
    const result = intersectCircleCircle(circle1Realization, circle2Realization);
    
    if (result.points.length === 0) {
      return null;
    }
    
    if (result.points.length === 1) {
      return 0; // Only one intersection point
    }
    
    // Two intersection points - pick the one nearest to mouse
    const dist0 = mousePos.distanceTo(result.points[0]);
    const dist1 = mousePos.distanceTo(result.points[1]);
    
    return dist0 <= dist1 ? 0 : 1;
  }

  /**
   * Cancel the current operation
   */
  cancel(): void {
    this.reset();
  }

  /**
   * Get selection mask for intersection point creation
   * Both states need to select lines, guides, or circles (first element, then second element)
   */
  getSelectionMask(): SelectionMask {
    return ['line', 'half-hinge-line', 'guide', 'circle'];
  }

  /**
   * Reset tool state
   */
  private reset(): void {
    this.state = 'waiting-first-element';
    this.firstElementId = undefined;
  }
}

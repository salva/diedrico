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
import { AddLineLineIntersectionPoint2DOp } from '@/commands/operations/world/AddLineLineIntersectionPoint2DOp';
import { AddLineCircleIntersectionPoint2DOp } from '@/commands/operations/world/AddLineCircleIntersectionPoint2DOp';
import { AddCircleCircleIntersectionPoint2DOp } from '@/commands/operations/world/AddCircleCircleIntersectionPoint2DOp';
import { createLineLineIntersectionPointAction } from '@/domain/processTree/actions/CreateLineLineIntersectionPointAction';
import { createLineCircleIntersectionPointAction } from '@/domain/processTree/actions/CreateLineCircleIntersectionPointAction';
import { createCircleCircleIntersectionPointAction } from '@/domain/processTree/actions/CreateCircleCircleIntersectionPointAction';
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
      const intersectionData = this.computeIntersectionData(
        this.firstElementId!,
        secondElementId,
        planeCoords,
        world
      );

      if (!intersectionData) {
        this.reset();
        return this.failure('Elements do not intersect or are parallel.');
      }

      try {
        // Build Command directly
        const cmd = new Command("Create intersection point", world);
        
        // Create the appropriate operation based on intersection type
        let operation;
        if (intersectionData.type === 'line-line') {
          operation = new AddLineLineIntersectionPoint2DOp(
            planeId,
            intersectionData.element1Id,
            intersectionData.element2Id
          );
        } else if (intersectionData.type === 'line-circle') {
          operation = new AddLineCircleIntersectionPoint2DOp(
            planeId,
            intersectionData.lineId!,
            intersectionData.circleId!,
            intersectionData.index!
          );
        } else if (intersectionData.type === 'circle-circle') {
          operation = new AddCircleCircleIntersectionPoint2DOp(
            planeId,
            intersectionData.element1Id,
            intersectionData.element2Id,
            intersectionData.index!
          );
        } else {
          throw new Error(`Unknown intersection type: ${intersectionData.type}`);
        }
        
        // Use return value from addAndExecute
        const result = cmd.addAndExecute(operation);
        
        // Extract outputs
        const pointId = result.outputs.pointId;
        
        // Record ProcessTree action using specialized action factories
        let action;
        if (intersectionData.type === 'line-line') {
          action = createLineLineIntersectionPointAction(
            pointId,
            planeId,
            intersectionData.element1Id,
            intersectionData.element2Id
          );
        } else if (intersectionData.type === 'line-circle') {
          action = createLineCircleIntersectionPointAction(
            pointId,
            planeId,
            intersectionData.lineId!,
            intersectionData.circleId!,
            intersectionData.index!
          );
        } else if (intersectionData.type === 'circle-circle') {
          action = createCircleCircleIntersectionPointAction(
            pointId,
            planeId,
            intersectionData.element1Id,
            intersectionData.element2Id,
            intersectionData.index!
          );
        } else {
          throw new Error(`Unknown intersection type: ${intersectionData.type}`);
        }
        
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
   * Compute intersection data for the intersection point nearest to mouse position
   * 
   * When multiple intersections exist (line-circle or circle-circle), this method
   * determines which intersection is closest to the user's click position.
   * 
   * @returns Intersection data with type and appropriate IDs, or null if no intersection
   */
  private computeIntersectionData(
    element1Id: string,
    element2Id: string,
    mousePos: Vector3,
    world: World
  ): { 
    type: 'line-line' | 'line-circle' | 'circle-circle'; 
    element1Id: string; 
    element2Id: string;
    lineId?: string;
    circleId?: string;
    index?: number;
  } | null {
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
      
      // Line-line always has 0 or 1 intersection, no index needed
      return {
        type: 'line-line',
        element1Id,
        element2Id
      };
    }

    // Line-Circle intersection
    if (element1 instanceof Line2D && element2 instanceof Circle2D) {
      const index = this.computeLineCircleIntersectionIndex(element1Id, element2Id, mousePos, world);
      if (index === null) return null;
      
      return {
        type: 'line-circle',
        element1Id,
        element2Id,
        lineId: element1Id,
        circleId: element2Id,
        index
      };
    }
    
    if (element1 instanceof Circle2D && element2 instanceof Line2D) {
      const index = this.computeLineCircleIntersectionIndex(element2Id, element1Id, mousePos, world);
      if (index === null) return null;
      
      return {
        type: 'line-circle',
        element1Id,
        element2Id,
        lineId: element2Id,
        circleId: element1Id,
        index
      };
    }

    // Circle-Circle intersection
    if (element1 instanceof Circle2D && element2 instanceof Circle2D) {
      const index = this.computeCircleCircleIntersectionIndex(element1Id, element2Id, mousePos, world);
      if (index === null) return null;
      
      return {
        type: 'circle-circle',
        element1Id,
        element2Id,
        index
      };
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
   * All line types (lines, segments, guides, half-hinge-lines) and circles can participate in intersections.
   */
  getSelectionMask(): SelectionMask {
    return ['line', 'segment', 'half-hinge-line', 'guide', 'circle'];
  }

  /**
   * Reset tool state
   */
  private reset(): void {
    this.state = 'waiting-first-element';
    this.firstElementId = undefined;
  }
}

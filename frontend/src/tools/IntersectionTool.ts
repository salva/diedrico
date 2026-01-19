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
 * Phase 74: Refactored to use typed factory methods directly.
 * Uses instanceof checks to determine element types and calls appropriate factory method.
 * No string discriminator round-trip (instanceof → string → dispatch).
 * 
 * @see specs/001-dihedral-learning-mvp/tasks.md#phase-17-more-intersection-types
 * @see specs/001-dihedral-learning-mvp/for-planing.md Phase 74
 */

import { Vector3 } from 'three';
import { BaseTool } from './BaseTool';
import type { ToolContext, ToolResult } from './ITool';
import { SelectionMask } from '@/types/SelectionMask';
import { Command } from '@/commands/Command';
import { IntersectionSequenceFactory } from '@/commands/factories/IntersectionSequenceFactory';
import { createLineLineIntersectionPointAction } from '@/domain/processTree/actions/CreateLineLineIntersectionPointAction';
import { createLineCircleIntersectionPointAction } from '@/domain/processTree/actions/CreateLineCircleIntersectionPointAction';
import { createCircleCircleIntersectionPointAction } from '@/domain/processTree/actions/CreateCircleCircleIntersectionPointAction';
import { createSiblingIntersectionPointAction } from '@/domain/processTree/actions/CreateSiblingIntersectionPointAction';
import { AddProcessTreeActionOp } from '@/commands/operations/processTree/AddProcessTreeActionOp';
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
  readonly completionBehavior = 'stay-active' as const; // Phase 69: All tools stay active
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

      // Get actual domain objects
      const element1 = world.getLine2D(this.firstElementId!) || world.getCircle2D(this.firstElementId!);
      const element2 = world.getLine2D(secondElementId) || world.getCircle2D(secondElementId);
      
      if (!element1 || !element2) {
        this.reset();
        return this.failure('Elements not found in world.');
      }

      try {
        // Build Command directly
        const cmd = new Command("Create intersection point", world);
        
        let pointId: string;
        let siblingPointId: string | undefined;
        let actionCreated = false;
        
        // Use instanceof to determine type and call appropriate factory method
        if (element1 instanceof Line2D && element2 instanceof Line2D) {
          // Line-Line intersection
          const line1 = element1.realize2D(world);
          const line2 = element2.realize2D(world);
          
          if (!line1 || !line2) {
            this.reset();
            return this.failure('Could not realize line geometries.');
          }
          
          // Check if lines are parallel
          if (areLinesParallel(line1, line2)) {
            this.reset();
            return this.failure('Lines are parallel - no intersection.');
          }
          
          // Create line-line intersection
          const result = IntersectionSequenceFactory.createLineLineIntersection(
            cmd, planeId, this.firstElementId!, secondElementId, world
          );
          pointId = result.pointId;
          siblingPointId = result.siblingPointId;
          
          // Record ProcessTree action
          const action = createLineLineIntersectionPointAction(
            pointId,
            planeId,
            this.firstElementId!,
            secondElementId
          );
          cmd.addAndExecute(new AddProcessTreeActionOp(action));
          actionCreated = true;
          
        } else if (element1 instanceof Line2D && element2 instanceof Circle2D) {
          // Line-Circle intersection (element1 is line, element2 is circle)
          const index = this.computeLineCircleIntersectionIndex(
            this.firstElementId!, secondElementId, planeCoords, world
          );
          
          if (index === null) {
            this.reset();
            return this.failure('Line and circle do not intersect.');
          }
          
          // Create line-circle intersection
          const result = IntersectionSequenceFactory.createLineCircleIntersection(
            cmd, planeId, this.firstElementId!, secondElementId, index, world
          );
          pointId = result.pointId;
          siblingPointId = result.siblingPointId;
          
          // Record ProcessTree action
          const action = createLineCircleIntersectionPointAction(
            pointId,
            planeId,
            this.firstElementId!,
            secondElementId,
            index
          );
          cmd.addAndExecute(new AddProcessTreeActionOp(action));
          actionCreated = true;
          
        } else if (element1 instanceof Circle2D && element2 instanceof Line2D) {
          // Line-Circle intersection (element1 is circle, element2 is line)
          const index = this.computeLineCircleIntersectionIndex(
            secondElementId, this.firstElementId!, planeCoords, world
          );
          
          if (index === null) {
            this.reset();
            return this.failure('Circle and line do not intersect.');
          }
          
          // Create line-circle intersection
          const result = IntersectionSequenceFactory.createLineCircleIntersection(
            cmd, planeId, secondElementId, this.firstElementId!, index, world
          );
          pointId = result.pointId;
          siblingPointId = result.siblingPointId;
          
          // Record ProcessTree action
          const action = createLineCircleIntersectionPointAction(
            pointId,
            planeId,
            secondElementId,
            this.firstElementId!,
            index
          );
          cmd.addAndExecute(new AddProcessTreeActionOp(action));
          actionCreated = true;
          
        } else if (element1 instanceof Circle2D && element2 instanceof Circle2D) {
          // Circle-Circle intersection
          const index = this.computeCircleCircleIntersectionIndex(
            this.firstElementId!, secondElementId, planeCoords, world
          );
          
          if (index === null) {
            this.reset();
            return this.failure('Circles do not intersect.');
          }
          
          // Create circle-circle intersection
          const result = IntersectionSequenceFactory.createCircleCircleIntersection(
            cmd, planeId, this.firstElementId!, secondElementId, index, world
          );
          pointId = result.pointId;
          siblingPointId = result.siblingPointId;
          
          // Record ProcessTree action
          const action = createCircleCircleIntersectionPointAction(
            pointId,
            planeId,
            this.firstElementId!,
            secondElementId,
            index
          );
          cmd.addAndExecute(new AddProcessTreeActionOp(action));
          actionCreated = true;
          
        } else {
          this.reset();
          return this.failure('Unsupported element type combination for intersection.');
        }
        
        if (!actionCreated) {
          throw new Error('Failed to create ProcessTree action');
        }
        
        // Record ProcessTree action for sibling intersection (if created)
        if (siblingPointId) {
          // Get the sibling plane ID from the point
          const primaryPoint = world.getPoint2D(pointId);
          if (primaryPoint) {
            const siblingPlaneId = world.getSiblingPlaneForIntersection(primaryPoint);
            if (siblingPlaneId) {
              const siblingAction = createSiblingIntersectionPointAction(
                siblingPointId,
                siblingPlaneId,
                pointId
              );
              cmd.addAndExecute(new AddProcessTreeActionOp(siblingAction));
            }
          }
        }
        
        // Commit
        cmd.commit();
        
        // Push to stack
        commandStack.push(cmd);
        
        // Reset state for next intersection
        this.reset();
        
        // Handle tool completion (returns to selection mode)
        this.handleCompletion(context.toolStore);
        
        return this.success('Intersection point created');
        
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.reset();
        return this.failure(`Failed to create intersection: ${message}`);
      }
    }
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
    const lineElement = world.getLine2D(lineId);
    const circleElement = world.getCircle2D(circleId);
    const lineRealization = lineElement?.realize2D(world);
    const circleRealization = circleElement?.realize2D(world);
    
    if (!lineRealization || !circleRealization) {
      return null;
    }
    
    const intersectionPoints = intersectLineCircle(lineRealization, circleRealization);
    
    if (intersectionPoints.length === 0) {
      return null;
    }
    
    if (intersectionPoints.length === 1) {
      return 0; // Only one intersection point
    }
    
    // Two intersection points - pick the one nearest to mouse
    const dist0 = mousePos.distanceTo(intersectionPoints[0]);
    const dist1 = mousePos.distanceTo(intersectionPoints[1]);
    
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
    const circle1Element = world.getCircle2D(circle1Id);
    const circle2Element = world.getCircle2D(circle2Id);
    const circle1Realization = circle1Element?.realize2D(world);
    const circle2Realization = circle2Element?.realize2D(world);
    
    if (!circle1Realization || !circle2Realization) {
      return null;
    }
    
    const intersectionPoints = intersectCircleCircle(circle1Realization, circle2Realization);
    
    if (intersectionPoints.length === 0) {
      return null;
    }
    
    if (intersectionPoints.length === 1) {
      return 0; // Only one intersection point
    }
    
    // Two intersection points - pick the one nearest to mouse
    const dist0 = mousePos.distanceTo(intersectionPoints[0]);
    const dist1 = mousePos.distanceTo(intersectionPoints[1]);
    
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
    return SelectionMask.union(SelectionMask.anyLine(), SelectionMask.circle());
  }

  /**
   * Reset tool state
   */
  private reset(): void {
    this.state = 'waiting-first-element';
    this.firstElementId = undefined;
  }
}

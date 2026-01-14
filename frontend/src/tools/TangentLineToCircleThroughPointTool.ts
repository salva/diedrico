/**
 * TangentLineToCircleThroughPointTool - Tool for creating tangent lines to circle through external point
 * 
 * Phase 60: Two-step workflow with automatic angle-based indexing
 * 1. First click: Select circle
 * 2. Second click: Select external point
 * 3. Automatic: Determine tangent index based on mouse position angle from radius vector
 * 4. Create tangent line
 * 
 * The tool automatically determines which of the two tangent lines to create based on
 * which tangent point is closer (in angle) to the mouse position at the time of creation.
 * 
 * Reference: specs/001-dihedral-learning-mvp/spec.md §FR-045
 */

import { Vector3 } from 'three';
import { BaseTool } from './BaseTool';
import type { ToolContext, ToolResult } from './ITool';
import { Command } from '@/commands/Command';
import { AddLine2DTangentToCircleThroughPointOp } from '@/commands/operations/world/AddLineOp';
import { createTangentLineToCircleThroughPointAction } from '@/domain/processTree/actions/CreateTangentLineAction';
import { SelectionMask } from '@/types/SelectionMask';

/**
 * TangentLineToCircleThroughPointTool state machine:
 * - State 'waiting-circle': Waiting for circle
 * - State 'waiting-point': Circle selected, waiting for external point
 */
export class TangentLineToCircleThroughPointTool extends BaseTool {
  readonly name = 'tangent-line-to-circle-through-point';
  readonly completionBehavior = 'return-to-selection' as const; // Complex tools return to selection
  private state: 'waiting-circle' | 'waiting-point' = 'waiting-circle';
  private circleId?: string;

  /**
   * Handle click event for tangent line creation
   * 
   * Two-click workflow with automatic indexing:
   * 1. First click: Record circle
   * 2. Second click: Create tangent line with auto-determined index
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
    
    console.log('[TangentLineToCircleThroughPointTool] Paper.hitTest() result:', hit);
    
    if (!hit) {
      const expectedType = this.state === 'waiting-circle' ? 'circle' : 'point';
      return this.failure(`No ${expectedType} found at click position.`);
    }

    // State machine
    if (this.state === 'waiting-circle') {
      // First click: Record circle
      this.circleId = hit.elementId;
      this.state = 'waiting-point';
      return this.success(`Selected circle: ${hit.elementId}`);
      
    } else {
      // Second click: Create tangent line with automatic index determination
      const throughPointId = hit.elementId;
      
      try {
        // Determine tangent index based on mouse position
        const tangentIndex = this.determineTangentIndex(
          planeId,
          this.circleId!,
          throughPointId,
          planeCoords,
          world
        );
        
        // Build Command directly
        const cmd = new Command("Create tangent line to circle through point", world);
        
        // Use return value from addAndExecute
        const result = cmd.addAndExecute(
          new AddLine2DTangentToCircleThroughPointOp(planeId, this.circleId!, throughPointId, tangentIndex)
        );
        
        // Extract outputs
        const lineId = result.outputs.lineId;
        
        // Record ProcessTree action using lineId from outputs
        const action = createTangentLineToCircleThroughPointAction(
          lineId,
          planeId,
          this.circleId!,
          throughPointId,
          tangentIndex
        );
        world.getProcessTree().addAction(action);
        
        // Commit
        cmd.commit();
        
        // Push to stack
        commandStack.push(cmd);
        
        const circleId = this.circleId; // Save before reset
        
        // Reset state for next line
        this.reset();
        
        // Handle tool completion (returns to selection mode)
        this.handleCompletion(context.toolStore);
        
        return this.success(`Created tangent line ${lineId} to circle ${circleId} through point ${throughPointId} (index: ${tangentIndex})`);
        
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.reset();
        return this.failure(`Failed to create tangent line: ${message}`);
      }
    }
  }

  /**
   * Determine which tangent line (index 0 or 1) to create based on mouse position
   * 
   * Index Convention:
   * Given circle with center A, external point B, and tangent point C:
   * - Index 0: Positive angle BAC (counterclockwise from AB to AC when viewed from A)
   * - Index 1: Negative angle BAC (clockwise from AB to AC when viewed from A)
   * 
   * Algorithm:
   * 1. Get circle center and external point positions
   * 2. Compute both tangent angles: angleCP ± acos(r/d)
   * 3. Compute tangent points for both angles
   * 4. Calculate angle from center to each tangent point
   * 5. Compare to mouse position angle from center
   * 6. Return index of tangent point closer to mouse angle
   * 
   * @param planeId Plane ID
   * @param circleId Circle ID
   * @param throughPointId External point ID
   * @param mousePos Mouse position in plane coordinates
   * @param world World context
   * @returns tangentIndex (0 or 1)
   */
  private determineTangentIndex(
    planeId: string,
    circleId: string,
    throughPointId: string,
    mousePos: Vector3,
    world: import('@/domain/world/World').World
  ): 0 | 1 {
    const plane = world.getProjectionPlaneById(planeId);
    if (!plane) throw new Error(`Plane not found: ${planeId}`);

    // Get circle realization
    const circle = plane.getCircle(circleId);
    if (!circle) throw new Error(`Circle not found: ${circleId}`);
    const circleReal = circle.realize2D(world);
    if (!circleReal || !circleReal.feasible) throw new Error(`Circle infeasible: ${circleId}`);

    // Get external point realization
    const point = plane.getPoint(throughPointId);
    if (!point) throw new Error(`Point not found: ${throughPointId}`);
    const pointReal = point.realize2D(world);
    if (!pointReal || !pointReal.feasible) throw new Error(`Point infeasible: ${throughPointId}`);

    const center = circleReal.center;
    const radius = circleReal.getRadius();
    const externalPoint = pointReal.position;

    // Vector from center to external point
    const dx = externalPoint.x - center.x;
    const dy = externalPoint.y - center.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Angle from center to external point (angle of vector CP)
    const angleCP = Math.atan2(dy, dx);

    // Angle from CP to tangent line (angle at center in right triangle CPT)
    // In right triangle with right angle at tangent point T:
    // cos(angle at C) = adjacent/hypotenuse = r/d
    const angleBeta = Math.acos(radius / distance);

    // Two tangent angles (from center to tangent points)
    // Index 0: counterclockwise from CP (positive angle from AB to AC)
    // Index 1: clockwise from CP (negative angle from AB to AC)
    const tangentAngle0 = angleCP + angleBeta;  // Index 0
    const tangentAngle1 = angleCP - angleBeta;  // Index 1

    // Tangent points
    const tangentPoint0 = new Vector3(
      center.x + radius * Math.cos(tangentAngle0),
      center.y + radius * Math.sin(tangentAngle0),
      1
    );
    const tangentPoint1 = new Vector3(
      center.x + radius * Math.cos(tangentAngle1),
      center.y + radius * Math.sin(tangentAngle1),
      1
    );

    // Angles from center to tangent points
    const angle0 = Math.atan2(tangentPoint0.y - center.y, tangentPoint0.x - center.x);
    const angle1 = Math.atan2(tangentPoint1.y - center.y, tangentPoint1.x - center.x);

    // Mouse angle from center
    const mouseAngle = Math.atan2(mousePos.y - center.y, mousePos.x - center.x);

    // Compute angular distances (handle wrap-around)
    const dist0 = this.angularDistance(angle0, mouseAngle);
    const dist1 = this.angularDistance(angle1, mouseAngle);

    // Return index of closest tangent point to mouse
    return dist0 <= dist1 ? 0 : 1;
  }

  /**
   * Compute angular distance between two angles (always positive, in [0, π])
   */
  private angularDistance(angle1: number, angle2: number): number {
    let diff = Math.abs(angle1 - angle2);
    if (diff > Math.PI) {
      diff = 2 * Math.PI - diff;
    }
    return diff;
  }

  /**
   * Cancel current tangent line creation
   */
  cancel(): void {
    this.reset();
  }

  /**
   * Get selection mask - tangent tool selects circles first, then points
   */
  getSelectionMask(): SelectionMask {
    if (this.state === 'waiting-circle') {
      return SelectionMask.circle();
    } else {
      return SelectionMask.point();
    }
  }

  /**
   * Get current tool state
   */
  getState(): Record<string, any> {
    return {
      state: this.state,
      circleId: this.circleId
    };
  }

  /**
   * Reset tool state
   */
  private reset(): void {
    this.state = 'waiting-circle';
    this.circleId = undefined;
  }
}

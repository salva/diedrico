/**
 * TangentLineToCircleParallelToLineTool - Tool for creating tangent lines to circle parallel to reference line
 * 
 * Phase 61: Two-step workflow with automatic angle-based indexing
 * Phase 62: Accepts any Line2D subtype as reference (lines, segments, guides, half-hinge-lines)
 * 
 * 1. First click: Select circle
 * 2. Second click: Select reference line (any Line2D subtype)
 * 3. Automatic: Determine tangent index based on mouse position angle from radius vector
 * 4. Create tangent line
 * 
 * The tool automatically determines which of the two tangent lines to create based on
 * which tangent point is closer (in angle) to the mouse position at the time of creation.
 * 
 * Note: Workflow order is NOT reversed (must select circle first) as geometric construction
 * requires circle context.
 * 
 * Reference: specs/001-dihedral-learning-mvp/spec.md §FR-046, §FR-047
 */

import { Vector3 } from 'three';
import { BaseTool } from './BaseTool';
import type { ToolContext, ToolResult } from './ITool';
import { Command } from '@/commands/Command';
import { AddLine2DTangentToCircleParallelToLineOp } from '@/commands/operations/world/AddLineOp';
import { createTangentLineToCircleParallelToLineAction } from '@/domain/processTree/actions/CreateTangentLineAction';
import { SelectionMask } from '@/types/SelectionMask';
import { AddProcessTreeActionOp } from '@/commands/operations/processTree/AddProcessTreeActionOp';

/**
 * TangentLineToCircleParallelToLineTool state machine:
 * - State 'waiting-circle': Waiting for circle
 * - State 'waiting-line': Circle selected, waiting for reference line
 */
export class TangentLineToCircleParallelToLineTool extends BaseTool {
  readonly name = 'tangent-line-to-circle-parallel';
  readonly completionBehavior = 'stay-active' as const; // Phase 69: All tools stay active
  private state: 'waiting-circle' | 'waiting-line' = 'waiting-circle';
  private circleId?: string;

  /**
   * Handle click event for tangent line creation
   * 
   * Two-click workflow with automatic indexing:
   * 1. First click: Record circle
   * 2. Second click: Create tangent line parallel to selected line with auto-determined index
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
    
    console.log('[TangentLineToCircleParallelToLineTool] Paper.hitTest() result:', hit);
    
    if (!hit) {
      const expectedType = this.state === 'waiting-circle' ? 'circle' : 'line';
      return this.failure(`No ${expectedType} found at click position.`);
    }

    // State machine
    if (this.state === 'waiting-circle') {
      // First click: Record circle
      this.circleId = hit.elementId;
      this.state = 'waiting-line';
      return this.success(`Selected circle: ${hit.elementId}`);
      
    } else {
      // Second click: Create tangent line with automatic index determination
      const referenceLineId = hit.elementId;
      
      try {
        // Determine tangent index based on mouse position
        const tangentIndex = this.determineTangentIndex(
          planeId,
          this.circleId!,
          referenceLineId,
          planeCoords,
          world
        );
        
        // Build Command directly
        const cmd = new Command("Create tangent line to circle parallel to line", world);
        
        // Use return value from addAndExecute
        const result = cmd.addAndExecute(
          new AddLine2DTangentToCircleParallelToLineOp(planeId, this.circleId!, referenceLineId, tangentIndex)
        );
        
        // Extract outputs
        const lineId = result.outputs.lineId;
        
        // Record ProcessTree action using lineId from outputs
        const action = createTangentLineToCircleParallelToLineAction(
          lineId,
          planeId,
          this.circleId!,
          referenceLineId,
          tangentIndex
        );
        cmd.addAndExecute(new AddProcessTreeActionOp(action));
        
        // Commit
        cmd.commit();
        
        // Push to stack
        commandStack.push(cmd);
        
        const circleId = this.circleId; // Save before reset
        
        // Reset state for next line
        this.reset();
        
        // Handle tool completion (returns to selection mode)
        this.handleCompletion(context.toolStore);
        
        return this.success(`Created tangent line ${lineId} to circle ${circleId} parallel to line ${referenceLineId} (index: ${tangentIndex})`);
        
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
   * - Index 0: Tangent closer to reference line (between ref and center)
   * - Index 1: Tangent farther from reference line (center between ref and tangent)
   * 
   * Algorithm:
   * 1. Get circle center and reference line
   * 2. Compute signed distance from center to reference line
   * 3. Compute both tangent positions based on perpendicular offset
   * 4. Determine which tangent is closer to mouse by distance
   * 5. Map to index based on which is closer to reference line
   * 
   * @param planeId Plane ID
   * @param circleId Circle ID
   * @param referenceLineId Reference line ID
   * @param mousePos Mouse position in plane coordinates
   * @param world World context
   * @returns tangentIndex (0 or 1)
   */
  private determineTangentIndex(
    planeId: string,
    circleId: string,
    referenceLineId: string,
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

    // Get reference line realization (may be on any plane)
    const refLineElement = world.getLine2D(referenceLineId);
    if (!refLineElement) throw new Error(`Reference line not found: ${referenceLineId}`);
    const refLine = refLineElement.realize2D(world);
    if (!refLine || !refLine.feasible) throw new Error(`Reference line infeasible: ${referenceLineId}`);

    const center = circleReal.center;
    const radius = circleReal.getRadius();

    // Reference line direction (normalized)
    const refDirection = refLine.point2.clone().normalize();

    // Perpendicular direction (90° CCW rotation)
    const perpDirection = new Vector3(-refDirection.y, refDirection.x, 0);

    // Compute signed distance from center to reference line
    const refPoint = refLine.point1;
    const a = -refDirection.y;
    const b = refDirection.x;
    const c = refDirection.y * refPoint.x - refDirection.x * refPoint.y;
    const signedDistance = a * center.x + b * center.y + c;

    // Compute two tangent points
    let closerTangent: Vector3;  // Closer to reference line (index 0)
    let fartherTangent: Vector3; // Farther from reference line (index 1)
    
    if (signedDistance > 0) {
      // Center on +perpDirection side
      closerTangent = new Vector3(
        center.x - radius * perpDirection.x,
        center.y - radius * perpDirection.y,
        1
      );
      fartherTangent = new Vector3(
        center.x + radius * perpDirection.x,
        center.y + radius * perpDirection.y,
        1
      );
    } else {
      // Center on -perpDirection side
      closerTangent = new Vector3(
        center.x + radius * perpDirection.x,
        center.y + radius * perpDirection.y,
        1
      );
      fartherTangent = new Vector3(
        center.x - radius * perpDirection.x,
        center.y - radius * perpDirection.y,
        1
      );
    }

    // Calculate distances from mouse to each tangent point
    const distToCloser = Math.hypot(
      mousePos.x - closerTangent.x,
      mousePos.y - closerTangent.y
    );
    const distToFarther = Math.hypot(
      mousePos.x - fartherTangent.x,
      mousePos.y - fartherTangent.y
    );

    // Return index of tangent closer to mouse
    return distToCloser <= distToFarther ? 0 : 1;
  }

  /**
   * Cancel current tangent line creation
   */
  cancel(): void {
    this.reset();
  }

  /**
   * Get selection mask - Phase 62: hierarchical any-line selector
   * 
   * Returns:
   * - waiting-circle: circle()
   * - waiting-line: anyLine() - accepts all Line2D subtypes (line, segment, guide, half-hinge-line)
   */
  getSelectionMask(): SelectionMask {
    if (this.state === 'waiting-circle') {
      return SelectionMask.circle();
    } else {
      return SelectionMask.anyLine();  // Phase 62: accepts all Line2D subtypes
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

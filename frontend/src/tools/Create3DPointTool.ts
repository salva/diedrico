/**
 * Create3DPointTool - Tool for creating 3D points from two 2D projections
 * 
 * Phase 78: 3D Element Creation Tools
 * 
 * Implements multi-step workflow:
 * 1. First click: Select first 2D projection point (on any plane)
 * 2. Second click: Select second 2D projection point (must be on DIFFERENT plane)
 * 3. Validate different-plane requirement
 * 4. Create Point3DFromProjections using Add3DPointOp
 * 
 * Visual feedback:
 * - During second click, show red/green indicator based on plane validation
 * - Red: Same plane as first projection (invalid)
 * - Green: Different plane (valid)
 * 
 * Reference: specs/001-dihedral-learning-mvp/spec.md - Phase 78
 */

import { Vector3 } from 'three';
import { BaseTool } from './BaseTool';
import type { ToolContext, ToolResult } from './ITool';
import { Command } from '@/commands/Command';
import { Add3DPointOp } from '@/commands/operations/world/Add3DPointOp';
import { SelectionMask } from '@/types/SelectionMask';

/**
 * Create3DPointTool state machine:
 * - State 'waiting-first': Waiting for first projection point
 * - State 'waiting-second': First projection selected, waiting for second projection on different plane
 */
export class Create3DPointTool extends BaseTool {
  readonly name = 'create3dpoint';
  readonly completionBehavior = 'stay-active' as const; // Stays active for creating multiple 3D points
  
  private state: 'waiting-first' | 'waiting-second' = 'waiting-first';
  private firstProjectionId?: string;
  private firstPlaneId?: string;

  /**
   * Handle click event for 3D point creation
   * 
   * Two-click workflow:
   * 1. First click: Record first projection point and its plane
   * 2. Second click: Validate different plane, then create 3D point
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

    // Use Paper.hitTest() for spatial queries
    const canvasPos = new Vector3(canvasCoords.x, canvasCoords.y, 1);
    const selectionMask = this.getSelectionMask();
    const hit = paper.hitTest(canvasPos, 50, planeId, paperToPlaneTransform, world, selectionMask);
    
    console.log('[Create3DPointTool] Paper.hitTest() result:', hit);
    
    // Selection mask ensures only points are returned
    if (!hit) {
      return this.failure('No point found at click position. Please click near an existing 2D point.');
    }

    // State machine
    if (this.state === 'waiting-first') {
      // First click: Record first projection point and its plane
      this.firstProjectionId = hit.elementId;
      this.firstPlaneId = planeId;
      this.state = 'waiting-second';
      return this.success(`Selected first projection: ${hit.elementId} on plane ${planeId}. Now select a point on a DIFFERENT plane.`);
      
    } else {
      // Second click: Validate and create 3D point
      const secondProjectionId = hit.elementId;
      const secondPlaneId = planeId;
      
      // Phase 78 MANDATORY requirement: Different-plane validation
      if (secondPlaneId === this.firstPlaneId) {
        // Same plane - invalid, but don't reset state (allow user to try again)
        return this.failure(
          `Cannot create 3D point: both projections are on the same plane (${secondPlaneId}). ` +
          `Please select a point on a DIFFERENT plane.`
        );
      }
      
      // Validate different points (same point ID on different planes is geometrically valid)
      // But if they're the same point on different planes, it's probably a user error
      const plane1 = world.getProjectionPlaneById(this.firstPlaneId!);
      const plane2 = world.getProjectionPlaneById(secondPlaneId);
      
      if (!plane1 || !plane2) {
        this.reset();
        return this.failure('One or both projection planes no longer exist');
      }
      
      const proj1 = plane1.getPoint(this.firstProjectionId!);
      const proj2 = plane2.getPoint(secondProjectionId);
      
      if (!proj1 || !proj2) {
        this.reset();
        return this.failure('One or both projection points no longer exist');
      }
      
      try {
        // Build Command
        const cmd = new Command("Create 3D point from projections", world);
        
        // Execute Add3DPointOp
        const result = cmd.addAndExecute(new Add3DPointOp(
          this.firstProjectionId!,
          secondProjectionId,
          this.firstPlaneId!,
          secondPlaneId
        ));
        
        // Extract outputs
        const point3dId = result.outputs.pointId;
        
        // TODO: Add ProcessTree action for 3D point creation
        // (will be implemented when ProcessTree supports 3D elements)
        
        // Commit
        cmd.commit();
        
        // Push to stack
        commandStack.push(cmd);
        
        const firstProj = this.firstProjectionId;
        const firstPlane = this.firstPlaneId;
        
        // Reset state for next 3D point
        this.reset();
        
        // Handle tool completion (stays active for repeated use)
        this.handleCompletion(context.toolStore);
        
        return this.success(
          `Created 3D point ${point3dId} from projections: ` +
          `${firstProj} (${firstPlane}) and ${secondProjectionId} (${secondPlaneId})`
        );
        
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.reset();
        return this.failure(`Failed to create 3D point: ${message}`);
      }
    }
  }

  /**
   * Cancel current 3D point creation
   */
  cancel(): void {
    this.reset();
  }

  /**
   * Get selection mask - only selects 2D points (projections)
   */
  getSelectionMask(): SelectionMask {
    return SelectionMask.point();
  }

  /**
   * Get current tool state (for visual feedback in UI)
   */
  getState(): Record<string, any> {
    return {
      state: this.state,
      firstProjectionId: this.firstProjectionId,
      firstPlaneId: this.firstPlaneId
    };
  }

  /**
   * Check if a candidate plane would be valid for the second projection
   * Used by UI to show red/green visual feedback
   * 
   * @param candidatePlaneId Plane ID to validate
   * @returns true if different from first plane (valid), false if same (invalid)
   */
  isValidSecondPlane(candidatePlaneId: string): boolean {
    if (this.state !== 'waiting-second') {
      return true; // Not waiting for second projection, no restriction
    }
    return candidatePlaneId !== this.firstPlaneId;
  }

  /**
   * Reset tool state
   */
  private reset(): void {
    this.state = 'waiting-first';
    this.firstProjectionId = undefined;
    this.firstPlaneId = undefined;
  }
}

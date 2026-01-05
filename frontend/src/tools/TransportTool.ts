/**
 * TransportTool - Tool for transporting points between planes via guides
 * 
 * Implements two-click workflow:
 * 1. First click: Select source point (on current plane)
 * 2. Second click: Select guide (perpendicular to hinge line)
 * 3. Automatically transport point to opposite plane via the guide
 * 
 * Transport operation:
 * - Source point must be on the active plane
 * - Guide must be perpendicular to hinge line connecting the two planes
 * - Transported point maintains signed distance along the guide
 * - Result is a new FreePoint2D on the target plane
 * 
 * Reference: 
 * - specs/001-dihedral-learning-mvp/spec.md §US15 - Transport Point via Guide
 * - specs/001-dihedral-learning-mvp/spec.md §Point Transport
 */

import { Vector3 } from 'three';
import { BaseTool } from './BaseTool';
import type { ToolContext, ToolResult } from './ITool';
import type { SelectionMask } from '@/types/SelectionMask';
import { TransportPointCommand } from '@/commands/TransportPointCommand';

/**
 * TransportTool state machine:
 * - State 0: Waiting for source point selection
 * - State 1: Source point selected, waiting for guide selection
 */
export class TransportTool extends BaseTool {
  readonly name = 'transport';
  private state: 'waiting-point' | 'waiting-guide' = 'waiting-point';
  private sourcePointId?: string;
  private sourcePlaneId?: string;

  /**
   * Handle click event for point transport
   * 
   * Two-click workflow:
   * 1. First click: Select source point on active plane
   * 2. Second click: Select guide and execute transport
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
    if (this.state === 'waiting-point') {
      // First click: Select source point
      
      // Use Paper.hitTest() for spatial queries
      const canvasPos = new Vector3(canvasCoords.x, canvasCoords.y, 1);
      const selectionMask = this.getSelectionMask();
      const hit = paper.hitTest(canvasPos, 50, planeId, paperToPlaneTransform, world, selectionMask); // 50px snap radius for better point detection
      
      console.log('[TransportTool] Paper.hitTest() result for source point:', hit);
      
      // Selection mask ensures only points are returned (state-based mask)
      if (!hit) {
        return this.failure('No point found at click position. Please click near a point on the active plane.');
      }

      // Verify point exists on current plane
      const point = world.getPoint2DById(hit.elementId);
      if (!point) {
        return this.failure('Point not found in World');
      }
      
      if (point.planeId !== planeId) {
        return this.failure(`Point ${hit.elementId} is not on plane ${planeId}. Please select a point on the active plane.`);
      }

      // Record source point
      this.sourcePointId = hit.elementId;
      this.sourcePlaneId = planeId;
      this.state = 'waiting-guide';
      
      return this.success(`Selected source point: ${hit.elementId}. Click to select guide for transport.`);
      
    } else {
      // Second click: Select guide and execute transport
      
      // Use Paper.hitTest() to find guide
      const canvasPos = new Vector3(canvasCoords.x, canvasCoords.y, 1);
      const selectionMask = this.getSelectionMask();
      const hit = paper.hitTest(canvasPos, 50, planeId, paperToPlaneTransform, world, selectionMask); // 50px snap radius for better point detection
      
      console.log('[TransportTool] Paper.hitTest() result for guide:', hit);
      
      // Selection mask ensures only guides are returned (state-based mask)
      if (!hit) {
        this.reset();
        return this.failure('No guide found at click position. Please click near a guide perpendicular to the hinge line.');
      }
      
      const guideId = hit.elementId;
      
      // Determine target plane
      // For MVP, we have two projection planes: proj_plane_H and proj_plane_V
      // Target is the opposite of source
      const targetPlaneId = this.sourcePlaneId === 'proj_plane_H' ? 'proj_plane_V' : 'proj_plane_H';
      
      try {
        // Create transport command
        const command = new TransportPointCommand(
          this.sourcePointId!,
          guideId,
          targetPlaneId,
          world
        );
        
        // Execute via command stack (automatic undo/redo support)
        commandStack.execute(command);
        
        const transportedPointId = command.getTransportedPointId();
        const sourcePointId = this.sourcePointId; // Save before reset
        
        // Reset state for next transport
        this.reset();
        
        return this.success(`Transported point ${sourcePointId} to ${targetPlaneId} via guide ${guideId}. New point: ${transportedPointId}`);
        
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.reset();
        return this.failure(`Failed to transport point: ${message}`);
      }
    }
  }

  /**
   * Cancel current transport operation
   */
  cancel(): void {
    this.reset();
  }

  /**
   * Get selection mask for point transport
   * Dynamic mask based on tool state:
   * - waiting-point: Allow point selection only
   * - waiting-guide: Allow guide selection only
   */
  getSelectionMask(): SelectionMask {
    if (this.state === 'waiting-point') {
      return ['point'];
    } else {
      return ['guide'];
    }
  }

  /**
   * Get current tool state
   */
  getState(): Record<string, any> {
    return {
      state: this.state,
      sourcePointId: this.sourcePointId,
      sourcePlaneId: this.sourcePlaneId
    };
  }

  /**
   * Reset tool state for new transport
   */
  private reset(): void {
    this.state = 'waiting-point';
    this.sourcePointId = undefined;
    this.sourcePlaneId = undefined;
  }
}

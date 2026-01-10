/**
 * GuideTool - Tool for creating guides perpendicular to reference lines
 * 
 * Implements two-click workflow:
 * 1. First click: Select reference line (hinge line or BHL projection)
 * 2. Second click: Select or specify through-point on active plane
 * 3. Create guide perpendicular to reference line, passing through the point
 * 
 * Guides are special construction lines used in dihedral geometry for transporting
 * points and distances between projection planes. They render as dashed lines.
 * 
 * Reference: 
 * - specs/001-dihedral-learning-mvp/spec.md §US3 - Create Guide
 * - specs/001-dihedral-learning-mvp/spec.md §Guides
 */

import { Vector3 } from 'three';
import { BaseTool } from './BaseTool';
import type { ToolContext, ToolResult } from './ITool';
import type { SelectionMask } from '@/types/SelectionMask';
import { Command } from '@/commands/Command';
import { AddGuide2DPerpendicularToLineOp, AddSiblingGuide2DOp } from '@/commands/operations/AddGuideOp';
import { createGuideAction } from '@/domain/processTree/actions/CreateGuideAction';
import type { Point2D } from '@/domain/world/Point';
import { isSiblingIntersectionPoint2D } from '@/domain/world/Point';

/**
 * GuideTool state machine:
 * - State 0: Waiting for reference line selection
 * - State 1: Reference line selected, waiting for through-point
 */
export class GuideTool extends BaseTool {
  readonly name = 'guide';
  private state: 'waiting-line' | 'waiting-point' = 'waiting-line';
  private referenceLineId?: string;

  /**
   * Handle click event for guide creation
   * 
   * Two-click workflow:
   * 1. First click: Select reference line
   * 2. Second click: Select through-point and create guide
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
    if (this.state === 'waiting-line') {
      // First click: Select reference line
      
      // Use Paper.hitTest() for spatial queries
      const canvasPos = new Vector3(canvasCoords.x, canvasCoords.y, 1);
      const selectionMask = this.getSelectionMask();
      const hit = paper.hitTest(canvasPos, 50, planeId, paperToPlaneTransform, world, selectionMask); // 50px snap radius for better point detection
      
      console.log('[GuideTool] Paper.hitTest() result for reference line:', hit);
      
      // Selection mask ensures only lines are returned
      if (!hit || hit.elementType !== 'line') {
        return this.failure('No line found at click position. Please click near a hinge line or existing line.');
      }

      // Record reference line
      this.referenceLineId = hit.elementId;
      this.state = 'waiting-point';
      
      return this.success(`Selected reference line: ${hit.elementId}. Click to select through-point for guide.`);
      
    } else {
      // Second click: Select through-point and create guide
      
      // Use Paper.hitTest() to find existing point
      const canvasPos = new Vector3(canvasCoords.x, canvasCoords.y, 1);
      const selectionMask = this.getSelectionMask();
      const hit = paper.hitTest(canvasPos, 50, planeId, paperToPlaneTransform, world, selectionMask); // 50px snap radius for better point detection
      
      console.log('[GuideTool] Paper.hitTest() result for through-point:', hit);
      
      // Selection mask ensures only points are returned (state-based mask)
      if (!hit) {
        this.reset();
        return this.failure('No point found at click position. Please click near an existing point.');
      }
      
      const throughPointId = hit.elementId;
      
      try {
        // Build Command directly
        const cmd = new Command("Create guide", world);
        
        // Create primary guide
        const result = cmd.addAndExecute(new AddGuide2DPerpendicularToLineOp(planeId, this.referenceLineId!, throughPointId));
        const guideId = result.outputs.guideId;
        
        // Try to create sibling guide if conditions are met
        // Conditions:
        // 1. Reference line is a HalfHingeLine2D
        // 2. Through-point has a sibling (is a sibling intersection or has siblingPointId)
        // 3. Sibling plane and corresponding HalfHingeLine2D can be found
        let siblingGuideId: string | undefined;
        
        try {
          // Get sibling plane and HalfHingeLine2D
          const siblingInfo = world.getSiblingPlaneAndHalfHingeLineForGuide(this.referenceLineId!, planeId);
          
          if (siblingInfo) {
            // Create sibling guide using coordinate correspondence
            // No need for throughPointId - sibling guide derives position from primary guide
            const siblingResult = cmd.addAndExecute(
              new AddSiblingGuide2DOp(
                siblingInfo.siblingPlaneId,
                guideId, // primaryGuideId
                siblingInfo.siblingHalfHingeLineId
              )
            );
            siblingGuideId = siblingResult.outputs.siblingGuideId;
            
            // Update bidirectional links
                // Get guides and set siblingGuideId
                const primaryGuide = world.getLine2DById(guideId);
                const siblingGuide = world.getLine2DById(siblingGuideId);
                
                if (primaryGuide && 'siblingGuideId' in primaryGuide) {
                  (primaryGuide as any).siblingGuideId = siblingGuideId;
                }
                
                console.log(`[GuideTool] Created sibling guide ${siblingGuideId} in plane ${siblingInfo.siblingPlaneId}`);
              }
            }
          }
        } catch (siblingError) {
          // Sibling creation failed - log but don't fail the entire operation
          console.warn('[GuideTool] Failed to create sibling guide:', siblingError);
        }
        
        // Record ProcessTree action using guideId from outputs
        const action = createGuideAction(guideId, this.referenceLineId!, throughPointId, planeId);
        world.getProcessTree().addAction(action);
        
        // Commit
        cmd.commit();
        
        // Push to stack
        commandStack.push(cmd);
        
        const referenceLineId = this.referenceLineId; // Save before reset
        
        // Reset state for next guide
        this.reset();
        
        const message = siblingGuideId 
          ? `Created guide ${guideId} and sibling ${siblingGuideId}` 
          : `Created guide ${guideId} perpendicular to ${referenceLineId} through ${throughPointId}`;
        
        return this.success(message);
        
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.reset();
        return this.failure(`Failed to create guide: ${message}`);
      }
    }
  }

  /**
   * Cancel current guide creation
   */
  cancel(): void {
    this.reset();
  }

  /**
   * Get selection mask for guide creation
   * Dynamic mask based on tool state:
   * - waiting-line: Allow line selection only
   * - waiting-point: Allow point selection only
   */
  getSelectionMask(): SelectionMask {
    if (this.state === 'waiting-line') {
      return ['line', 'half-hinge-line'];
    } else {
      return ['point'];
    }
  }

  /**
   * Get current tool state
   */
  getState(): Record<string, any> {
    return {
      state: this.state,
      referenceLineId: this.referenceLineId
    };
  }

  /**
   * Reset tool state for new guide
   */
  private reset(): void {
    this.state = 'waiting-line';
    this.referenceLineId = undefined;
  }
}

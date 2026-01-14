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
import { SelectionMask } from '@/types/SelectionMask';
import { Command } from '@/commands/Command';
import { GuideSequenceFactory } from '@/commands/factories/GuideSequenceFactory';
import { createGuideAction } from '@/domain/processTree/actions/CreateGuideAction';
import { createSiblingGuideAction } from '@/domain/processTree/actions/CreateSiblingGuideAction';
import type { Point2D } from '@/domain/world/Point';
import { isSiblingIntersectionPoint2D } from '@/domain/world/Point';

/**
 * GuideTool state machine:
 * - State 'waiting-first': Waiting for first element (either half-hinge-line or point)
 * - State 'waiting-line': Point selected, waiting for half-hinge-line
 * - State 'waiting-point': Half-hinge-line selected, waiting for point
 */
export class GuideTool extends BaseTool {
  readonly name = 'guide';
  private state: 'waiting-first' | 'waiting-line' | 'waiting-point' = 'waiting-first';
  private referenceLineId?: string;
  private throughPointId?: string;

  /**
   * Handle click event for guide creation
   * 
   * Two-click workflow (order-independent):
   * 1. First click: Select either half-hinge-line or point
   * 2. Second click: Select the other element and create guide
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
    const hit = paper.hitTest(canvasPos, 50, planeId, paperToPlaneTransform, world, selectionMask); // 50px snap radius

    if (!hit) {
      if (this.state === 'waiting-first') {
        return this.failure('No hinge line or point found. Please click on a hinge line or existing point.');
      } else if (this.state === 'waiting-line') {
        this.reset();
        return this.failure('No hinge line found. Please click on a hinge line.');
      } else {
        this.reset();
        return this.failure('No point found. Please click on an existing point.');
      }
    }

    // State machine
    if (this.state === 'waiting-first') {
      // First click: Accept either half-hinge-line or point
      
      if (hit.elementType === 'half-hinge-line') {
        // Selected half-hinge-line first
        this.referenceLineId = hit.elementId;
        this.state = 'waiting-point';
        return this.success(`Selected hinge line: ${hit.elementId}. Click to select through-point for guide.`);
      } else if (hit.elementType === 'point') {
        // Selected point first
        this.throughPointId = hit.elementId;
        this.state = 'waiting-line';
        return this.success(`Selected point: ${hit.elementId}. Click to select hinge line for guide.`);
      } else {
        return this.failure('Invalid element type. Please click on a hinge line or point.');
      }
      
    } else if (this.state === 'waiting-point') {
      // Waiting for point after selecting half-hinge-line
      
      console.log('[GuideTool] Paper.hitTest() result for through-point:', hit);
      
      if (hit.elementType !== 'point') {
        this.reset();
        return this.failure('Expected a point. Please click on an existing point.');
      }
      
      this.throughPointId = hit.elementId;
      
    } else {
      // Waiting for half-hinge-line after selecting point
      
      console.log('[GuideTool] Paper.hitTest() result for reference line:', hit);
      
      if (hit.elementType !== 'half-hinge-line') {
        this.reset();
        return this.failure('Expected a hinge line. Please click on a hinge line.');
      }
      
      this.referenceLineId = hit.elementId;
    }

    // If we reach here, we have both elements - create the guide
    if (this.referenceLineId && this.throughPointId) {
      const throughPointId = this.throughPointId;
      
      try {
        // Build Command directly
        const cmd = new Command("Create guide", world);
        
        // Use factory to create guide with conditional sibling
        const result = GuideSequenceFactory.createGuideWithSibling(
          cmd, 
          planeId, 
          this.referenceLineId!, 
          throughPointId, 
          world
        );
        
        const guideId = result.guideId;
        const siblingGuideId = result.siblingGuideId;
        
        // Record ProcessTree action for primary guide
        const action = createGuideAction(guideId, planeId, this.referenceLineId!, throughPointId);
        world.getProcessTree().addAction(action);
        
        // Record ProcessTree action for sibling guide (if created)
        if (siblingGuideId) {
          // Get sibling info to find reference line on sibling plane
          const siblingInfo = world.getSiblingPlaneAndHalfHingeLineForGuide(this.referenceLineId!, planeId);
          if (siblingInfo) {
            const siblingAction = createSiblingGuideAction(
              siblingGuideId, 
              siblingInfo.siblingPlaneId, 
              guideId, 
              siblingInfo.siblingHalfHingeLineId
            );
            world.getProcessTree().addAction(siblingAction);
          }
        }
        
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
    
    // Should never reach here
    this.reset();
    return this.failure('Unexpected state in guide creation');
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
   * - waiting-first: Allow both half-hinge-line and point selection
   * - waiting-line: Allow half-hinge-line selection only
   * - waiting-point: Allow point selection only
   */
  getSelectionMask(): SelectionMask {
    if (this.state === 'waiting-first') {
      return SelectionMask.union(SelectionMask.halfHingeLine(), SelectionMask.point());
    } else if (this.state === 'waiting-line') {
      return SelectionMask.halfHingeLine();
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
      referenceLineId: this.referenceLineId,
      throughPointId: this.throughPointId
    };
  }

  /**
   * Reset tool state for new guide
   */
  private reset(): void {
    this.state = 'waiting-first';
    this.referenceLineId = undefined;
    this.throughPointId = undefined;
  }
}

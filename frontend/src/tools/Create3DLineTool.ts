/**
 * Create3DLineTool - Tool for creating 3D lines from two 2D line projections
 * 
 * Phase 78: 3D Element Creation Tools
 * 
 * Implements multi-step workflow:
 * 1. First click: Select first 2D line projection (on any plane)
 * 2. Second click: Select second 2D line projection (must be on DIFFERENT plane)
 * 3. Validate different-plane requirement
 * 4. Create Line3DFromProjections using Add3DLineOp
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
import { Add3DLineOp } from '@/commands/operations/world/Add3DLineOp';
import { SelectionMask } from '@/types/SelectionMask';

/**
 * Create3DLineTool state machine:
 * - State 'waiting-first': Waiting for first projection line
 * - State 'waiting-second': First projection selected, waiting for second projection on different plane
 */
export class Create3DLineTool extends BaseTool {
  readonly name = 'create3dline';
  readonly completionBehavior = 'stay-active' as const;
  
  private state: 'waiting-first' | 'waiting-second' = 'waiting-first';
  private firstProjectionId?: string;
  private firstPlaneId?: string;

  handleClick(context: ToolContext): ToolResult {
    const { planeId, planeCoords, canvasCoords, commandStack, world, paper, paperToPlaneTransform } = context;
    
    if (!this.validateCoordinates(planeCoords)) {
      return this.failure('Invalid coordinates');
    }
    
    if (!this.validatePlane(planeId, world)) {
      return this.failure(`Plane not found: ${planeId}`);
    }

    const canvasPos = new Vector3(canvasCoords.x, canvasCoords.y, 1);
    const selectionMask = this.getSelectionMask();
    const hit = paper.hitTest(canvasPos, 50, planeId, paperToPlaneTransform, world, selectionMask);
    
    console.log('[Create3DLineTool] Paper.hitTest() result:', hit);
    
    if (!hit) {
      return this.failure('No line found at click position. Please click near an existing 2D line.');
    }

    if (this.state === 'waiting-first') {
      this.firstProjectionId = hit.elementId;
      this.firstPlaneId = planeId;
      this.state = 'waiting-second';
      return this.success(`Selected first projection: ${hit.elementId} on plane ${planeId}. Now select a line on a DIFFERENT plane.`);
      
    } else {
      const secondProjectionId = hit.elementId;
      const secondPlaneId = planeId;
      
      if (secondPlaneId === this.firstPlaneId) {
        return this.failure(
          `Cannot create 3D line: both projections are on the same plane (${secondPlaneId}). ` +
          `Please select a line on a DIFFERENT plane.`
        );
      }
      
      const plane1 = world.getProjectionPlaneById(this.firstPlaneId!);
      const plane2 = world.getProjectionPlaneById(secondPlaneId);
      
      if (!plane1 || !plane2) {
        this.reset();
        return this.failure('One or both projection planes no longer exist');
      }
      
      const proj1 = plane1.getLine(this.firstProjectionId!);
      const proj2 = plane2.getLine(secondProjectionId);
      
      if (!proj1 || !proj2) {
        this.reset();
        return this.failure('One or both projection lines no longer exist');
      }
      
      try {
        const cmd = new Command("Create 3D line from projections", world);
        
        const result = cmd.addAndExecute(new Add3DLineOp(
          this.firstProjectionId!,
          secondProjectionId,
          this.firstPlaneId!,
          secondPlaneId
        ));
        
        const line3dId = result.outputs.lineId;
        
        cmd.commit();
        commandStack.push(cmd);
        
        const firstProj = this.firstProjectionId;
        const firstPlane = this.firstPlaneId;
        
        this.reset();
        this.handleCompletion(context.toolStore);
        
        return this.success(
          `Created 3D line ${line3dId} from projections: ` +
          `${firstProj} (${firstPlane}) and ${secondProjectionId} (${secondPlaneId})`
        );
        
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.reset();
        return this.failure(`Failed to create 3D line: ${message}`);
      }
    }
  }

  cancel(): void {
    this.reset();
  }

  getSelectionMask(): SelectionMask {
    return SelectionMask.line();
  }

  getState(): Record<string, any> {
    return {
      state: this.state,
      firstProjectionId: this.firstProjectionId,
      firstPlaneId: this.firstPlaneId
    };
  }

  isValidSecondPlane(candidatePlaneId: string): boolean {
    if (this.state !== 'waiting-second') {
      return true;
    }
    return candidatePlaneId !== this.firstPlaneId;
  }

  private reset(): void {
    this.state = 'waiting-first';
    this.firstProjectionId = undefined;
    this.firstPlaneId = undefined;
  }
}

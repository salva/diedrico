/**
 * Create3DPlaneTool - Tool for creating 3D planes from two trace lines
 * 
 * Phase 78: 3D Element Creation Tools
 * 
 * Implements multi-step workflow:
 * 1. First click: Select first trace line (on any plane)
 * 2. Second click: Select second trace line (must be on DIFFERENT plane)
 * 3. Validate different-plane requirement
 * 4. Create Plane3DFromTraces using Add3DPlaneOp
 * 
 * Trace lines are typically:
 * - Horizontal trace: intersection of 3D plane with horizontal projection plane P_H
 * - Vertical trace: intersection of 3D plane with vertical projection plane P_V
 * 
 * Reference: specs/001-dihedral-learning-mvp/spec.md - Phase 78
 */

import { Vector3 } from 'three';
import { BaseTool } from './BaseTool';
import type { ToolContext, ToolResult } from './ITool';
import { Command } from '@/commands/Command';
import { Add3DPlaneOp } from '@/commands/operations/world/Add3DPlaneOp';
import { SelectionMask } from '@/types/SelectionMask';

/**
 * Create3DPlaneTool state machine:
 * - State 'waiting-first': Waiting for first trace line
 * - State 'waiting-second': First trace selected, waiting for second trace on different plane
 */
export class Create3DPlaneTool extends BaseTool {
  readonly name = 'create3dplane';
  readonly completionBehavior = 'stay-active' as const;
  
  private state: 'waiting-first' | 'waiting-second' = 'waiting-first';
  private firstTraceId?: string;
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
    
    console.log('[Create3DPlaneTool] Paper.hitTest() result:', hit);
    
    if (!hit) {
      return this.failure('No line found at click position. Please click near an existing trace line.');
    }

    if (this.state === 'waiting-first') {
      this.firstTraceId = hit.elementId;
      this.firstPlaneId = planeId;
      this.state = 'waiting-second';
      return this.success(`Selected first trace: ${hit.elementId} on plane ${planeId}. Now select a trace line on a DIFFERENT plane.`);
      
    } else {
      const secondTraceId = hit.elementId;
      const secondPlaneId = planeId;
      
      if (secondPlaneId === this.firstPlaneId) {
        return this.failure(
          `Cannot create 3D plane: both traces are on the same plane (${secondPlaneId}). ` +
          `Please select a trace line on a DIFFERENT plane.`
        );
      }
      
      const plane1 = world.getProjectionPlaneById(this.firstPlaneId!);
      const plane2 = world.getProjectionPlaneById(secondPlaneId);
      
      if (!plane1 || !plane2) {
        this.reset();
        return this.failure('One or both projection planes no longer exist');
      }
      
      const trace1 = plane1.getLine(this.firstTraceId!);
      const trace2 = plane2.getLine(secondTraceId);
      
      if (!trace1 || !trace2) {
        this.reset();
        return this.failure('One or both trace lines no longer exist');
      }
      
      try {
        const cmd = new Command("Create 3D plane from traces", world);
        
        const result = cmd.addAndExecute(new Add3DPlaneOp(
          this.firstTraceId!,
          secondTraceId,
          this.firstPlaneId!,
          secondPlaneId
        ));
        
        const plane3dId = result.outputs.planeId;
        
        cmd.commit();
        commandStack.push(cmd);
        
        const firstTrace = this.firstTraceId;
        const firstPlane = this.firstPlaneId;
        
        this.reset();
        this.handleCompletion(context.toolStore);
        
        return this.success(
          `Created 3D plane ${plane3dId} from traces: ` +
          `${firstTrace} (${firstPlane}) and ${secondTraceId} (${secondPlaneId})`
        );
        
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.reset();
        return this.failure(`Failed to create 3D plane: ${message}`);
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
      firstTraceId: this.firstTraceId,
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
    this.firstTraceId = undefined;
    this.firstPlaneId = undefined;
  }
}

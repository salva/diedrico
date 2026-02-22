/**
 * Quick3DSegmentTool - Automatic 3D segment creation from predefined projections
 * 
 * Creates a complete 3D segment immediately using fixed coordinates:
 * - P_H projection: Segment from (2, 3) to (8, 7)
 * - P_V projection: Segment from (2, 4) to (8, 6)
 * - 3D segment: From approximately (2, 3, 4) to (8, 7, 6)
 * 
 * Geometric relationship:
 * - P_H maps (u,v) → (x=u, y=v, z=0), so endpoints project to (2,3,0) and (8,7,0)
 * - P_V maps (u,v) → (x=u, y=0, z=v), so endpoints project to (2,0,4) and (8,0,6)
 * - Reconstructed 3D segment: from (2, 3, 4) to (8, 7, 6)
 * 
 * Useful for:
 * - Quick testing of 3D segment visualization without manual construction
 * - Creating consistent example 3D segments for demo/screenshots
 * - Demonstrating 3D segment from projections concept
 * 
 * Pattern: Same as Quick3DLineTool (Phase 105) — immediate execution
 * Related: Create3DSegmentTool (interactive, user selects existing segments)
 * 
 * Phase 109
 */

import type { ITool, ToolContext, ToolResult } from './ITool';
import type { SelectionMask } from '@/types/SelectionMask';
import { Command } from '@/commands/Command';
import { Vector3 } from 'three';
import { PointSequenceFactory } from '@/commands/factories/PointSequenceFactory';
import { AddSegment2DByPointsOp } from '@/commands/operations/world/AddSegmentOp';
import { Add3DSegmentOp } from '@/commands/operations/world/Add3DSegmentOp';
import { createAdd3DSegmentAction } from '@/domain/processTree/actions/Element3DActions';
import { createSegmentAction } from '@/domain/processTree/actions/CreateSegmentAction';
import { AddProcessTreeActionOp } from '@/commands/operations/processTree/AddProcessTreeActionOp';
import { AddProcessTreeActionGroupOp } from '@/commands/operations/processTree/AddProcessTreeActionGroupOp';
import { createActionGroup } from '@/domain/processTree/ActionGroup';

/**
 * Tool that automatically creates 3D segment from predefined projections
 * 
 * Executes immediately on activation (toolbar click) - no canvas interaction needed
 */
export class Quick3DSegmentTool implements ITool {
  readonly name = 'quick3dsegment';

  activate(context: ToolContext): void {
    // Execute setup immediately on tool activation
    this.executeSetup(context);
  }

  deactivate(_context: ToolContext): void {
    // No state to clean up
  }

  handleClick(context: ToolContext): ToolResult {
    // Also allow execution on canvas click (for consistency)
    this.executeSetup(context);
    return { success: true, message: 'Quick 3D segment created' };
  }

  getSelectionMask(): SelectionMask | undefined {
    // Tool doesn't need to select anything
    return undefined;
  }

  private executeSetup(context: ToolContext): void {
    const { world, commandStack, toolStore } = context;
    
    // Find P_H and P_V
    const P_H = world.getAllProjectionPlanes().find(p => p.name === 'P_H');
    const P_V = world.getAllProjectionPlanes().find(p => p.name === 'P_V');
    
    if (!P_H || !P_V) {
      console.error('Standard projection planes not found');
      toolStore.setTool('select');
      return;
    }

    const cmd = new Command('Quick 3D segment setup', world);

    // Create operation group for this tool execution
    const groupId = `group_${Date.now()}_quick_3dsegment`;
    const group = createActionGroup(groupId);
    cmd.addAndExecute(new AddProcessTreeActionGroupOp(group));

    try {
      // Create P_H projection: segment from (2, 3) to (8, 7)
      // In 3D: from (2, 3, 0) to (8, 7, 0) on the horizontal plane
      const p1_H = new Vector3(2, 3, 1);
      const { pointId: p1Id_H } = PointSequenceFactory.createFreePoint(cmd, P_H.id!, p1_H, groupId);
      
      const p2_H = new Vector3(8, 7, 1);
      const { pointId: p2Id_H } = PointSequenceFactory.createFreePoint(cmd, P_H.id!, p2_H, groupId);
      
      // Create segment on P_H
      const addSegH = new AddSegment2DByPointsOp(P_H.id!, p1Id_H, p2Id_H);
      const segHResult = cmd.addAndExecute(addSegH);
      
      if (!segHResult.success || !segHResult.outputs.segmentId) {
        console.error('[Quick3DSegmentTool] Failed to create P_H segment:', segHResult.error);
        throw new Error(segHResult.error || 'Failed to create P_H segment');
      }
      const segId_H = segHResult.outputs.segmentId as string;

      // Record ProcessTree action for P_H segment
      const segHAction = createSegmentAction(segId_H);
      cmd.addAndExecute(new AddProcessTreeActionOp(segHAction, groupId));

      // Create P_V projection: segment from (2, 4) to (8, 6)
      // In 3D: from (2, 0, 4) to (8, 0, 6) on the vertical plane
      const p1_V = new Vector3(2, 4, 1);
      const { pointId: p1Id_V } = PointSequenceFactory.createFreePoint(cmd, P_V.id!, p1_V, groupId);
      
      const p2_V = new Vector3(8, 6, 1);
      const { pointId: p2Id_V } = PointSequenceFactory.createFreePoint(cmd, P_V.id!, p2_V, groupId);
      
      // Create segment on P_V
      const addSegV = new AddSegment2DByPointsOp(P_V.id!, p1Id_V, p2Id_V);
      const segVResult = cmd.addAndExecute(addSegV);
      
      if (!segVResult.success || !segVResult.outputs.segmentId) {
        console.error('[Quick3DSegmentTool] Failed to create P_V segment:', segVResult.error);
        throw new Error(segVResult.error || 'Failed to create P_V segment');
      }
      const segId_V = segVResult.outputs.segmentId as string;

      // Record ProcessTree action for P_V segment
      const segVAction = createSegmentAction(segId_V);
      cmd.addAndExecute(new AddProcessTreeActionOp(segVAction, groupId));

      // Create 3D segment from projections
      const add3DSegmentOp = new Add3DSegmentOp(segId_H, segId_V, P_H.id!, P_V.id!);
      const result = cmd.addAndExecute(add3DSegmentOp);
      
      if (!result.success || !result.outputs.segmentId) {
        console.error('[Quick3DSegmentTool] Failed to create 3D segment:', result.error);
        throw new Error(result.error || 'Failed to create 3D segment');
      }

      const segment3DId = result.outputs.segmentId as string;
      console.log('[Quick3DSegmentTool] Created 3D segment:', segment3DId);
      
      // Verify the 3D segment realizes correctly
      const segment3D = world.get3DSegment(segment3DId);
      if (segment3D) {
        const realization = world.get3DSegmentRealization(segment3DId);
        console.log('[Quick3DSegmentTool] 3D segment realization:', {
          feasible: realization?.isFeasible,
          startPoint: realization ? [realization.startPoint.x, realization.startPoint.y, realization.startPoint.z] : null,
          endPoint: realization ? [realization.endPoint.x, realization.endPoint.y, realization.endPoint.z] : null
        });
      }

      // Record ProcessTree action for 3D segment
      const action = createAdd3DSegmentAction(segment3DId);
      cmd.addAndExecute(new AddProcessTreeActionOp(action, groupId));

      // Commit and push command, then return to selection tool
      cmd.commit();
      commandStack.push(cmd);
      
    } catch (error) {
      console.error('Quick 3D segment creation failed:', error);
    } finally {
      toolStore.setTool('select');
    }
  }
}

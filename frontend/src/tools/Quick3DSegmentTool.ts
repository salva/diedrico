/**
 * Quick3DSegmentTool - Automatic 3D segment creation using geometrically constrained construction
 * 
 * Creates a complete 3D segment using the correct dihedral geometry construction:
 * 1. Create line projections L_H and L_V (the containing line on each plane)
 * 2. Use guides perpendicular to the hinge line through the P_H endpoints
 * 3. Find intersection of sibling guides with L_V → constrained P_V endpoints
 * 4. Create segments on both planes and the 3D segment
 * 
 * Coordinates:
 * - P_H line/segment endpoints: (2, 3) and (8, 7)
 * - P_V line definition points: (2, 4) and (8, 6)
 * - P_V segment endpoints: intersection of sibling guides with L_V (constrained)
 * - 3D segment: From approximately (2, 3, 4) to (8, 7, 6)
 * 
 * Constraint mechanism:
 * - The guide on P_H at x=u creates a sibling guide on P_V also at x=u
 * - The sibling guide intersects L_V, giving a constrained point on P_V
 * - Moving a P_H point moves its guide → moves sibling → moves P_V intersection
 * - The 3D segment stays feasible because correspondence is enforced by guides
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
import { LineSequenceFactory } from '@/commands/factories/LineSequenceFactory';
import { GuideSequenceFactory } from '@/commands/factories/GuideSequenceFactory';
import { IntersectionSequenceFactory } from '@/commands/factories/IntersectionSequenceFactory';
import { AddSegment2DByPointsOp } from '@/commands/operations/world/AddSegmentOp';
import { Add3DSegmentOp } from '@/commands/operations/world/Add3DSegmentOp';
import { createAdd3DSegmentAction } from '@/domain/processTree/actions/Element3DActions';
import { createSegmentAction } from '@/domain/processTree/actions/CreateSegmentAction';
import { createGuideAction } from '@/domain/processTree/actions/CreateGuideAction';
import { AddProcessTreeActionOp } from '@/commands/operations/processTree/AddProcessTreeActionOp';
import { AddProcessTreeActionGroupOp } from '@/commands/operations/processTree/AddProcessTreeActionGroupOp';
import { createActionGroup } from '@/domain/processTree/ActionGroup';

/**
 * Tool that automatically creates 3D segment from constrained projections
 * 
 * Uses guides and intersections to enforce geometric correspondence between planes.
 * Executes immediately on activation (toolbar click) - no canvas interaction needed.
 */
export class Quick3DSegmentTool implements ITool {
  readonly name = 'quick3dsegment';

  activate(context: ToolContext): void {
    this.executeSetup(context);
  }

  deactivate(_context: ToolContext): void {
    // No state to clean up
  }

  handleClick(context: ToolContext): ToolResult {
    this.executeSetup(context);
    return { success: true, message: 'Quick 3D segment created' };
  }

  getSelectionMask(): SelectionMask | undefined {
    return undefined;
  }

  private executeSetup(context: ToolContext): void {
    const { world, commandStack, toolStore } = context;
    
    // Find P_H and P_V
    const P_H = world.getAllProjectionPlanes().find(p => p.name === 'P_H');
    const P_V = world.getAllProjectionPlanes().find(p => p.name === 'P_V');
    
    if (!P_H || !P_V) {
      console.error('[Quick3DSegmentTool] Standard projection planes not found');
      toolStore.setTool('select');
      return;
    }

    // Find the HalfHingeLine on P_H (needed for guide creation)
    const hhlsOnPH = world.getHalfHingeLines2D(P_H.id!);
    if (hhlsOnPH.length === 0) {
      console.error('[Quick3DSegmentTool] No HalfHingeLine2D found on P_H');
      toolStore.setTool('select');
      return;
    }
    const hhlOnPH = hhlsOnPH[0];

    const cmd = new Command('Quick 3D segment setup', world);

    const groupId = `group_${Date.now()}_quick_3dsegment`;
    const group = createActionGroup(groupId);
    cmd.addAndExecute(new AddProcessTreeActionGroupOp(group));

    try {
      // === Step 1: Create line L_H on P_H (containing line, horizontal projection) ===
      // These points also serve as segment endpoints on P_H
      const { pointId: p1Id_H } = PointSequenceFactory.createFreePoint(
        cmd, P_H.id!, new Vector3(2, 3, 1), groupId
      );
      const { pointId: p2Id_H } = PointSequenceFactory.createFreePoint(
        cmd, P_H.id!, new Vector3(8, 7, 1), groupId
      );
      const { lineId: lineId_H } = LineSequenceFactory.createLineByTwoPoints(
        cmd, P_H.id!, p1Id_H, p2Id_H, groupId
      );

      // === Step 2: Create line L_V on P_V (containing line, vertical projection) ===
      const { pointId: p1Id_V } = PointSequenceFactory.createFreePoint(
        cmd, P_V.id!, new Vector3(2, 4, 1), groupId
      );
      const { pointId: p2Id_V } = PointSequenceFactory.createFreePoint(
        cmd, P_V.id!, new Vector3(8, 6, 1), groupId
      );
      const { lineId: lineId_V } = LineSequenceFactory.createLineByTwoPoints(
        cmd, P_V.id!, p1Id_V, p2Id_V, groupId
      );

      // === Step 3: Create guides through P_H segment endpoints ===
      // Guide 1: perpendicular to HHL through p1_H → sibling guide on P_V
      const { guideId: guide1Id, siblingGuideId: sibGuide1Id } =
        GuideSequenceFactory.createGuideWithSibling(
          cmd, P_H.id!, hhlOnPH.id, p1Id_H, world
        );
      cmd.addAndExecute(new AddProcessTreeActionOp(createGuideAction(guide1Id), groupId));
      if (sibGuide1Id) {
        cmd.addAndExecute(new AddProcessTreeActionOp(createGuideAction(sibGuide1Id), groupId));
      }

      // Guide 2: perpendicular to HHL through p2_H → sibling guide on P_V
      const { guideId: guide2Id, siblingGuideId: sibGuide2Id } =
        GuideSequenceFactory.createGuideWithSibling(
          cmd, P_H.id!, hhlOnPH.id, p2Id_H, world
        );
      cmd.addAndExecute(new AddProcessTreeActionOp(createGuideAction(guide2Id), groupId));
      if (sibGuide2Id) {
        cmd.addAndExecute(new AddProcessTreeActionOp(createGuideAction(sibGuide2Id), groupId));
      }

      if (!sibGuide1Id || !sibGuide2Id) {
        throw new Error('Failed to create sibling guides on P_V');
      }

      // === Step 4: Find intersection of sibling guides with L_V on P_V ===
      // These constrained points are the segment endpoints on P_V
      const { pointId: int1Id_V } = IntersectionSequenceFactory.createLineLineIntersection(
        cmd, P_V.id!, sibGuide1Id, lineId_V, world, groupId
      );
      const { pointId: int2Id_V } = IntersectionSequenceFactory.createLineLineIntersection(
        cmd, P_V.id!, sibGuide2Id, lineId_V, world, groupId
      );

      // === Step 5: Create segment on P_H ===
      const addSegH = new AddSegment2DByPointsOp(P_H.id!, p1Id_H, p2Id_H);
      const segHResult = cmd.addAndExecute(addSegH);
      if (!segHResult.success || !segHResult.outputs.segmentId) {
        throw new Error(segHResult.error || 'Failed to create P_H segment');
      }
      const segId_H = segHResult.outputs.segmentId as string;
      cmd.addAndExecute(new AddProcessTreeActionOp(createSegmentAction(segId_H), groupId));

      // === Step 6: Create segment on P_V from intersection points ===
      const addSegV = new AddSegment2DByPointsOp(P_V.id!, int1Id_V, int2Id_V);
      const segVResult = cmd.addAndExecute(addSegV);
      if (!segVResult.success || !segVResult.outputs.segmentId) {
        throw new Error(segVResult.error || 'Failed to create P_V segment');
      }
      const segId_V = segVResult.outputs.segmentId as string;
      cmd.addAndExecute(new AddProcessTreeActionOp(createSegmentAction(segId_V), groupId));

      // === Step 7: Create 3D segment from the two 2D segments ===
      const add3DSegmentOp = new Add3DSegmentOp(segId_H, segId_V, P_H.id!, P_V.id!);
      const result = cmd.addAndExecute(add3DSegmentOp);
      if (!result.success || !result.outputs.segmentId) {
        throw new Error(result.error || 'Failed to create 3D segment');
      }
      const segment3DId = result.outputs.segmentId as string;

      // Record ProcessTree action for 3D segment
      cmd.addAndExecute(new AddProcessTreeActionOp(createAdd3DSegmentAction(segment3DId), groupId));

      cmd.commit();
      commandStack.push(cmd);
      
    } catch (error) {
      console.error('Quick 3D segment creation failed:', error);
    } finally {
      toolStore.setTool('select');
    }
  }
}

/**
 * Quick3DLineTool - Automatic 3D line creation from predefined projections
 * 
 * Creates a complete 3D line immediately using fixed coordinates:
 * - P_H projection: L_H from (0, 0) to (50, 50) - diagonal line
 * - P_V projection: L_V from (0, 0) to (50, 50) - diagonal line
 * - 3D line: Line3DFromProjections through origin with direction (1, 1, 1)
 * 
 * Geometric relationship:
 * - P_H maps (u,v) → (x=u, y=v, z=0)
 * - L_H has direction (1,1) in P_H → direction (1,1,0) in 3D
 * - P_V maps (u,v) → (x=u, y=0, z=v)
 * - L_V has direction (1,1) in P_V → direction (1,0,1) in 3D
 * - Reconstructed 3D line: direction (1,1,1), through origin
 * 
 * Useful for:
 * - Quick testing without manual projection creation (~100x faster than manual)
 * - Creating consistent example 3D lines for demo/screenshots
 * - Demonstrating 3D line from projections concept
 * 
 * Pattern: Similar to QuickProjectionSetupTool (immediate execution)
 * Related: Create3DLineTool (interactive, user selects existing lines)
 * 
 * Phase 105
 */

import type { ITool, ToolContext, ToolResult } from './ITool';
import type { SelectionMask } from '@/types/SelectionMask';
import { Command } from '@/commands/Command';
import { Vector3 } from 'three';
import { PointSequenceFactory } from '@/commands/factories/PointSequenceFactory';
import { LineSequenceFactory } from '@/commands/factories/LineSequenceFactory';
import { Add3DLineOp } from '@/commands/operations/world/Add3DLineOp';
import { createAdd3DLineAction } from '@/domain/processTree/actions/Element3DActions';
import { AddProcessTreeActionOp } from '@/commands/operations/processTree/AddProcessTreeActionOp';
import { AddProcessTreeActionGroupOp } from '@/commands/operations/processTree/AddProcessTreeActionGroupOp';
import { createActionGroup } from '@/domain/processTree/ActionGroup';

/**
 * Tool that automatically creates 3D line from predefined projections
 * 
 * Executes immediately on activation (toolbar click) - no canvas interaction needed
 */
export class Quick3DLineTool implements ITool {
  readonly name = 'quick3dline';

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
    return { success: true, message: 'Quick 3D line created' };
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

    const cmd = new Command('Quick 3D line setup', world);

    // Create operation group for this tool execution
    const groupId = `group_${Date.now()}_quick_3dline`;
    const group = createActionGroup(groupId);
    cmd.addAndExecute(new AddProcessTreeActionGroupOp(group));

    try {
      // Create P_H projection: line through origin with direction (1, 1)
      // In 3D: line through (0,0,0) with direction (1,1,0) when z=0
      const p1_H = new Vector3(0, 0, 1);
      const { pointId: p1Id_H } = PointSequenceFactory.createFreePoint(cmd, P_H.id!, p1_H, groupId);
      
      const p2_H = new Vector3(50, 50, 1);
      const { pointId: p2Id_H } = PointSequenceFactory.createFreePoint(cmd, P_H.id!, p2_H, groupId);
      
      const { lineId: lineId_H } = LineSequenceFactory.createLineByTwoPoints(
        cmd, P_H.id!, p1Id_H, p2Id_H, groupId
      );

      // Create P_V projection: line through origin with direction (1, 1)
      // In 3D: line through (0,0,0) with direction (1,0,1) when y=0
      const p1_V = new Vector3(0, 0, 1);
      const { pointId: p1Id_V } = PointSequenceFactory.createFreePoint(cmd, P_V.id!, p1_V, groupId);
      
      const p2_V = new Vector3(50, 50, 1);
      const { pointId: p2Id_V } = PointSequenceFactory.createFreePoint(cmd, P_V.id!, p2_V, groupId);
      
      const { lineId: lineId_V } = LineSequenceFactory.createLineByTwoPoints(
        cmd, P_V.id!, p1Id_V, p2Id_V, groupId
      );

      // Create 3D line from projections
      const add3DLineOp = new Add3DLineOp(lineId_H, lineId_V, P_H.id!, P_V.id!);
      const result = cmd.addAndExecute(add3DLineOp);
      
      if (!result.success || !result.outputs.line3DId) {
        console.error('[Quick3DLineTool] Failed to create 3D line:', result.error);
        throw new Error(result.error || 'Failed to create 3D line');
      }

      const line3DId = result.outputs.line3DId as string;
      console.log('[Quick3DLineTool] Created 3D line:', line3DId);
      
      // Verify the 3D line realizes correctly
      const line3D = world.get3DLine(line3DId);
      if (line3D) {
        const realization = world.get3DLineRealization(line3DId);
        console.log('[Quick3DLineTool] 3D line realization:', {
          feasible: realization?.isFeasible,
          point: realization ? [realization.point.x, realization.point.y, realization.point.z] : null,
          direction: realization ? [realization.direction.x, realization.direction.y, realization.direction.z] : null
        });
      }

      // Record ProcessTree action for 3D line
      const action = createAdd3DLineAction(line3DId);
      cmd.addAndExecute(new AddProcessTreeActionOp(action, groupId));

      // Commit and push command, then return to selection tool
      cmd.commit();
      commandStack.push(cmd);
      
    } catch (error) {
      console.error('Quick 3D line creation failed:', error);
    } finally {
      toolStore.setTool('select');
    }
  }
}

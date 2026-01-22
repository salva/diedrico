/**
 * QuickProjectionSetupTool - Automatic projection plane setup with predefined points
 * 
 * Creates a complete 14-step geometric construction immediately using fixed coordinates:
 * - A1 = (-20, 20) on P_H
 * - A2 = (0, 10) on P_H
 * - B1 = (0, 20) on P_V
 * 
 * Useful for:
 * - Quick testing without manual point selection
 * - Creating consistent example setups
 * - Demonstrating auxiliary projection plane workflow
 * 
 * Related: InteractiveProjectionSetupTool (user selects points)
 */

import type { ITool, ToolContext, ToolResult } from './ITool';
import type { SelectionMask } from '@/types/SelectionMask';
import { Command } from '@/commands/Command';
import { Vector3 } from 'three';
import { PointSequenceFactory } from '@/commands/factories/PointSequenceFactory';
import { constructProjectionPlaneSetup } from '../commands/factories/ProjectionSetupFactory';

/**
 * Tool that automatically creates projection plane setup with predefined points
 * 
 * Executes immediately on activation (toolbar click) - no canvas interaction needed
 */
export class QuickProjectionSetupTool implements ITool {
  readonly name = 'quickprojectionsetup';

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
    return { success: true, message: 'Quick projection setup created' };
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

    const cmd = new Command('Quick projection setup', world);

    // Create A1 on P_H
    const a1Pos = new Vector3(-20, 20, 1);
    const { pointId: a1Id } = PointSequenceFactory.createFreePoint(cmd, P_H.id!, a1Pos);
    const a1Point = world.getPoint2D(a1Id);
    if (a1Point) a1Point.label = 'A1';

    // Create A2 on P_H  
    const a2Pos = new Vector3(0, 10, 1);
    const { pointId: a2Id } = PointSequenceFactory.createFreePoint(cmd, P_H.id!, a2Pos);
    const a2Point = world.getPoint2D(a2Id);
    if (a2Point) a2Point.label = 'A2';

    // Create B1 on P_V
    const b1Pos = new Vector3(0, 20, 1);
    const { pointId: b1Id } = PointSequenceFactory.createFreePoint(cmd, P_V.id!, b1Pos);
    const b1Point = world.getPoint2D(b1Id);
    if (b1Point) b1Point.label = 'B1';

    // Construct complete projection plane setup
    constructProjectionPlaneSetup(cmd, context, a1Id, a2Id, b1Id);

    // Commit and push command, then return to selection tool
    cmd.commit();
    commandStack.push(cmd);
    toolStore.setTool('select');
  }
}


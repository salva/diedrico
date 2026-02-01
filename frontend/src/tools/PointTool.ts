/**
 * PointTool - Tool for creating free points (ArgumentCollectorTool Migration)
 * 
 * Migrated to ArgumentCollectorTool framework.
 * 
 * Uses SelectionMask.none() to capture just the mouse position without selecting
 * any existing element. Framework creates ArgumentValue with element=null.
 * 
 * Code reduction: ~80 lines → ~50 lines (37% reduction)
 * 
 * Reference: specs/001-dihedral-learning-mvp/spec.md §US1
 */

import { ArgumentCollectorTool } from './ArgumentCollectorTool';
import type { ToolContext } from './ITool';
import type { ToolArgumentSet, ArgumentValue } from '@/types/ToolArgumentCollector';
import { SelectionMask } from '@/types/SelectionMask';
import { Command } from '@/commands/Command';
import { PointSequenceFactory } from '@/commands/factories/PointSequenceFactory';
import { createActionGroup } from '@/domain/processTree/ActionGroup';
import { AddProcessTreeActionGroupOp } from '@/commands/operations/processTree/AddProcessTreeActionGroupOp';

/**
 * PointTool using ArgumentCollectorTool framework
 * 
 * Framework handles:
 * - Click capture with SelectionMask.none()
 * - ArgumentValue creation with element=null, planeCoords from click
 * - Automatic execution when position captured
 * 
 * Custom behavior:
 * - Creates free point at mouse position (no element selection)
 */
export class PointTool extends ArgumentCollectorTool {
  readonly name = 'point';
  readonly completionBehavior = 'stay-active' as const;

  /**
   * Define argument specification
   * Single argument with SelectionMask.none() - just captures position
   */
  protected getArgumentSets(): ToolArgumentSet[] {
    return [
      {
        arguments: [
          { 
            name: 'position', 
            mask: SelectionMask.none()  // No element selection - just mouse position
          }
        ]
      }
    ];
  }

  /**
   * Execute point creation operations
   */
  protected executeOperations(
    cmd: Command,
    args: Map<string, ArgumentValue>,
    context: ToolContext
  ): void {
    const positionArg = args.get('position')!;
    const planeCoords = positionArg.planeCoords;
    const { planeId, world } = context;

    // Validate coordinates
    if (!this.validateCoordinates(planeCoords)) {
      throw new Error('Invalid coordinates: NaN or Infinity not allowed');
    }

    // Validate plane exists
    const plane = world.getProjectionPlaneById(planeId);
    if (!plane) {
      throw new Error(`Plane not found: ${planeId}`);
    }

    // Create user action group for this tool operation
    const groupId = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const group = createActionGroup(groupId);
    cmd.addAndExecute(new AddProcessTreeActionGroupOp(group));

    // Use factory to create free point with ProcessTree action
    PointSequenceFactory.createFreePoint(cmd, planeId, planeCoords, groupId);
  }

  /**
   * Validate that coordinates are finite numbers
   */
  private validateCoordinates(coords: any): boolean {
    if (!coords) return false;
    const { x, y, z } = coords;
    return (
      typeof x === 'number' && isFinite(x) &&
      typeof y === 'number' && isFinite(y) &&
      typeof z === 'number' && isFinite(z)
    );
  }

  protected getCommandDescription(): string {
    return "Create free point";
  }
}

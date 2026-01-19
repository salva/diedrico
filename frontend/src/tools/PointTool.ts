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
import type { ToolContext, ToolResult } from './ITool';
import type { ToolArgumentSet, ArgumentValue } from '@/types/ToolArgumentCollector';
import { SelectionMask } from '@/types/SelectionMask';
import { Command } from '@/commands/Command';
import { AddFreePoint2DOp } from '@/commands/operations/world/AddFreePointOp';
import { createPointAction } from '@/domain/processTree/actions/CreatePointAction';
import { AddProcessTreeActionOp } from '@/commands/operations/processTree/AddProcessTreeActionOp';

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
   * Execute point creation at captured position
   */
  protected execute(
    _setIndex: number,
    args: Map<string, ArgumentValue>,
    context: ToolContext
  ): ToolResult {
    const positionArg = args.get('position')!;
    const planeCoords = positionArg.planeCoords;
    const { planeId, commandStack, world } = context;

    try {
      const cmd = new Command("Create free point", world);
      
      // Use return value from addAndExecute
      const result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, planeCoords));
      
      // Extract outputs
      const pointId = result.outputs.pointId;
      
      // Record ProcessTree action
      const action = createPointAction(pointId, planeId, planeCoords);
      cmd.addAndExecute(new AddProcessTreeActionOp(action));
      
      // Commit and push
      cmd.commit();
      commandStack.push(cmd);

      // Handle tool completion (stays active for repeated use)
      this.handleCompletion(context.toolStore);

      return this.success(`Created point ${pointId}`);
      
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return this.failure(`Failed to create point: ${message}`);
    }
  }
}

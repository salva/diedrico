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
 */

import { ArgumentCollectorTool } from './ArgumentCollectorTool';
import type { ArgumentValue, ToolArgumentSet } from '@/tools/ToolArgumentCollector';
import type { ToolContext } from './ITool';
import type { ToolConstructionIntent } from './ToolCommandIntents';
import { SelectionMask } from '@/types/SelectionMask';

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

  protected buildConstructionIntent(args: Map<string, ArgumentValue>, context: ToolContext): ToolConstructionIntent {
    return {
      type: 'point',
      planeId: context.planeId,
      position: this.requirePlanePosition(args, 'position'),
      description: this.getCommandDescription()
    };
  }

  /**
   * Execute point creation operations
   */


  /**
   * Validate that coordinates are finite numbers
   */


  protected getCommandDescription(): string {
    return "Create free point";
  }
}

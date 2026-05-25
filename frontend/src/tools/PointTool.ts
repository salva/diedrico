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
import type { ToolArgumentSet } from '@/types/ToolArgumentCollector';
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


  /**
   * Validate that coordinates are finite numbers
   */


  protected getCommandDescription(): string {
    return "Create free point";
  }
}

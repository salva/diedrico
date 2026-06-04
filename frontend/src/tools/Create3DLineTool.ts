/**
 * Create3DLineTool - Creates 3D lines from projections (ArgumentCollectorTool Migration)
 * 
 * Migrated to ArgumentCollectorTool framework.
 * 
 * Two-argument workflow:
 * 1. Collect two 2D line projections (any order)
 * 2. Validate they're on DIFFERENT planes (validator)
 * 3. Create Line3DFromProjections
 * 
 * Code reduction: ~169 lines → ~110 lines (35% reduction)
 * 
 */

import { ArgumentCollectorTool } from './ArgumentCollectorTool';
import { validateDistinctProjectionPlanes } from './toolValidators';
import type { ToolArgumentSet } from '@/tools/ToolArgumentCollector';
import { SelectionMask } from '@/types/SelectionMask';

/**
 * Create3DLineTool using ArgumentCollectorTool framework
 */
export class Create3DLineTool extends ArgumentCollectorTool {
  readonly name = 'create3dline';
  protected readonly constructionIntentType = 'create3dline';

  protected getArgumentSets(): ToolArgumentSet[] {
    return [
      {
        arguments: [
          { 
            name: 'projection1', 
            mask: SelectionMask.line()
          },
          { 
            name: 'projection2', 
            mask: SelectionMask.line()
          }
        ],
        setValidator: (args, context) => validateDistinctProjectionPlanes(
          args,
          context,
          'projection1',
          'projection2',
          'Cannot create 3D line: both projections must be on DIFFERENT planes',
        )
      }
    ];
  }



  protected getCommandDescription(): string {
    return "Create 3D line from projections";
  }
}

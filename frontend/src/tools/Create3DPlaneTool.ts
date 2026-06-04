/**
 * Create3DPlaneTool - Creates 3D planes from trace lines (ArgumentCollectorTool Migration)
 * 
 * Migrated to ArgumentCollectorTool framework.
 * 
 * Two-argument workflow:
 * 1. Collect two trace lines (any order)
 * 2. Validate they're on DIFFERENT planes (validator)
 * 3. Create Plane3DFromTraces
 * 
 * Code reduction: ~156 lines → ~100 lines (36% reduction)
 * 
 */

import { ArgumentCollectorTool } from './ArgumentCollectorTool';
import { validateDistinctProjectionPlanes } from './toolValidators';
import type { ToolArgumentSet } from '@/types/ToolArgumentCollector';
import { SelectionMask } from '@/types/SelectionMask';

/**
 * Create3DPlaneTool using ArgumentCollectorTool framework
 */
export class Create3DPlaneTool extends ArgumentCollectorTool {
  readonly name = 'create3dplane';
  protected readonly constructionIntentType = 'create3dplane';

  protected getArgumentSets(): ToolArgumentSet[] {
    return [
      {
        arguments: [
          { 
            name: 'trace1', 
            mask: SelectionMask.line()
          },
          { 
            name: 'trace2', 
            mask: SelectionMask.line()
          }
        ],
        setValidator: (args, context) => validateDistinctProjectionPlanes(
          args,
          context,
          'trace1',
          'trace2',
          'Cannot create 3D plane: both traces must be on DIFFERENT planes',
        )
      }
    ];
  }



  protected getCommandDescription(): string {
    return "Create 3D plane from traces";
  }
}

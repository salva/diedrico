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
import { projectionPairArgumentSet } from './toolArgumentSpecs';
import type { ArgumentValue, ToolArgumentSet } from '@/tools/ToolArgumentCollector';
import type { ToolContext } from './ITool';
import type { ToolConstructionIntent } from './ToolCommandIntents';
import { SelectionMask } from '@/types/SelectionMask';

/**
 * Create3DPlaneTool using ArgumentCollectorTool framework
 */
export class Create3DPlaneTool extends ArgumentCollectorTool {
  readonly name = 'create3dplane';

  protected getArgumentSets(): ToolArgumentSet[] {
    return [
      projectionPairArgumentSet(
        'trace1',
        'trace2',
        SelectionMask.line(),
        'Cannot create 3D plane: both traces must be on DIFFERENT planes'
      )
    ];
  }

  protected buildConstructionIntent(args: Map<string, ArgumentValue>, _context: ToolContext): ToolConstructionIntent {
    return {
      type: 'create3dplane',
      trace1LineId: this.requireElementId(args, 'trace1'),
      trace2LineId: this.requireElementId(args, 'trace2'),
      description: this.getCommandDescription()
    };
  }



  protected getCommandDescription(): string {
    return "Create 3D plane from traces";
  }
}

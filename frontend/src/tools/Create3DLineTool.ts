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
import { projectionPairArgumentSet } from './toolArgumentSpecs';
import type { ArgumentValue, ToolArgumentSet } from '@/tools/ToolArgumentCollector';
import type { ToolContext } from './ITool';
import type { ToolConstructionIntent } from './ToolCommandIntents';
import { SelectionMask } from '@/types/SelectionMask';

/**
 * Create3DLineTool using ArgumentCollectorTool framework
 */
export class Create3DLineTool extends ArgumentCollectorTool {
  readonly name = 'create3dline';

  protected getArgumentSets(): ToolArgumentSet[] {
    return [
      projectionPairArgumentSet(
        'projection1',
        'projection2',
        SelectionMask.line(),
        'Cannot create 3D line: both projections must be on DIFFERENT planes'
      )
    ];
  }

  protected buildConstructionIntent(args: Map<string, ArgumentValue>, _context: ToolContext): ToolConstructionIntent {
    return {
      type: 'create3dline',
      projection1LineId: this.requireElementId(args, 'projection1'),
      projection2LineId: this.requireElementId(args, 'projection2'),
      description: this.getCommandDescription()
    };
  }



  protected getCommandDescription(): string {
    return "Create 3D line from projections";
  }
}

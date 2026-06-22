/**
 * Create3DSegmentTool - Creates 3D segments from projections (ArgumentCollectorTool Migration)
 * 
 * Migrated to ArgumentCollectorTool framework.
 * 
 * Two-argument workflow:
 * 1. Collect two 2D segment projections (any order)
 * 2. Validate they're on DIFFERENT planes (validator)
 * 3. Create Segment3DFromProjections
 * 
 * Code reduction: ~157 lines → ~100 lines (36% reduction)
 * 
 */

import { ArgumentCollectorTool } from './ArgumentCollectorTool';
import { projectionPairArgumentSet } from './toolArgumentSpecs';
import type { ArgumentValue, ToolArgumentSet } from '@/tools/ToolArgumentCollector';
import type { ToolContext } from './ITool';
import type { ToolConstructionIntent } from './ToolCommandIntents';
import { SelectionMask } from '@/types/SelectionMask';

/**
 * Create3DSegmentTool using ArgumentCollectorTool framework
 */
export class Create3DSegmentTool extends ArgumentCollectorTool {
  readonly name = 'create3dsegment';

  protected getArgumentSets(): ToolArgumentSet[] {
    return [
      projectionPairArgumentSet(
        'projection1',
        'projection2',
        SelectionMask.segment(),
        'Cannot create 3D segment: both projections must be on DIFFERENT planes'
      )
    ];
  }

  protected buildConstructionIntent(args: Map<string, ArgumentValue>, _context: ToolContext): ToolConstructionIntent {
    return {
      type: 'create3dsegment',
      projection1SegmentId: this.requireElementId(args, 'projection1'),
      projection2SegmentId: this.requireElementId(args, 'projection2'),
      description: this.getCommandDescription()
    };
  }



  protected getCommandDescription(): string {
    return "Create 3D segment from projections";
  }
}

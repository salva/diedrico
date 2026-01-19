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
 * Reference: specs/001-dihedral-learning-mvp/spec.md - Phase 78
 */

import { ArgumentCollectorTool } from './ArgumentCollectorTool';
import type { ToolContext } from './ITool';
import type { ToolArgumentSet, ArgumentValue, CollectionContext } from '@/types/ToolArgumentCollector';
import { SelectionMask } from '@/types/SelectionMask';
import { Command } from '@/commands/Command';
import { Add3DSegmentOp } from '@/commands/operations/world/Add3DSegmentOp';

/**
 * Create3DSegmentTool using ArgumentCollectorTool framework
 */
export class Create3DSegmentTool extends ArgumentCollectorTool {
  readonly name = 'create3dsegment';
  readonly completionBehavior = 'stay-active' as const;

  protected getArgumentSets(): ToolArgumentSet[] {
    return [
      {
        arguments: [
          { 
            name: 'projection1', 
            mask: SelectionMask.segment()
          },
          { 
            name: 'projection2', 
            mask: SelectionMask.segment()
          }
        ],
        setValidator: (args: Map<string, ArgumentValue>, context: CollectionContext) => {
          const proj1 = args.get('projection1')!;
          const proj2 = args.get('projection2')!;
          
          const plane1 = context.world.getProjectionPlaneById(proj1.element!.planeId);
          const plane2 = context.world.getProjectionPlaneById(proj2.element!.planeId);
          
          if (!plane1 || !plane2) {
            return { valid: false, error: 'One or both projection planes not found' };
          }
          
          if (plane1.id === plane2.id) {
            return { 
              valid: false, 
              error: 'Cannot create 3D segment: both projections must be on DIFFERENT planes' 
            };
          }
          
          return { valid: true };
        }
      }
    ];
  }

  protected executeOperations(
    cmd: Command,
    args: Map<string, ArgumentValue>,
    context: ToolContext
  ): void {
    const proj1 = args.get('projection1')!.element!;
    const proj2 = args.get('projection2')!.element!;
    
    const projection1Id = proj1.id;
    const projection2Id = proj2.id;
    const plane1Id = proj1.planeId;
    const plane2Id = proj2.planeId;

    cmd.addAndExecute(new Add3DSegmentOp(
      projection1Id,
      projection2Id,
      plane1Id,
      plane2Id
    ));
  }

  protected getCommandDescription(): string {
    return "Create 3D segment from projections";
  }
}

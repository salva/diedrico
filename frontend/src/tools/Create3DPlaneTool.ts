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
 * Reference: specs/001-dihedral-learning-mvp/spec.md - Phase 78
 */

import { ArgumentCollectorTool } from './ArgumentCollectorTool';
import type { ToolContext } from './ITool';
import type { ToolArgumentSet, ArgumentValue, CollectionContext } from '@/types/ToolArgumentCollector';
import { SelectionMask } from '@/types/SelectionMask';
import { Command } from '@/commands/Command';
import { PlaneSequenceFactory } from '@/services/factories/PlaneSequenceFactory';

/**
 * Create3DPlaneTool using ArgumentCollectorTool framework
 */
export class Create3DPlaneTool extends ArgumentCollectorTool {
  readonly name = 'create3dplane';
  readonly completionBehavior = 'stay-active' as const;

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
        setValidator: (args: Map<string, ArgumentValue>, context: CollectionContext) => {
          const trace1 = args.get('trace1')!;
          const trace2 = args.get('trace2')!;
          
          const plane1 = context.world.getProjectionPlaneById(trace1.element!.planeId);
          const plane2 = context.world.getProjectionPlaneById(trace2.element!.planeId);
          
          if (!plane1 || !plane2) {
            return { valid: false, error: 'One or both projection planes not found' };
          }
          
          if (plane1.id === plane2.id) {
            return { 
              valid: false, 
              error: 'Cannot create 3D plane: both traces must be on DIFFERENT planes' 
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
    _context: ToolContext
  ): void {
    const trace1 = args.get('trace1')!.element!;
    const trace2 = args.get('trace2')!.element!;
    
    const trace1Id = trace1.id;
    const trace2Id = trace2.id;
    const plane1Id = trace1.planeId;
    const plane2Id = trace2.planeId;

    // Use factory to create 3D plane with ProcessTree action
    PlaneSequenceFactory.create3DPlaneFromTraces(
      cmd,
      trace1Id,
      trace2Id,
      plane1Id,
      plane2Id
    );
  }

  protected getCommandDescription(): string {
    return "Create 3D plane from traces";
  }
}

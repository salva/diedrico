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
import type { ToolArgumentSet, ArgumentValue, CollectionContext } from '@/types/ToolArgumentCollector';
import { SelectionMask } from '@/types/SelectionMask';

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
          
          if (!context.readPort.getProjectionPlaneById(trace1.element!.planeId) || !context.readPort.getProjectionPlaneById(trace2.element!.planeId)) {
            return { valid: false, error: 'One or both projection planes not found' };
          }
          
          if (!context.readPort.areProjectionPlanesDistinct(trace1.element!.planeId, trace2.element!.planeId)) {
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



  protected getCommandDescription(): string {
    return "Create 3D plane from traces";
  }
}

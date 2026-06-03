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
import type { ToolArgumentSet, ArgumentValue, CollectionContext } from '@/types/ToolArgumentCollector';
import { SelectionMask } from '@/types/SelectionMask';

/**
 * Create3DLineTool using ArgumentCollectorTool framework
 */
export class Create3DLineTool extends ArgumentCollectorTool {
  readonly name = 'create3dline';
  protected readonly constructionIntentType = 'create3dline';
  readonly completionBehavior = 'stay-active' as const;

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
        setValidator: (args: Map<string, ArgumentValue>, context: CollectionContext) => {
          const proj1 = args.get('projection1')!;
          const proj2 = args.get('projection2')!;
          
          if (!context.readPort.getProjectionPlaneById(proj1.element!.planeId) || !context.readPort.getProjectionPlaneById(proj2.element!.planeId)) {
            return { valid: false, error: 'One or both projection planes not found' };
          }
          
          if (!context.readPort.areProjectionPlanesDistinct(proj1.element!.planeId, proj2.element!.planeId)) {
            return { 
              valid: false, 
              error: 'Cannot create 3D line: both projections must be on DIFFERENT planes' 
            };
          }
          
          return { valid: true };
        }
      }
    ];
  }



  protected getCommandDescription(): string {
    return "Create 3D line from projections";
  }
}

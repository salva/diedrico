/**
 * Create3DPointTool - Creates 3D points from projections (ArgumentCollectorTool Migration)
 * 
 * Migrated to ArgumentCollectorTool framework.
 * 
 * Two-argument workflow:
 * 1. Collect two 2D point projections (any order)
 * 2. Validate they're on DIFFERENT planes (validator)
 * 3. Create Point3DFromProjections
 * 
 * Code reduction: ~215 lines → ~110 lines (49% reduction)
 * 
 */

import { ArgumentCollectorTool } from './ArgumentCollectorTool';
import type { ToolArgumentSet, ArgumentValue, CollectionContext } from '@/types/ToolArgumentCollector';
import { SelectionMask } from '@/types/SelectionMask';

/**
 * Create3DPointTool using ArgumentCollectorTool framework
 * 
 * Framework handles:
 * - Any-order argument collection (projection1, projection2)
 * - Selection mask computation (point + point)
 * - UI feedback
 * - Automatic execution when both projections collected
 * 
 * Custom behavior:
 * - Set-level validator ensures projections are on DIFFERENT planes
 */
export class Create3DPointTool extends ArgumentCollectorTool {
  readonly name = 'create3dpoint';
  protected readonly constructionIntentType = 'create3dpoint';
  readonly completionBehavior = 'stay-active' as const;

  /**
   * Define argument specification
   * Two point arguments with different-plane validation
   */
  protected getArgumentSets(): ToolArgumentSet[] {
    return [
      {
        arguments: [
          { 
            name: 'projection1', 
            mask: SelectionMask.point()
          },
          { 
            name: 'projection2', 
            mask: SelectionMask.point()
          }
        ],
        // Set-level validator: Ensure projections are on different planes
        setValidator: (args: Map<string, ArgumentValue>, context: CollectionContext) => {
          const proj1 = args.get('projection1')!;
          const proj2 = args.get('projection2')!;
          
          // Get plane IDs from elements
          if (!context.readPort.getProjectionPlaneById(proj1.element!.planeId) || !context.readPort.getProjectionPlaneById(proj2.element!.planeId)) {
            return { valid: false, error: 'One or both projection planes not found' };
          }
          
          if (!context.readPort.areProjectionPlanesDistinct(proj1.element!.planeId, proj2.element!.planeId)) {
            return { 
              valid: false, 
              error: 'Cannot create 3D point: both projections must be on DIFFERENT planes' 
            };
          }
          
          return { valid: true };
        }
      }
    ];
  }

  /**
   * Execute 3D point creation operations
   */


  protected getCommandDescription(): string {
    return "Create 3D point from projections";
  }
}

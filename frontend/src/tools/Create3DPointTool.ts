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
import { validateDistinctProjectionPlanes } from './toolValidators';
import type { ToolArgumentSet } from '@/tools/ToolArgumentCollector';
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
        setValidator: (args, context) => validateDistinctProjectionPlanes(
          args,
          context,
          'projection1',
          'projection2',
          'Cannot create 3D point: both projections must be on DIFFERENT planes',
        )
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

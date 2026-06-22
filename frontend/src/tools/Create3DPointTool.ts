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
import { projectionPairArgumentSet } from './toolArgumentSpecs';
import type { ArgumentValue, ToolArgumentSet } from '@/tools/ToolArgumentCollector';
import type { ToolContext } from './ITool';
import type { ToolConstructionIntent } from './ToolCommandIntents';
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

  /**
   * Define argument specification
   * Two point arguments with different-plane validation
   */
  protected getArgumentSets(): ToolArgumentSet[] {
    return [
      projectionPairArgumentSet(
        'projection1',
        'projection2',
        SelectionMask.point(),
        'Cannot create 3D point: both projections must be on DIFFERENT planes'
      )
    ];
  }

  protected buildConstructionIntent(args: Map<string, ArgumentValue>, _context: ToolContext): ToolConstructionIntent {
    return {
      type: 'create3dpoint',
      projection1PointId: this.requireElementId(args, 'projection1'),
      projection2PointId: this.requireElementId(args, 'projection2'),
      description: this.getCommandDescription()
    };
  }

  /**
   * Execute 3D point creation operations
   */


  protected getCommandDescription(): string {
    return "Create 3D point from projections";
  }
}

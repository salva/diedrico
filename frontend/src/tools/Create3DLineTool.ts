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
 * Reference: specs/001-dihedral-learning-mvp/spec.md - Phase 78
 */

import { ArgumentCollectorTool } from './ArgumentCollectorTool';
import type { ToolContext, ToolResult } from './ITool';
import type { ToolArgumentSet, ArgumentValue, CollectionContext } from '@/types/ToolArgumentCollector';
import { SelectionMask } from '@/types/SelectionMask';
import { Command } from '@/commands/Command';
import { Add3DLineOp } from '@/commands/operations/world/Add3DLineOp';
import { createAdd3DLineAction } from '@/domain/processTree/actions/Element3DActions';
import { AddProcessTreeActionOp } from '@/commands/operations/processTree/AddProcessTreeActionOp';

/**
 * Create3DLineTool using ArgumentCollectorTool framework
 */
export class Create3DLineTool extends ArgumentCollectorTool {
  readonly name = 'create3dline';
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
          
          const plane1 = context.world.getProjectionPlaneById(proj1.element!.planeId);
          const plane2 = context.world.getProjectionPlaneById(proj2.element!.planeId);
          
          if (!plane1 || !plane2) {
            return { valid: false, error: 'One or both projection planes not found' };
          }
          
          if (plane1.id === plane2.id) {
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

  protected execute(
    _setIndex: number,
    args: Map<string, ArgumentValue>,
    context: ToolContext
  ): ToolResult {
    const proj1 = args.get('projection1')!.element!;
    const proj2 = args.get('projection2')!.element!;
    
    const projection1Id = proj1.id;
    const projection2Id = proj2.id;
    const plane1Id = proj1.planeId;
    const plane2Id = proj2.planeId;
    
    const { commandStack, world } = context;

    try {
      const cmd = new Command("Create 3D line from projections", world);
      
      const result = cmd.addAndExecute(new Add3DLineOp(
        projection1Id,
        projection2Id,
        plane1Id,
        plane2Id
      ));
      
      const line3dId = result.outputs.lineId;
      
      const action = createAdd3DLineAction(
        line3dId,
        projection1Id,
        projection2Id,
        plane1Id,
        plane2Id
      );
      cmd.addAndExecute(new AddProcessTreeActionOp(action));
      
      cmd.commit();
      commandStack.push(cmd);
      
      this.handleCompletion(context.toolStore);
      
      return this.success(
        `Created 3D line ${line3dId} from projections: ` +
        `${projection1Id} (${plane1Id}) and ${projection2Id} (${plane2Id})`
      );
      
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return this.failure(`Failed to create 3D line: ${message}`);
    }
  }
}

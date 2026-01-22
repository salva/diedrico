/**
 * InteractiveProjectionSetupTool - Interactive tool for creating projection plane setups
 * 
 * Allows user to select 3 points (A1, A2 on P_H and B1 on P_V) and creates the complete
 * 14-step geometric construction for projection plane setup with traces T1, T2, T2'.
 * 
 * Provides complete geometric constructions that demonstrate proper dihedral geometry
 * and facilitate testing of complex features like auxiliary projection planes.
 * 
 * Reference: specs/001-dihedral-learning-mvp/example-setups.md
 */

import { ArgumentCollectorTool } from './ArgumentCollectorTool';
import type { ToolContext } from './ITool';
import type { ToolArgumentSet, ArgumentValue, CollectionContext } from '@/types/ToolArgumentCollector';
import { SelectionMask } from '@/types/SelectionMask';
import { Command } from '@/commands/Command';
import { constructProjectionPlaneSetup } from '../commands/factories/ProjectionSetupFactory';

/**
 * Interactive tool for creating projection plane setup from user-selected points
 * 
 * User selects:
 * - A1, A2 on P_H (horizontal plane)
 * - B1 on P_V (vertical plane)
 * 
 * Tool constructs complete T1, T2, T2' setup with proper geometric unfolding.
 */
export class InteractiveProjectionSetupTool extends ArgumentCollectorTool {
  readonly name = 'interactiveprojectionsetup';
  readonly completionBehavior = 'return-to-selection' as const;

  protected getArgumentSets(): ToolArgumentSet[] {
    return [
      {
        arguments: [
          {
            name: 'pointA1',
            mask: SelectionMask.point(),
            validator: (element, context: CollectionContext) => {
              const plane = context.world.getProjectionPlaneById(element.planeId);
              if (plane?.name !== 'P_H') {
                return { valid: false, error: 'Point A1 must be on P_H (horizontal plane)' };
              }
              return { valid: true };
            }
          },
          {
            name: 'pointA2',
            mask: SelectionMask.point(),
            validator: (element, context: CollectionContext) => {
              const plane = context.world.getProjectionPlaneById(element.planeId);
              if (plane?.name !== 'P_H') {
                return { valid: false, error: 'Point A2 must be on P_H (horizontal plane)' };
              }
              return { valid: true };
            }
          },
          {
            name: 'pointB1',
            mask: SelectionMask.point(),
            validator: (element, context: CollectionContext) => {
              const plane = context.world.getProjectionPlaneById(element.planeId);
              if (plane?.name !== 'P_V') {
                return { valid: false, error: 'Point B1 must be on P_V (vertical plane)' };
              }
              return { valid: true };
            }
          }
        ]
      }
    ];
  }

  protected executeOperations(
    cmd: Command,
    args: Map<string, ArgumentValue>,
    context: ToolContext
  ): void {
    const a1 = args.get('pointA1')!.element!;
    const a2 = args.get('pointA2')!.element!;
    const b1 = args.get('pointB1')!.element!;

    constructProjectionPlaneSetup(cmd, context, a1.id, a2.id, b1.id);
  }

  protected getCommandDescription(): string {
    return "Create projection plane setup from selected points";
  }
}

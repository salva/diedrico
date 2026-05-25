/**
 * IntersectionTool - Tool for creating intersection points (ArgumentCollectorTool Migration)
 * 
 * Migrated to ArgumentCollectorTool framework.
 * 
 * Supports intersections between:
 * - Line-Line
 * - Line-Circle (and Circle-Line)
 * - Circle-Circle
 * 
 * When multiple intersection points exist (line-circle or circle-circle),
 * the tool picks the intersection point nearest to the mouse cursor using
 * the planeCoords from ArgumentValue.
 * 
 * Code reduction: ~407 lines → ~250 lines (38% reduction)
 * 
 * Reference: specs/001-dihedral-learning-mvp/spec.md
 */

import { ArgumentCollectorTool } from './ArgumentCollectorTool';
import type { ToolArgumentSet, CollectionContext, ArgumentValue } from '@/types/ToolArgumentCollector';
import type { ToolContext } from './ITool';
import type { ToolConstructionIntent } from '@/application/tools/ToolCommandIntents';
import type { Element2D } from '@/domain/world/Element2D';
import { SelectionMask } from '@/types/SelectionMask';

/**
 * IntersectionTool using ArgumentCollectorTool framework
 * 
 * Framework handles:
 * - Argument collection (element1, element2)
 * - Selection mask computation (lines and circles)
 * - UI feedback ("Creating intersection: pick element1, element2")
 * - Automatic execution when both elements collected
 */
export class IntersectionTool extends ArgumentCollectorTool {
  readonly name = 'intersection';
  readonly completionBehavior = 'stay-active' as const;

  /**
   * Define argument specification
   * Single set with two line-or-circle arguments
   */
  protected getArgumentSets(): ToolArgumentSet[] {
    return [
      {
        arguments: [
          { 
            name: 'element1', 
            mask: SelectionMask.union(SelectionMask.anyLine(), SelectionMask.circle())
          },
          { 
            name: 'element2', 
            mask: SelectionMask.union(SelectionMask.anyLine(), SelectionMask.circle()),
            // Argument-level validator: Ensure different from element1
            validator: (element: Element2D, context: CollectionContext) => {
              const element1 = context.collected.get('element1');
              if (element1 && element.id === element1.element!.id) {
                return {
                  valid: false,
                  error: 'Cannot create intersection: must select two different elements'
                };
              }
              return { valid: true };
            }
          }
        ]
      }
    ];
  }


  protected buildConstructionIntent(
    args: Map<string, ArgumentValue>,
    context: ToolContext
  ): ToolConstructionIntent {
    const selectionPoint = args.get('element2')?.planeCoords ?? context.planeCoords;
    return {
      type: 'intersection',
      description: this.getCommandDescription(),
      planeId: context.planeId,
      args,
      metadata: { selectionPoint }
    };
  }

  protected getCommandDescription(): string {
    return "Create intersection point";
  }

  /**
   * Compute which line-circle intersection point is closest to mouse position
   * Returns 0 or 1, or null if no intersection
   */


  /**
   * Compute which circle-circle intersection point is closest to mouse position
   * Returns 0 or 1, or null if no intersection
   */

}

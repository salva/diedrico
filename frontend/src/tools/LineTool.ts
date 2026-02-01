/**
 * LineTool - Tool for creating lines through two points (Phase 64 Migration)
 * 
 * Migrated to ArgumentCollectorTool framework.
 * Declarative argument specification replaces manual state machine.
 * 
 * Arguments:
 * - point1: Point2D (first point on line)
 * - point2: Point2D (second point on line)
 * 
 * Code reduction: ~150 lines → ~70 lines (53% reduction)
 * 
 * Reference: specs/001-dihedral-learning-mvp/spec.md §US2
 */

import { ArgumentCollectorTool } from './ArgumentCollectorTool';
import type { ToolContext } from './ITool';
import type { ToolArgumentSet, ArgumentValue, CollectionContext } from '@/types/ToolArgumentCollector';
import type { Element2D } from '@/domain/world/Element2D';
import type { Point2D } from '@/domain/world/Point';
import { SelectionMask } from '@/types/SelectionMask';
import { Command } from '@/commands/Command';
import { LineSequenceFactory } from '@/commands/factories/LineSequenceFactory';
import { createActionGroup } from '@/domain/processTree/ActionGroup';
import { AddProcessTreeActionGroupOp } from '@/commands/operations/processTree/AddProcessTreeActionGroupOp';

/**
 * LineTool using ArgumentCollectorTool framework
 * 
 * Framework handles:
 * - Argument collection (any-order, though semantically both are 'point')
 * - Selection mask computation (point only)
 * - UI feedback ("Creating line: pick point1, point2")
 * - Automatic execution when both points collected
 */
export class LineTool extends ArgumentCollectorTool {
  readonly name = 'line';
  readonly completionBehavior = 'stay-active' as const; // Primitives stay active for repeated use

  /**
   * Define argument specification
   * Single set with two point arguments
   */
  protected getArgumentSets(): ToolArgumentSet[] {
    return [
      {
        arguments: [
          { 
            name: 'point1', 
            mask: SelectionMask.point() 
          },
          { 
            name: 'point2', 
            mask: SelectionMask.point(),
            // Argument-level validator: Ensure different from point1
            validator: (element: Element2D, context: CollectionContext) => {
              const point1 = context.collected.get('point1');
              if (point1 && element.id === point1.element!.id) {
                return {
                  valid: false,
                  error: 'Cannot create line: must select two different points'
                };
              }
              return { valid: true };
            }
          }
        ]
      }
    ];
  }

  /**
   * Execute line creation operations
   */
  protected executeOperations(
    cmd: Command,
    args: Map<string, ArgumentValue>,
    context: ToolContext
  ): void {
    const point1 = args.get('point1')!.element as Point2D;
    const point2 = args.get('point2')!.element as Point2D;
    const { planeId } = context;

    // Create user action group for this tool operation
    const groupId = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const group = createActionGroup(groupId);
    cmd.addAndExecute(new AddProcessTreeActionGroupOp(group));

    // Factory handles operation AND ProcessTree action
    LineSequenceFactory.createLineByTwoPoints(cmd, planeId, point1.id, point2.id, groupId);
  }
}

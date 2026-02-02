/**
 * SegmentTool - Tool for creating finite line segments between two points (Phase 64 Migration)
 * 
 * Migrated to ArgumentCollectorTool framework.
 * Declarative argument specification replaces manual state machine.
 * 
 * Arguments:
 * - point1: Point2D (first endpoint of segment)
 * - point2: Point2D (second endpoint of segment)
 * 
 * Unlike LineTool which creates infinite lines, SegmentTool creates finite segments
 * that only exist between their two endpoints.
 * 
 * Code reduction: ~155 lines → ~75 lines (52% reduction)
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
import { AddSegment2DByPointsOp } from '@/commands/operations/world/AddSegmentOp';
import { createSegmentAction } from '@/domain/processTree/actions/CreateSegmentAction';
import { AddProcessTreeActionOp } from '@/commands/operations/processTree/AddProcessTreeActionOp';
import { AddProcessTreeActionGroupOp } from '@/commands/operations/processTree/AddProcessTreeActionGroupOp';
import { createActionGroup } from '@/domain/processTree/ActionGroup';

/**
 * SegmentTool using ArgumentCollectorTool framework
 * 
 * Framework handles:
 * - Argument collection (any-order, though semantically both are 'point')
 * - Selection mask computation (point only)
 * - UI feedback ("Creating segment: pick point1, point2")
 * - Automatic execution when both points collected
 */
export class SegmentTool extends ArgumentCollectorTool {
  readonly name = 'segment';
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
                  error: 'Cannot create segment: must select two different points'
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
   * Execute segment creation operations
   */
  protected executeOperations(
    cmd: Command,
    args: Map<string, ArgumentValue>,
    context: ToolContext
  ): void {
    const point1 = args.get('point1')!.element as Point2D;
    const point2 = args.get('point2')!.element as Point2D;
    const { planeId } = context;

    // Create segment operation
    const result = cmd.addAndExecute(new AddSegment2DByPointsOp(planeId, point1.id, point2.id));
    const segmentId = result.outputs.segmentId;
    
    // Record ProcessTree action
    const action = createSegmentAction(segmentId);

    const groupId = `group_${Date.now()}_segment`;
    const group = createActionGroup(groupId);
    cmd.addAndExecute(new AddProcessTreeActionGroupOp(group));
    cmd.addAndExecute(new AddProcessTreeActionOp(action, group.id));
  }
}

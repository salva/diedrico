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
import type { ToolContext, ToolResult } from './ITool';
import type { ToolArgumentSet, ArgumentValue, CollectionContext } from '@/types/ToolArgumentCollector';
import type { Element2D } from '@/domain/world/Element2D';
import type { Point2D } from '@/domain/world/Point';
import { SelectionMask } from '@/types/SelectionMask';
import { Command } from '@/commands/Command';
import { AddLine2DByTwoPointsOp } from '@/commands/operations/world/AddLineOp';
import { createLineAction } from '@/domain/processTree/actions/CreateLineAction';
import { AddProcessTreeActionOp } from '@/commands/operations/processTree/AddProcessTreeActionOp';

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
   * Execute line creation when both points collected
   */
  protected execute(
    _setIndex: number,
    args: Map<string, ArgumentValue>,
    context: ToolContext
  ): ToolResult {
    const point1 = args.get('point1')!.element as Point2D;
    const point2 = args.get('point2')!.element as Point2D;
    const { planeId, commandStack, world } = context;

    try {
      // Build Command directly
      const cmd = new Command("Create line", world);
      
      // Create line operation
      const result = cmd.addAndExecute(new AddLine2DByTwoPointsOp(planeId, point1.id, point2.id));
      const lineId = result.outputs.lineId;
      
      // Record ProcessTree action
      const action = createLineAction(lineId, planeId, point1.id, point2.id);
      cmd.addAndExecute(new AddProcessTreeActionOp(action));
      
      // Commit and push
      cmd.commit();
      commandStack.push(cmd);
      
      // Handle tool completion (stays active for repeated use)
      this.handleCompletion(context.toolStore);
      
      return this.success(`Created line ${lineId} between ${point1.id} and ${point2.id}`);
      
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return this.failure(`Failed to create line: ${message}`);
    }
  }
}

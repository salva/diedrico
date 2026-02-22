/**
 * PerpendicularLineTool - Tool for creating lines perpendicular to a reference line through a point (Phase 64)
 * 
 * Migrated to ArgumentCollectorTool framework.
 * Framework automatically handles flexible workflow (point→line OR line→point).
 * 
 * Arguments:
 * - referenceLineId: Any Line2D subtype (lines, segments, guides, half-hinge-lines)
 * - throughPointId: Point2D through which perpendicular line passes
 * 
 * Code reduction: 186 lines → ~106 lines (43% reduction)
 * 
 * Reference: specs/001-dihedral-learning-mvp/spec.md §FR-044 (Perpendicular Line Tool)
 */

import { ArgumentCollectorTool } from './ArgumentCollectorTool';
import type { ToolContext } from './ITool';
import type { ToolArgumentSet, CollectionContext } from '@/types/ToolArgumentCollector';
import type { Point2D } from '@/domain/world/Point';
import type { Line2D } from '@/domain/world/Line';
import type { Element2D } from '@/domain/world/Element2D';
import { SelectionMask } from '@/types/SelectionMask';
import { Command } from '@/commands/Command';
import { LineSequenceFactory } from '@/commands/factories/LineSequenceFactory';
import { createActionGroup } from '@/domain/processTree/ActionGroup';
import { AddProcessTreeActionGroupOp } from '@/commands/operations/processTree/AddProcessTreeActionGroupOp';

/**
 * PerpendicularLineTool using ArgumentCollectorTool framework
 * 
 * Framework handles:
 * - Any-order collection (point→line OR line→point automatically)
 * - Selection mask computation (union of point and anyLine)
 * - UI feedback showing what's been selected and what's next
 * - Automatic execution when both arguments collected
 */
export class PerpendicularLineTool extends ArgumentCollectorTool {
  readonly name = 'perpendicular-line';
  readonly completionBehavior = 'stay-active' as const; // Phase 69: All tools stay active

  /**
   * Define argument specification
   * Single set with point and any-line arguments
   */
  protected getArgumentSets(): ToolArgumentSet[] {
    return [
      {
        arguments: [
          { 
            name: 'referenceLine', 
            mask: SelectionMask.anyLine() // Accepts lines, segments, guides, half-hinge-lines
          },
          { 
            name: 'throughPoint', 
            mask: SelectionMask.point() 
          }
        ],
        // Phase 113: Validate reference line produces a feasible realization
        setValidator: (args, context: CollectionContext) => {
          const refLine = args.get('referenceLine')?.element as Line2D | undefined;
          if (refLine) {
            const realization = refLine.realize2D(context.world);
            if (realization && !realization.feasible) {
              return { valid: false, error: 'Cannot create perpendicular line: reference line is infeasible' };
            }
          }
          return { valid: true };
        }
      }
    ];
  }

  /**
   * Execute perpendicular line creation operations
   */
  protected executeOperations(
    cmd: Command,
    args: Map<string, import('@/types/ToolArgumentCollector').ArgumentValue>,
    context: ToolContext
  ): void {
    const { planeId } = context;
    
    const referenceLine = args.get('referenceLine')!.element as Line2D;
    const throughPoint = args.get('throughPoint')!.element as Point2D;
    
    // Create user action group for this tool operation
    const groupId = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const group = createActionGroup(groupId);
    cmd.addAndExecute(new AddProcessTreeActionGroupOp(group));

    // Factory handles operation AND ProcessTree action
    LineSequenceFactory.createPerpendicularLine(
      cmd,
      planeId,
      referenceLine.id,
      throughPoint.id,
      groupId
    );
  }

  protected getCommandDescription(): string {
    return "Create perpendicular line";
  }
}

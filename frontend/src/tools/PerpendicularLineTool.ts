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
import type { ToolContext, ToolResult } from './ITool';
import type { ToolArgumentSet } from '@/types/ToolArgumentCollector';
import type { Element2D } from '@/domain/world/Element2D';
import type { Point2D } from '@/domain/world/Point';
import type { Line2D } from '@/domain/world/Line';
import { SelectionMask } from '@/types/SelectionMask';
import { Command } from '@/commands/Command';
import { AddLine2DPerpendicularToLineOp } from '@/commands/operations/world/AddLineOp';
import { createPerpendicularLineAction } from '@/domain/processTree/actions/CreatePerpendicularLineAction';
import { AddProcessTreeActionOp } from '@/commands/operations/processTree/AddProcessTreeActionOp';

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
        ]
      }
    ];
  }

  /**
   * Execute perpendicular line creation when both arguments collected
   */
  protected execute(
    _setIndex: number, // Unused: only one argument set
    args: Map<string, import('@/types/ToolArgumentCollector').ArgumentValue>,
    context: ToolContext
  ): ToolResult {
    const { planeId, commandStack, world } = context;
    
    const referenceLine = args.get('referenceLine')!.element as Line2D;
    const throughPoint = args.get('throughPoint')!.element as Point2D;
    
    try {
      const cmd = new Command("Create perpendicular line", world);
      
      // Create perpendicular line using collected arguments
      const result = cmd.addAndExecute(
        new AddLine2DPerpendicularToLineOp(planeId, referenceLine.id, throughPoint.id)
      );
      
      const lineId = result.outputs.lineId;
      
      // Record ProcessTree action for dependency tracking
      const action = createPerpendicularLineAction(
        lineId,
        planeId,
        referenceLine.id,
        throughPoint.id
      );
      cmd.addAndExecute(new AddProcessTreeActionOp(action));
      
      // Commit and push
      cmd.commit();
      commandStack.push(cmd);
      
      // Handle tool completion (returns to selection mode)
      this.handleCompletion(context.toolStore);
      
      return this.success(
        `Created perpendicular line ${lineId} perpendicular to ${referenceLine.id} through ${throughPoint.id}`
      );
      
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return this.failure(`Failed to create perpendicular line: ${message}`);
    }
  }
}

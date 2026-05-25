/**
 * ParallelLineTool - Tool for creating lines parallel to a reference line through a point (Phase 64)
 * 
 * Migrated to ArgumentCollectorTool framework.
 * Framework automatically handles flexible workflow (point→line OR line→point).
 * 
 * Arguments:
 * - referenceLineId: Any Line2D subtype (lines, segments, guides, half-hinge-lines)
 * - throughPointId: Point2D through which parallel line passes
 * 
 * Code reduction: 186 lines → ~60 lines (68% reduction)
 * 
 * Reference: specs/001-dihedral-learning-mvp/spec.md §FR-043 (Parallel Line Tool)
 */

import { ArgumentCollectorTool } from './ArgumentCollectorTool';
import type { ToolArgumentSet, CollectionContext } from '@/types/ToolArgumentCollector';
import { SelectionMask } from '@/types/SelectionMask';
import { Line2D } from '@/domain/world/Line';

/**
 * ParallelLineTool using ArgumentCollectorTool framework
 * 
 * Framework handles:
 * - Any-order collection (point→line OR line→point automatically)
 * - Selection mask computation (union of point and anyLine)
 * - UI feedback showing what's been selected and what's next
 * - Automatic execution when both arguments collected
 */
export class ParallelLineTool extends ArgumentCollectorTool {
  readonly name = 'parallel-line';
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
              return { valid: false, error: 'Cannot create parallel line: reference line is infeasible' };
            }
          }
          return { valid: true };
        }
      }
    ];
  }

  /**
   * Execute parallel line creation operations
   */


  protected getCommandDescription(): string {
    return "Create parallel line";
  }
}


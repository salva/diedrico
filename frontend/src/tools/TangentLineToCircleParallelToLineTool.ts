/**
 * TangentLineToCircleParallelToLineTool - Tangent to circle parallel to line (ArgumentCollectorTool Migration)
 * 
 * Migrated to ArgumentCollectorTool framework.
 * 
 * Two-argument workflow with automatic angle-based indexing:
 * 1. Collect circle and reference line (any order)
 * 2. Determine tangent index based on mouse position
 * 3. Create tangent line parallel to reference
 * 
 * Code reduction: ~282 lines → ~190 lines (33% reduction)
 * 
 * Reference: specs/001-dihedral-learning-mvp/spec.md §FR-046, §FR-047
 */

import { ArgumentCollectorTool } from './ArgumentCollectorTool';
import type { ToolArgumentSet, CollectionContext } from '@/types/ToolArgumentCollector';
import { SelectionMask } from '@/types/SelectionMask';
import { Line2D } from '@/domain/world/Line';

/**
 * TangentLineToCircleParallelToLineTool using ArgumentCollectorTool framework
 * 
 * Framework handles:
 * - Any-order argument collection (circle + line)
 * - Selection mask computation (circle + anyLine)
 * - UI feedback
 * - Automatic execution when both elements collected
 * 
 * Custom behavior:
 * - Determines tangent index based on mouse position (which of 2 tangents is closer)
 * - Accepts any Line2D subtype as reference (line, segment, guide, half-hinge-line)
 */
export class TangentLineToCircleParallelToLineTool extends ArgumentCollectorTool {
  readonly name = 'tangent-line-to-circle-parallel';
  readonly completionBehavior = 'stay-active' as const;

  /**
   * Define argument specification
   * Single set with circle and any line type
   */
  protected getArgumentSets(): ToolArgumentSet[] {
    return [
      {
        arguments: [
          { 
            name: 'circle', 
            mask: SelectionMask.circle()
          },
          { 
            name: 'referenceLine', 
            mask: SelectionMask.anyLine()  // Accepts all Line2D subtypes
          }
        ],
        // Phase 113: Validate reference line is feasible
        setValidator: (args, context: CollectionContext) => {
          const refLine = args.get('referenceLine')?.element as Line2D | undefined;
          if (refLine) {
            const realization = refLine.realize2D(context.world);
            if (realization && !realization.feasible) {
              return { valid: false, error: 'Cannot create tangent: reference line is infeasible' };
            }
          }
          return { valid: true };
        }
      }
    ];
  }

  /**
   * Execute tangent line creation operations
   * Uses mouse position from second click to determine which tangent to create
   */


  protected getCommandDescription(): string {
    return "Create tangent line to circle parallel to line";
  }

  /**
   * Determine which tangent line to create based on mouse position
   * Returns 0 or 1 for the tangent point closest to mouse
   */

}

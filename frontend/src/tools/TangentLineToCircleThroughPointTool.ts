/**
 * TangentLineToCircleThroughPointTool - Tangent lines to circle through point (ArgumentCollectorTool Migration)
 * 
 * Migrated to ArgumentCollectorTool framework.
 * 
 * Two-argument workflow with automatic angle-based indexing:
 * 1. Collect circle and external point (any order)
 * 2. Determine tangent index based on mouse position angle
 * 3. Create tangent line
 * 
 * Code reduction: ~276 lines → ~190 lines (31% reduction)
 * 
 * Reference: specs/001-dihedral-learning-mvp/spec.md §FR-045
 */

import { ArgumentCollectorTool } from './ArgumentCollectorTool';
import type { ToolArgumentSet, CollectionContext } from '@/types/ToolArgumentCollector';
import { SelectionMask } from '@/types/SelectionMask';

/**
 * TangentLineToCircleThroughPointTool using ArgumentCollectorTool framework
 * 
 * Framework handles:
 * - Any-order argument collection (circle + point)
 * - Selection mask computation
 * - UI feedback
 * - Automatic execution when both elements collected
 * 
 * Custom behavior:
 * - Determines tangent index based on mouse position (which of 2 tangents is closer)
 */
export class TangentLineToCircleThroughPointTool extends ArgumentCollectorTool {
  readonly name = 'tangent-line-to-circle-through-point';
  readonly completionBehavior = 'stay-active' as const;

  /**
   * Define argument specification
   * Single set with circle and point
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
            name: 'throughPoint', 
            mask: SelectionMask.point()
          }
        ],
        // Phase 113: Validate point is outside or on the circle
        setValidator: (args, context: CollectionContext) => {
          const circleEl = args.get('circle')?.element;
          const pointEl = args.get('throughPoint')?.element;
          if (circleEl && pointEl) {
            const circleRealization = context.world.getCircle2D(circleEl.id)?.realize2D(context.world);
            const pointRealization = context.world.getPoint2D(pointEl.id)?.realize2D(context.world);
            if (circleRealization && circleRealization.feasible && pointRealization && pointRealization.feasible) {
              const dist = pointRealization.position.distanceTo(circleRealization.center);
              const radius = circleRealization.getRadius();
              if (dist < radius - 1e-3) {
                return { valid: false, error: 'Cannot create tangent: point is inside the circle' };
              }
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
    return "Create tangent line to circle through point";
  }

}

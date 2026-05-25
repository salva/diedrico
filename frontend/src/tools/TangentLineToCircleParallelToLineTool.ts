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
import type { ToolArgumentSet, CollectionContext, ArgumentValue } from '@/types/ToolArgumentCollector';
import type { ToolContext } from './ITool';
import type { ToolConstructionIntent } from '@/application/tools/ToolCommandIntents';
import { SelectionMask } from '@/types/SelectionMask';
import { Line2D } from '@/domain/world/Line';
import { Vector3 } from 'three';

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


  protected buildConstructionIntent(
    args: Map<string, ArgumentValue>,
    context: ToolContext
  ): ToolConstructionIntent {
    const circle = args.get('circle')?.element;
    const selectionPoint = args.get('referenceLine')?.planeCoords ?? context.planeCoords;
    return {
      type: 'tangent-line-to-circle-parallel',
      description: this.getCommandDescription(),
      planeId: context.planeId,
      args,
      metadata: {
        tangentIndex: this.chooseTangentIndex(selectionPoint, circle?.id, args, context),
        selectionPoint
      }
    };
  }

  private chooseTangentIndex(selectionPoint: Vector3, circleId: string | undefined, args: Map<string, ArgumentValue>, context: ToolContext): 0 | 1 {
    const referenceLineId = args.get('referenceLine')?.element?.id;
    if (!circleId || !referenceLineId) return 0;
    const circle = context.world.getCircle2D(circleId);
    const referenceLine = context.world.getLine2D(referenceLineId);
    const circleRealization = circle?.realize2D(context.world);
    const lineRealization = referenceLine?.realize2D(context.world);
    if (!circleRealization?.feasible || !lineRealization?.feasible) return 0;

    const center = circleRealization.center;
    const radius = circleRealization.getRadius();
    const refDirection = lineRealization.getDirection().clone().normalize();
    const perpDirection = new Vector3(-refDirection.y, refDirection.x, 0);
    const refPoint = lineRealization.point1;
    const a = -refDirection.y;
    const b = refDirection.x;
    const c = refDirection.y * refPoint.x - refDirection.x * refPoint.y;
    const signedDistance = a * center.x + b * center.y + c;

    const candidate0 = signedDistance > 0
      ? center.clone().sub(perpDirection.clone().multiplyScalar(radius))
      : center.clone().add(perpDirection.clone().multiplyScalar(radius));
    const candidate1 = signedDistance > 0
      ? center.clone().add(perpDirection.clone().multiplyScalar(radius))
      : center.clone().sub(perpDirection.clone().multiplyScalar(radius));
    candidate0.z = 1;
    candidate1.z = 1;

    return candidate0.distanceTo(selectionPoint) <= candidate1.distanceTo(selectionPoint) ? 0 : 1;
  }


  protected getCommandDescription(): string {
    return "Create tangent line to circle parallel to line";
  }

  /**
   * Determine which tangent line to create based on mouse position
   * Returns 0 or 1 for the tangent point closest to mouse
   */

}

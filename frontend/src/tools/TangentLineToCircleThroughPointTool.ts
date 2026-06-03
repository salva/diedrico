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
 */

import { ArgumentCollectorTool } from './ArgumentCollectorTool';
import type { ToolArgumentSet, CollectionContext, ArgumentValue } from '@/types/ToolArgumentCollector';
import type { ToolContext } from './ITool';
import type { ToolConstructionIntent } from './ToolCommandIntents';
import { SelectionMask } from '@/types/SelectionMask';
import { Vector3 } from 'three';

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
            const circle = context.readPort.getCircle2D(circleEl.id);
            const point = context.readPort.getPoint2D(pointEl.id);
            const circleRealization = circle ? context.readPort.realizeCircle2D(circle) : undefined;
            const pointRealization = point ? context.readPort.realizePoint2D(point) : undefined;
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


  protected buildConstructionIntent(
    args: Map<string, ArgumentValue>,
    context: ToolContext
  ): ToolConstructionIntent {
    const selectionPoint = args.get('throughPoint')?.planeCoords ?? context.planeCoords;
    return {
      type: 'tangent-line-to-circle-through-point',
      description: this.getCommandDescription(),
      planeId: context.planeId,
      args,
      metadata: {
        tangentIndex: this.chooseTangentIndex(args, selectionPoint, context),
        selectionPoint
      }
    };
  }

  private chooseTangentIndex(args: Map<string, ArgumentValue>, selectionPoint: Vector3, context: ToolContext): 0 | 1 {
    const circleId = args.get('circle')?.element?.id;
    const pointId = args.get('throughPoint')?.element?.id;
    if (!circleId || !pointId) return 0;

    const circle = context.readPort.getCircle2D(circleId);
    const throughPoint = context.readPort.getPoint2D(pointId);
    const circleRealization = circle ? context.readPort.realizeCircle2D(circle) : undefined;
    const pointRealization = throughPoint ? context.readPort.realizePoint2D(throughPoint) : undefined;
    if (!circleRealization?.feasible || !pointRealization?.feasible) return 0;

    const center = circleRealization.center;
    const externalPoint = pointRealization.position;
    const radius = circleRealization.getRadius();
    const dx = externalPoint.x - center.x;
    const dy = externalPoint.y - center.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance <= radius) return 0;

    const angleCP = Math.atan2(dy, dx);
    const angleBeta = Math.acos(radius / distance);
    const candidate0 = tangentPoint(center, radius, angleCP + angleBeta);
    const candidate1 = tangentPoint(center, radius, angleCP - angleBeta);
    return candidate0.distanceTo(selectionPoint) <= candidate1.distanceTo(selectionPoint) ? 0 : 1;
  }

  protected getCommandDescription(): string {
    return "Create tangent line to circle through point";
  }

}

function tangentPoint(center: Vector3, radius: number, angle: number): Vector3 {
  return new Vector3(center.x + radius * Math.cos(angle), center.y + radius * Math.sin(angle), 1);
}

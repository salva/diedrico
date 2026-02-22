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

import { Vector3 } from 'three';
import { ArgumentCollectorTool } from './ArgumentCollectorTool';
import type { ToolContext } from './ITool';
import type { ToolArgumentSet, ArgumentValue, CollectionContext } from '@/types/ToolArgumentCollector';
import { SelectionMask } from '@/types/SelectionMask';
import { Command } from '@/commands/Command';
import { AddLine2DTangentToCircleParallelToLineOp } from '@/commands/operations/world/AddLineOp';
import { createTangentLineToCircleParallelToLineAction } from '@/domain/processTree/actions/CreateTangentLineAction';
import { AddProcessTreeActionOp } from '@/commands/operations/processTree/AddProcessTreeActionOp';
import { AddProcessTreeActionGroupOp } from '@/commands/operations/processTree/AddProcessTreeActionGroupOp';
import { createActionGroup } from '@/domain/processTree/ActionGroup';
import type { Line2D } from '@/domain/world/Line';

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
  protected executeOperations(
    cmd: Command,
    args: Map<string, ArgumentValue>,
    context: ToolContext
  ): void {
    const circle = args.get('circle')!.element!;
    const referenceLine = args.get('referenceLine')!.element!;
    
    // Use mouse position from the second (last) collected argument
    const mousePos = args.get('referenceLine')!.planeCoords;
    
    const circleId = circle.id;
    const referenceLineId = referenceLine.id;
    const { planeId, world } = context;

    // Determine tangent index based on mouse position
    const tangentIndex = this.determineTangentIndex(
      planeId,
      circleId,
      referenceLineId,
      mousePos,
      world
    );
    
    // Create tangent line
    const result = cmd.addAndExecute(
      new AddLine2DTangentToCircleParallelToLineOp(planeId, circleId, referenceLineId, tangentIndex)
    );
    
    const lineId = result.outputs.lineId;
    
    // Record ProcessTree action
    const action = createTangentLineToCircleParallelToLineAction(lineId);
    
    const groupId = `group_${Date.now()}_tangent_par`;
    const group = createActionGroup(groupId);
    cmd.addAndExecute(new AddProcessTreeActionGroupOp(group));
    cmd.addAndExecute(new AddProcessTreeActionOp(action, group.id));
  }

  protected getCommandDescription(): string {
    return "Create tangent line to circle parallel to line";
  }

  /**
   * Determine which tangent line to create based on mouse position
   * Returns 0 or 1 for the tangent point closest to mouse
   */
  private determineTangentIndex(
    planeId: string,
    circleId: string,
    referenceLineId: string,
    mousePos: Vector3,
    world: import('@/domain/world/World').World
  ): 0 | 1 {
    const plane = world.getProjectionPlaneById(planeId);
    if (!plane) throw new Error(`Plane not found: ${planeId}`);

    // Get circle realization
    const circle = plane.getCircle(circleId);
    if (!circle) throw new Error(`Circle not found: ${circleId}`);
    const circleReal = circle.realize2D(world);
    if (!circleReal || !circleReal.feasible) throw new Error(`Circle infeasible: ${circleId}`);

    // Get reference line realization (may be on any plane)
    const refLineElement = world.getLine2D(referenceLineId);
    if (!refLineElement) throw new Error(`Reference line not found: ${referenceLineId}`);
    const refLine = refLineElement.realize2D(world);
    if (!refLine || !refLine.feasible) throw new Error(`Reference line infeasible: ${referenceLineId}`);

    const center = circleReal.center;
    const radius = circleReal.getRadius();

    // Reference line direction (normalized)
    const refDirection = refLine.point2.clone().normalize();

    // Perpendicular direction (90° CCW rotation)
    const perpDirection = new Vector3(-refDirection.y, refDirection.x, 0);

    // Compute signed distance from center to reference line
    const refPoint = refLine.point1;
    const a = -refDirection.y;
    const b = refDirection.x;
    const c = refDirection.y * refPoint.x - refDirection.x * refPoint.y;
    const signedDistance = a * center.x + b * center.y + c;

    // Compute two tangent points
    let closerTangent: Vector3;  // Closer to reference line (index 0)
    let fartherTangent: Vector3; // Farther from reference line (index 1)
    
    if (signedDistance > 0) {
      // Center on +perpDirection side
      closerTangent = new Vector3(
        center.x - radius * perpDirection.x,
        center.y - radius * perpDirection.y,
        1
      );
      fartherTangent = new Vector3(
        center.x + radius * perpDirection.x,
        center.y + radius * perpDirection.y,
        1
      );
    } else {
      // Center on -perpDirection side
      closerTangent = new Vector3(
        center.x + radius * perpDirection.x,
        center.y + radius * perpDirection.y,
        1
      );
      fartherTangent = new Vector3(
        center.x - radius * perpDirection.x,
        center.y - radius * perpDirection.y,
        1
      );
    }

    // Calculate distances from mouse to each tangent point
    const distToCloser = Math.hypot(
      mousePos.x - closerTangent.x,
      mousePos.y - closerTangent.y
    );
    const distToFarther = Math.hypot(
      mousePos.x - fartherTangent.x,
      mousePos.y - fartherTangent.y
    );

    // Return index of tangent closer to mouse
    return distToCloser <= distToFarther ? 0 : 1;
  }
}

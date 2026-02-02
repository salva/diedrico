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

import { Vector3 } from 'three';
import { ArgumentCollectorTool } from './ArgumentCollectorTool';
import type { ToolContext } from './ITool';
import type { ToolArgumentSet, ArgumentValue } from '@/types/ToolArgumentCollector';
import { SelectionMask } from '@/types/SelectionMask';
import { Command } from '@/commands/Command';
import { AddLine2DTangentToCircleThroughPointOp } from '@/commands/operations/world/AddLineOp';
import { createTangentLineToCircleThroughPointAction } from '@/domain/processTree/actions/CreateTangentLineAction';
import { AddProcessTreeActionOp } from '@/commands/operations/processTree/AddProcessTreeActionOp';
import { AddProcessTreeActionGroupOp } from '@/commands/operations/processTree/AddProcessTreeActionGroupOp';
import { createActionGroup } from '@/domain/processTree/ActionGroup';

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
        ]
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
    const throughPoint = args.get('throughPoint')!.element!;
    
    // Use mouse position from the second (last) collected argument
    // This determines which of the two tangent lines to create
    const mousePos = args.get('throughPoint')!.planeCoords;
    
    const circleId = circle.id;
    const throughPointId = throughPoint.id;
    const { planeId, world } = context;

    // Determine tangent index based on mouse position
    const tangentIndex = this.determineTangentIndex(
      planeId,
      circleId,
      throughPointId,
      mousePos,
      world
    );
    
    // Create tangent line
    const result = cmd.addAndExecute(
      new AddLine2DTangentToCircleThroughPointOp(planeId, circleId, throughPointId, tangentIndex)
    );
    
    const lineId = result.outputs.lineId;
    
    // Record ProcessTree action
    const action = createTangentLineToCircleThroughPointAction(lineId);
    
    const groupId = `group_${Date.now()}_tangent_pt`;
    const group = createActionGroup(groupId);
    cmd.addAndExecute(new AddProcessTreeActionGroupOp(group));
    cmd.addAndExecute(new AddProcessTreeActionOp(action, group.id));
  }

  protected getCommandDescription(): string {
    return "Create tangent line to circle through point";
  }

  /**
   * Determine which tangent line to create based on mouse position
   * Returns 0 or 1 for the tangent point closest to mouse
   */
  private determineTangentIndex(
    planeId: string,
    circleId: string,
    throughPointId: string,
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

    // Get external point realization
    const point = plane.getPoint(throughPointId);
    if (!point) throw new Error(`Point not found: ${throughPointId}`);
    const pointReal = point.realize2D(world);
    if (!pointReal || !pointReal.feasible) throw new Error(`Point infeasible: ${throughPointId}`);

    const center = circleReal.center;
    const radius = circleReal.getRadius();
    const externalPoint = pointReal.position;

    // Vector from center to external point
    const dx = externalPoint.x - center.x;
    const dy = externalPoint.y - center.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Angle from center to external point
    const angleCP = Math.atan2(dy, dx);

    // Angle from CP to tangent line (using right triangle)
    const angleBeta = Math.acos(radius / distance);

    // Two tangent angles
    const tangentAngle0 = angleCP + angleBeta;  // CCW from CP
    const tangentAngle1 = angleCP - angleBeta;  // CW from CP

    // Tangent points
    const tangentPoint0 = new Vector3(
      center.x + radius * Math.cos(tangentAngle0),
      center.y + radius * Math.sin(tangentAngle0),
      1
    );
    const tangentPoint1 = new Vector3(
      center.x + radius * Math.cos(tangentAngle1),
      center.y + radius * Math.sin(tangentAngle1),
      1
    );

    // Angles from center to tangent points
    const angle0 = Math.atan2(tangentPoint0.y - center.y, tangentPoint0.x - center.x);
    const angle1 = Math.atan2(tangentPoint1.y - center.y, tangentPoint1.x - center.x);

    // Mouse angle from center
    const mouseAngle = Math.atan2(mousePos.y - center.y, mousePos.x - center.x);

    // Compute angular distances
    const dist0 = this.angularDistance(angle0, mouseAngle);
    const dist1 = this.angularDistance(angle1, mouseAngle);

    // Return index of closest tangent point to mouse
    return dist0 <= dist1 ? 0 : 1;
  }

  /**
   * Compute angular distance between two angles (always positive, in [0, π])
   */
  private angularDistance(angle1: number, angle2: number): number {
    let diff = Math.abs(angle1 - angle2);
    if (diff > Math.PI) {
      diff = 2 * Math.PI - diff;
    }
    return diff;
  }
}

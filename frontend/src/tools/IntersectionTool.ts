/**
 * IntersectionTool - Tool for creating intersection points (ArgumentCollectorTool Migration)
 * 
 * Migrated to ArgumentCollectorTool framework.
 * 
 * Supports intersections between:
 * - Line-Line
 * - Line-Circle (and Circle-Line)
 * - Circle-Circle
 * 
 * When multiple intersection points exist (line-circle or circle-circle),
 * the tool picks the intersection point nearest to the mouse cursor using
 * the planeCoords from ArgumentValue.
 * 
 * Code reduction: ~407 lines → ~250 lines (38% reduction)
 * 
 * Reference: specs/001-dihedral-learning-mvp/spec.md
 */

import { ArgumentCollectorTool } from './ArgumentCollectorTool';
import type { ToolContext } from './ITool';
import type { ToolArgumentSet, ArgumentValue, CollectionContext } from '@/types/ToolArgumentCollector';
import type { Element2D } from '@/domain/world/Element2D';
import { SelectionMask } from '@/types/SelectionMask';
import { Command } from '@/commands/Command';
import { IntersectionSequenceFactory } from '@/commands/factories/IntersectionSequenceFactory';
import { createActionGroup } from '@/domain/processTree/ActionGroup';
import { AddProcessTreeActionGroupOp } from '@/commands/operations/processTree/AddProcessTreeActionGroupOp';
import { 
  areLinesParallel, 
  intersectLineCircle, 
  intersectCircleCircle 
} from '@/domain/calculations/Intersections';
import type { World } from '@/domain/world/World';
import { Line2D } from '@/domain/world/Line';
import { Circle2D } from '@/domain/world/Circle';

/**
 * IntersectionTool using ArgumentCollectorTool framework
 * 
 * Framework handles:
 * - Argument collection (element1, element2)
 * - Selection mask computation (lines and circles)
 * - UI feedback ("Creating intersection: pick element1, element2")
 * - Automatic execution when both elements collected
 */
export class IntersectionTool extends ArgumentCollectorTool {
  readonly name = 'intersection';
  readonly completionBehavior = 'stay-active' as const;

  /**
   * Define argument specification
   * Single set with two line-or-circle arguments
   */
  protected getArgumentSets(): ToolArgumentSet[] {
    return [
      {
        arguments: [
          { 
            name: 'element1', 
            mask: SelectionMask.union(SelectionMask.anyLine(), SelectionMask.circle())
          },
          { 
            name: 'element2', 
            mask: SelectionMask.union(SelectionMask.anyLine(), SelectionMask.circle()),
            // Argument-level validator: Ensure different from element1
            validator: (element: Element2D, context: CollectionContext) => {
              const element1 = context.collected.get('element1');
              if (element1 && element.id === element1.element!.id) {
                return {
                  valid: false,
                  error: 'Cannot create intersection: must select two different elements'
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
   * Execute intersection creation operations
   */
  protected executeOperations(
    cmd: Command,
    args: Map<string, ArgumentValue>,
    context: ToolContext
  ): void {
    const elem1Value = args.get('element1')!;
    const elem2Value = args.get('element2')!;
    const element1 = elem1Value.element!;
    const element2 = elem2Value.element!;
    const planeCoords = elem2Value.planeCoords; // Use second click position for index calculation
    const { planeId, world } = context;

    // Create user action group for this tool operation
    const groupId = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const group = createActionGroup(groupId);
    cmd.addAndExecute(new AddProcessTreeActionGroupOp(group));

    // Determine intersection type and create appropriate intersection
    // Factory handles operation AND ProcessTree actions (including siblings)
    if (element1 instanceof Line2D && element2 instanceof Line2D) {
      // Line-Line intersection
      
      // Validate not parallel - need to realize lines first
      const line1Realization = element1.realize2D(world);
      const line2Realization = element2.realize2D(world);
      
      if (!line1Realization || !line2Realization) {
        throw new Error('Could not realize lines.');
      }
      
      if (areLinesParallel(line1Realization, line2Realization)) {
        throw new Error('Lines are parallel and do not intersect.');
      }
      
      // Factory handles operation AND ProcessTree actions
      IntersectionSequenceFactory.createLineLineIntersection(
        cmd, planeId, element1.id, element2.id, world, groupId
      );
      
    } else if (element1 instanceof Line2D && element2 instanceof Circle2D) {
      // Line-Circle intersection (element1 is line, element2 is circle)
      const index = this.computeLineCircleIntersectionIndex(
        element1.id, element2.id, planeCoords, world
      );
      
      if (index === null) {
        throw new Error('Line and circle do not intersect.');
      }
      
      // Factory handles operation AND ProcessTree actions
      IntersectionSequenceFactory.createLineCircleIntersection(
        cmd, planeId, element1.id, element2.id, index, world, groupId
      );
      
    } else if (element1 instanceof Circle2D && element2 instanceof Line2D) {
      // Line-Circle intersection (element1 is circle, element2 is line)
      const index = this.computeLineCircleIntersectionIndex(
        element2.id, element1.id, planeCoords, world
      );
      
      if (index === null) {
        throw new Error('Circle and line do not intersect.');
      }
      
      // Factory handles operation AND ProcessTree actions
      IntersectionSequenceFactory.createLineCircleIntersection(
        cmd, planeId, element2.id, element1.id, index, world, groupId
      );
      
    } else if (element1 instanceof Circle2D && element2 instanceof Circle2D) {
      // Circle-Circle intersection
      const index = this.computeCircleCircleIntersectionIndex(
        element1.id, element2.id, planeCoords, world
      );
      
      if (index === null) {
        throw new Error('Circles do not intersect.');
      }
      
      // Factory handles operation AND ProcessTree actions
      IntersectionSequenceFactory.createCircleCircleIntersection(
        cmd, planeId, element1.id, element2.id, index, world, groupId
      );
      
    } else {
      throw new Error('Unsupported element type combination for intersection.');
    }
  }

  protected getCommandDescription(): string {
    return "Create intersection point";
  }

  /**
   * Compute which line-circle intersection point is closest to mouse position
   * Returns 0 or 1, or null if no intersection
   */
  private computeLineCircleIntersectionIndex(
    lineId: string,
    circleId: string,
    mousePos: THREE.Vector3,
    world: World
  ): number | null {
    const line = world.getLine2D(lineId);
    const circle = world.getCircle2D(circleId);
    
    if (!line || !circle) return null;
    
    const lineRealization = line.realize2D(world);
    const circleRealization = circle.realize2D(world);
    
    if (!lineRealization || !circleRealization) return null;
    
    const intersections = intersectLineCircle(lineRealization, circleRealization);
    
    if (intersections.length === 0) return null;
    if (intersections.length === 1) return 0;
    
    // Two intersections - pick closest to mouse
    const dist0 = intersections[0].distanceTo(mousePos);
    const dist1 = intersections[1].distanceTo(mousePos);
    
    return dist0 <= dist1 ? 0 : 1;
  }

  /**
   * Compute which circle-circle intersection point is closest to mouse position
   * Returns 0 or 1, or null if no intersection
   */
  private computeCircleCircleIntersectionIndex(
    circle1Id: string,
    circle2Id: string,
    mousePos: THREE.Vector3,
    world: World
  ): number | null {
    const circle1 = world.getCircle2D(circle1Id);
    const circle2 = world.getCircle2D(circle2Id);
    
    if (!circle1 || !circle2) return null;
    
    const circle1Realization = circle1.realize2D(world);
    const circle2Realization = circle2.realize2D(world);
    
    if (!circle1Realization || !circle2Realization) return null;
    
    const intersections = intersectCircleCircle(circle1Realization, circle2Realization);
    
    if (intersections.length === 0) return null;
    if (intersections.length === 1) return 0;
    
    // Two intersections - pick closest to mouse
    const dist0 = intersections[0].distanceTo(mousePos);
    const dist1 = intersections[1].distanceTo(mousePos);
    
    return dist0 <= dist1 ? 0 : 1;
  }
}

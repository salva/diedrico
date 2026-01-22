/**
 * CircleTool - Tool for creating circles by center point and circumference point (Phase 64)
 * 
 * Migrated to ArgumentCollectorTool framework.
 * Declarative argument specification replaces manual state machine.
 * 
 * Arguments:
 * - center: Point2D (center of circle)
 * - circumferencePoint: Point2D (defines radius and angle zero reference)
 * 
 * Code reduction: 192 lines → ~60 lines (68% reduction)
 * 
 * Reference: specs/001-dihedral-learning-mvp/spec.md §US2 - Create circles
 */

import { ArgumentCollectorTool } from './ArgumentCollectorTool';
import type { ToolContext } from './ITool';
import type { ToolArgumentSet } from '@/types/ToolArgumentCollector';
import type { Point2D } from '@/domain/world/Point';
import { SelectionMask } from '@/types/SelectionMask';
import { Command } from '@/commands/Command';
import { CircleSequenceFactory } from '@/commands/factories/CircleSequenceFactory';

/**
 * CircleTool using ArgumentCollectorTool framework
 * 
 * Framework handles:
 * - Argument collection (any-order, though semantically both are 'point' so order doesn't matter)
 * - Selection mask computation (point only)
 * - UI feedback ("Creating circle: pick center, circumferencePoint")
 * - Automatic execution when both points collected
 */
export class CircleTool extends ArgumentCollectorTool {
  readonly name = 'circle';
  readonly completionBehavior = 'stay-active' as const; // Primitives stay active for repeated use

  /**
   * Define argument specification
   * Single set with two point arguments
   */
  protected getArgumentSets(): ToolArgumentSet[] {
    return [
      {
        arguments: [
          { 
            name: 'center', 
            mask: SelectionMask.point() 
          },
          { 
            name: 'circumferencePoint', 
            mask: SelectionMask.point() 
          }
        ],
        // Set-level validator: Check minimum radius
        setValidator: (args, context) => {
          const center = args.get('center')!.element as Point2D;
          const circumferencePoint = args.get('circumferencePoint')!.element as Point2D;
          
          const centerRealization = center.realize2D(context.world);
          const circumferenceRealization = circumferencePoint.realize2D(context.world);
          
          if (centerRealization && circumferenceRealization) {
            const radius = centerRealization.position.distanceTo(circumferenceRealization.position);
            if (radius < 1e-3) {
              return { 
                valid: false, 
                error: 'Radius too small. Please select points farther apart.' 
              };
            }
          }
          
          return { valid: true };
        }
      }
    ];
  }

  /**
   * Execute circle creation operations
   */
  protected executeOperations(
    cmd: Command,
    args: Map<string, import('@/types/ToolArgumentCollector').ArgumentValue>,
    context: ToolContext
  ): void {
    const { planeId } = context;
    
    const center = args.get('center')!.element as Point2D;
    const circumferencePoint = args.get('circumferencePoint')!.element as Point2D;
    
    // Factory handles operation AND ProcessTree action
    CircleSequenceFactory.createCircleByCenterAndPoint(
      cmd,
      planeId,
      center.id,
      circumferencePoint.id
    );
  }
}


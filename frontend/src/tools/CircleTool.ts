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
 */

import { ArgumentCollectorTool } from './ArgumentCollectorTool';
import type { ToolArgumentSet } from '@/types/ToolArgumentCollector';
import type { Point2D } from '@/domain/world/Point';
import { SelectionMask } from '@/types/SelectionMask';

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

}


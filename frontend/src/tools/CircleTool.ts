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
import type { ArgumentValue, ToolArgumentSet } from '@/tools/ToolArgumentCollector';
import type { ToolContext } from './ITool';
import type { ToolConstructionIntent } from './ToolCommandIntents';
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
          
          const centerRealization = context.readPort.realizePoint2D(center);
          const circumferenceRealization = context.readPort.realizePoint2D(circumferencePoint);
          
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

  protected buildConstructionIntent(args: Map<string, ArgumentValue>, context: ToolContext): ToolConstructionIntent {
    return {
      type: 'circle',
      planeId: context.planeId,
      centerPointId: this.requireElementId(args, 'center'),
      circumferencePointId: this.requireElementId(args, 'circumferencePoint'),
      description: this.getCommandDescription()
    };
  }

  /**
   * Execute circle creation operations
   */

}

/**
 * LineTool - Tool for creating lines through two points (Phase 64 Migration)
 * 
 * Migrated to ArgumentCollectorTool framework.
 * Declarative argument specification replaces manual state machine.
 * 
 * Arguments:
 * - point1: Point2D (first point on line)
 * - point2: Point2D (second point on line)
 * 
 * Code reduction: ~150 lines → ~70 lines (53% reduction)
 * 
 */

import { ArgumentCollectorTool } from './ArgumentCollectorTool';
import { twoPointArgumentSet } from './toolArgumentSpecs';
import type { ToolArgumentSet } from '@/tools/ToolArgumentCollector';

/**
 * LineTool using ArgumentCollectorTool framework
 * 
 * Framework handles:
 * - Argument collection (any-order, though semantically both are 'point')
 * - Selection mask computation (point only)
 * - UI feedback ("Creating line: pick point1, point2")
 * - Automatic execution when both points collected
 */
export class LineTool extends ArgumentCollectorTool {
  readonly name = 'line';
  protected readonly constructionIntentType = 'line';

  /**
   * Define argument specification
   * Single set with two point arguments
   */
  protected getArgumentSets(): ToolArgumentSet[] {
    return [
      twoPointArgumentSet('point1', 'point2', 'Cannot create line: must select two different points')
    ];
  }

  /**
   * Execute line creation operations
   */

}

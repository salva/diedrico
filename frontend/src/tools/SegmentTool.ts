/**
 * SegmentTool - Tool for creating finite line segments between two points (Phase 64 Migration)
 * 
 * Migrated to ArgumentCollectorTool framework.
 * Declarative argument specification replaces manual state machine.
 * 
 * Arguments:
 * - point1: Point2D (first endpoint of segment)
 * - point2: Point2D (second endpoint of segment)
 * 
 * Unlike LineTool which creates infinite lines, SegmentTool creates finite segments
 * that only exist between their two endpoints.
 * 
 * Code reduction: ~155 lines → ~75 lines (52% reduction)
 * 
 */

import { ArgumentCollectorTool } from './ArgumentCollectorTool';
import { twoPointArgumentSet } from './toolArgumentSpecs';
import type { ToolArgumentSet } from '@/tools/ToolArgumentCollector';

/**
 * SegmentTool using ArgumentCollectorTool framework
 * 
 * Framework handles:
 * - Argument collection (any-order, though semantically both are 'point')
 * - Selection mask computation (point only)
 * - UI feedback ("Creating segment: pick point1, point2")
 * - Automatic execution when both points collected
 */
export class SegmentTool extends ArgumentCollectorTool {
  readonly name = 'segment';
  protected readonly constructionIntentType = 'segment';

  /**
   * Define argument specification
   * Single set with two point arguments
   */
  protected getArgumentSets(): ToolArgumentSet[] {
    return [
      twoPointArgumentSet('point1', 'point2', 'Cannot create segment: must select two different points')
    ];
  }

  /**
   * Execute segment creation operations
   */

}

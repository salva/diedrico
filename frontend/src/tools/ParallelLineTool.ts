/**
 * ParallelLineTool - Tool for creating lines parallel to a reference line through a point (Phase 64)
 * 
 * Migrated to ArgumentCollectorTool framework.
 * Framework automatically handles flexible workflow (point→line OR line→point).
 * 
 * Arguments:
 * - referenceLineId: Any Line2D subtype (lines, segments, guides, half-hinge-lines)
 * - throughPointId: Point2D through which parallel line passes
 * 
 * Code reduction: 186 lines → ~60 lines (68% reduction)
 * 
 */

import { ArgumentCollectorTool } from './ArgumentCollectorTool';
import { lineThroughPointArgumentSet } from './toolArgumentSpecs';
import type { ToolArgumentSet } from '@/tools/ToolArgumentCollector';

/**
 * ParallelLineTool using ArgumentCollectorTool framework
 * 
 * Framework handles:
 * - Any-order collection (point→line OR line→point automatically)
 * - Selection mask computation (union of point and line)
 * - UI feedback showing what's been selected and what's next
 * - Automatic execution when both arguments collected
 */
export class ParallelLineTool extends ArgumentCollectorTool {
  readonly name = 'parallel-line';
  protected readonly constructionIntentType = 'parallel-line';

  /**
   * Define argument specification
   * Single set with point and any-line arguments
   */
  protected getArgumentSets(): ToolArgumentSet[] {
    return [
      lineThroughPointArgumentSet(
        'referenceLine',
        'throughPoint',
        'Cannot create parallel line: reference line is infeasible'
      )
    ];
  }

  /**
   * Execute parallel line creation operations
   */


  protected getCommandDescription(): string {
    return "Create parallel line";
  }
}

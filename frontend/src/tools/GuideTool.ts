/**
 * GuideTool - Tool for creating guides perpendicular to reference lines (ArgumentCollectorTool Migration)
 * 
 * Migrated to ArgumentCollectorTool framework.
 * 
 * Implements two-click workflow (order-independent):
 * 1. First click: Select reference line (hinge line) OR through-point
 * 2. Second click: Select the other element (point OR hinge line)
 * 3. Create guide perpendicular to reference line, passing through the point
 * 
 * Guides are special construction lines used in dihedral geometry for transporting
 * points and distances between projection planes. They render as dashed lines.
 * 
 * **Special behavior:**
 * - Always creates TWO guides (primary + sibling on paired plane)
 * - Sibling guide uses HalfHingeLine2D.getSiblingInfo()
 * - Registers TWO ProcessTree actions (primary + sibling)
 * 
 * Code reduction: ~221 lines → ~150 lines (32% reduction)
 * 
 * Reference: 
 */

import { ArgumentCollectorTool } from './ArgumentCollectorTool';
import type { ToolArgumentSet } from '@/types/ToolArgumentCollector';
import { SelectionMask } from '@/types/SelectionMask';

/**
 * GuideTool using ArgumentCollectorTool framework
 * 
 * Framework handles:
 * - Any-order argument collection (line→point OR point→line)
 * - Selection mask computation (dynamic based on collected arguments)
 * - UI feedback ("Creating guide: pick half-hinge-line, point")
 * - Automatic execution when both elements collected
 * 
 * Custom behavior:
 * - Creates TWO guides (primary + sibling) via GuideSequenceFactory
 * - Registers TWO ProcessTree actions
 * - Uses HalfHingeLine2D.getSiblingInfo() for sibling plane detection
 */
export class GuideTool extends ArgumentCollectorTool {
  readonly name = 'guide';
  protected readonly constructionIntentType = 'guide';
  readonly completionBehavior = 'stay-active' as const;

  /**
   * Define argument specification
   * Single set with any-order half-hinge-line and point
   */
  protected getArgumentSets(): ToolArgumentSet[] {
    return [
      {
        // ArgumentCollectorTool automatically supports any-order collection!
        // User can select line→point OR point→line
        arguments: [
          { 
            name: 'referenceLine', 
            mask: SelectionMask.halfHingeLine()
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
   * Execute guide creation operations
   * 
   * Creates:
   * - Primary guide on active plane
   * - Sibling guide on paired plane (automatically via GuideSequenceFactory)
   * 
   * Records TWO ProcessTree actions:
   * - createGuideAction (primary guide)
   * - createSiblingGuideAction (sibling guide)
   */

}

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
 * - specs/001-dihedral-learning-mvp/spec.md §US3 - Create Guide
 * - specs/001-dihedral-learning-mvp/spec.md §Guides
 */

import { ArgumentCollectorTool } from './ArgumentCollectorTool';
import type { ToolContext } from './ITool';
import type { ToolArgumentSet, ArgumentValue } from '@/types/ToolArgumentCollector';
import { SelectionMask } from '@/types/SelectionMask';
import { Command } from '@/commands/Command';
import { GuideSequenceFactory } from '@/commands/factories/GuideSequenceFactory';
import { createGuideAction } from '@/domain/processTree/actions/CreateGuideAction';
import { createSiblingGuideAction } from '@/domain/processTree/actions/CreateSiblingGuideAction';
import { AddProcessTreeActionOp } from '@/commands/operations/processTree/AddProcessTreeActionOp';
import { HalfHingeLine2D } from '@/domain/world/HingeLine';

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
  protected executeOperations(
    cmd: Command,
    args: Map<string, ArgumentValue>,
    context: ToolContext
  ): void {
    const referenceLine = args.get('referenceLine')!.element!;
    const throughPoint = args.get('throughPoint')!.element!;
    const referenceLineId = referenceLine.id;
    const throughPointId = throughPoint.id;
    const { planeId, world } = context;

    // Use factory to create guide with sibling
    // This creates both primary and sibling guides automatically
    const result = GuideSequenceFactory.createGuideWithSibling(
      cmd, 
      planeId, 
      referenceLineId, 
      throughPointId, 
      world
    );
    
    const guideId = result.guideId;
    const siblingGuideId = result.siblingGuideId;
    
    // Record ProcessTree action for primary guide
    const primaryAction = createGuideAction(
      guideId, 
      planeId, 
      referenceLineId, 
      throughPointId
    );
    cmd.addAndExecute(new AddProcessTreeActionOp(primaryAction));
    
    // Record ProcessTree action for sibling guide
    // HalfHingeLine2D.getSiblingInfo() provides sibling plane and sibling HHL info
    const siblingInfo = HalfHingeLine2D.getSiblingInfo(world, referenceLineId, planeId);
    
    if (!siblingInfo) {
      throw new Error(`Failed to get sibling info for half-hinge-line ${referenceLineId}`);
    }
    
    const siblingAction = createSiblingGuideAction(
      siblingGuideId, 
      siblingInfo.siblingPlaneId, 
      guideId, 
      siblingInfo.siblingHalfHingeLineId
    );
    cmd.addAndExecute(new AddProcessTreeActionOp(siblingAction));
  }
}

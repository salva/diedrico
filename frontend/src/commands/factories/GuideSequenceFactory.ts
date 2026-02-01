import type { Command } from '../Command';
import { World } from '../../domain/world/World';
import { AddGuide2DPerpendicularToLineOp, AddSiblingGuide2DOp } from '../operations/world/AddGuideOp';
import { HalfHingeLine2D } from '../../domain/world/HingeLine';

/**
 * Factory for creating guide operation sequences.
 * 
 * Encapsulates the logic for:
 * - Creating primary guide perpendicular to reference line
 * - Detecting HalfHingeLine reference lines
 * - Creating sibling guides on complementary planes
 * - Updating bidirectional sibling links
 * 
 * @see GuideTool for usage example
 * @see README.md for factory pattern documentation
 */
export class GuideSequenceFactory {
  /**
   * Creates a guide with its sibling on the complementary plane.
   * 
   * Guides MUST be perpendicular to HalfHingeLines. The sibling guide is
   * automatically created in the paired plane using coordinate correspondence.
   * 
   * @param cmd - Open Command to add operations to
   * @param planeId - ID of plane where primary guide is created
   * @param referenceLineId - ID of HalfHingeLine2D to create perpendicular guide to
   * @param throughPointId - ID of point guide should pass through
   * @param world - World instance for navigation
   * 
   * @returns Object with guideId and siblingGuideId (both always present)
   * 
   * @example
   * ```typescript
   * const cmd = new Command('Create guide', world);
   * const result = GuideSequenceFactory.createGuideWithSibling(
   *   cmd, 
   *   planeId, 
   *   referenceLineId, 
   *   throughPointId, 
   *   world
   * );
   * // Tool handles: process tree action, commit, push to stack
   * cmd.commit();
   * commandStack.push(cmd);
   * ```
   */
  static createGuideWithSibling(
    cmd: Command,
    planeId: string,
    referenceLineId: string,
    throughPointId: string,
    world: World
  ): { guideId: string; siblingGuideId?: string } {
    console.log(`[GuideSequenceFactory] createGuideWithSibling called: plane=${planeId}, refLine=${referenceLineId}, point=${throughPointId}`);
    
    // Create primary guide
    const result = cmd.addAndExecute(
      new AddGuide2DPerpendicularToLineOp(planeId, referenceLineId, throughPointId)
    );
    const guideId = result.outputs.guideId;
    
    console.log(`[GuideSequenceFactory] Primary guide created: ${guideId}`);
    
    console.log(`[GuideSequenceFactory] Getting sibling plane info...`);
    
    // Check if reference line is a HalfHingeLine (has sibling info)
    const siblingInfo = HalfHingeLine2D.getSiblingInfo(world, referenceLineId, planeId);
    
    if (!siblingInfo) {
      console.log(`[GuideSequenceFactory] No sibling info - reference line is not a HalfHingeLine`);
      return { guideId };
    }
    
    console.log(`[GuideSequenceFactory] Sibling plane: ${siblingInfo.siblingPlaneId}, HHL: ${siblingInfo.siblingHalfHingeLineId}`);
    
    // Create sibling guide using coordinate correspondence
    const siblingResult = cmd.addAndExecute(
      new AddSiblingGuide2DOp(
        siblingInfo.siblingPlaneId,
        guideId,
        siblingInfo.siblingHalfHingeLineId
      )
    );
    const siblingGuideId = siblingResult.outputs.siblingGuideId;
    
    // Update bidirectional links
    const primaryGuide = world.getLine2D(guideId)!;
    (primaryGuide as any).siblingGuideId = siblingGuideId;
    
    console.log(
      `[GuideSequenceFactory] Created sibling guide ${siblingGuideId} ` +
      `in plane ${siblingInfo.siblingPlaneId}`
    );
    
    return { guideId, siblingGuideId };
  }
}

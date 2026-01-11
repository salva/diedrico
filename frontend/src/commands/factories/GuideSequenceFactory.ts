import { Command } from '../Command';
import { World } from '../../domain/world/World';
import { AddGuide2DPerpendicularToLineOp, AddSiblingGuide2DOp } from '../operations/world/AddGuideOp';

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
   * Creates a guide with conditional sibling on complementary plane.
   * 
   * If the reference line is a HalfHingeLine2D and sibling plane information
   * is available, automatically creates a sibling guide using coordinate
   * correspondence.
   * 
   * @param cmd - Open Command to add operations to
   * @param planeId - ID of plane where primary guide is created
   * @param referenceLineId - ID of line to create perpendicular guide to
   * @param throughPointId - ID of point guide should pass through
   * @param world - World instance for conditional logic
   * 
   * @returns Object with guideId and optional siblingGuideId
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
    // Create primary guide
    const result = cmd.addAndExecute(
      new AddGuide2DPerpendicularToLineOp(planeId, referenceLineId, throughPointId)
    );
    const guideId = result.outputs.guideId;
    
    let siblingGuideId: string | undefined;
    
    try {
      // Check if reference line is HalfHingeLine and get sibling info
      const siblingInfo = world.getSiblingPlaneAndHalfHingeLineForGuide(referenceLineId, planeId);
      
      if (siblingInfo) {
        // Create sibling guide using coordinate correspondence
        const siblingResult = cmd.addAndExecute(
          new AddSiblingGuide2DOp(
            siblingInfo.siblingPlaneId,
            guideId,
            siblingInfo.siblingHalfHingeLineId
          )
        );
        siblingGuideId = siblingResult.outputs.siblingGuideId;
        
        // Update bidirectional links
        const primaryGuide = world.getLine2DById(guideId);
        
        if (primaryGuide && 'siblingGuideId' in primaryGuide) {
          (primaryGuide as any).siblingGuideId = siblingGuideId;
        }
        
        console.log(
          `[GuideSequenceFactory] Created sibling guide ${siblingGuideId} ` +
          `in plane ${siblingInfo.siblingPlaneId}`
        );
      }
    } catch (siblingError) {
      // Sibling creation failed - log but don't fail the entire operation
      console.warn('[GuideSequenceFactory] Failed to create sibling guide:', siblingError);
    }
    
    return { guideId, siblingGuideId };
  }
}

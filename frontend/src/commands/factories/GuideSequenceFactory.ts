import type { Command } from '../Command';
import { World } from '../../domain/world/World';
import { AddGuide2DPerpendicularToLineOp, AddSiblingGuide2DOp } from '../operations/world/AddGuideOp';
import { HalfHingeLine2D } from '../../domain/world/HingeLine';
import { BrokenHalfHingeLine2D } from '../../domain/world/elements/BrokenHalfHingeLine2D';
import { computeArcGeometry } from '../../utils/arcGeometry';
import { Guide2D, SiblingGuide2D } from '../../domain/world/Guide';

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
    
    // Create primary guide
    const result = cmd.addAndExecute(
      new AddGuide2DPerpendicularToLineOp(planeId, referenceLineId, throughPointId)
    );
    const guideId = result.outputs.guideId;
    if (!guideId) {
      throw new Error('guideId missing from operation output');
    }
    
    // Check if reference line is a HalfHingeLine (regular or broken)
    // Try HalfHingeLine2D first
    let siblingInfo = HalfHingeLine2D.getSiblingInfo(world, referenceLineId, planeId);
    
    // If not regular HHL, try BrokenHalfHingeLine2D
    if (!siblingInfo) {
      siblingInfo = BrokenHalfHingeLine2D.getSiblingInfo(world, referenceLineId, planeId);
    }
    
    if (!siblingInfo) {
      return { guideId };
    }
    
    // Create sibling guide using coordinate correspondence
    const siblingResult = cmd.addAndExecute(
      new AddSiblingGuide2DOp(
        siblingInfo.siblingPlaneId,
        guideId,
        siblingInfo.siblingHalfHingeLineId
      )
    );
    const siblingGuideId = siblingResult.outputs.siblingGuideId;
    if (!siblingGuideId) {
      throw new Error('siblingGuideId missing from operation output');
    }
    
    // Update bidirectional links
    const primaryGuide = world.getLine2D(guideId);
    if (!(primaryGuide instanceof Guide2D)) {
      throw new Error(`Primary guide not found: ${guideId}`);
    }
    primaryGuide.siblingGuideId = siblingGuideId;
    
    // Phase 101: If reference line is BrokenHalfHingeLine2D, compute arc geometry
    const referenceLine = world.getLine2D(referenceLineId);
    if (referenceLine instanceof BrokenHalfHingeLine2D) {
      
      const siblingGuideLine = world.getLine2D(siblingGuideId);
      if (!(siblingGuideLine instanceof SiblingGuide2D)) {
        throw new Error(`Sibling guide not found: ${siblingGuideId}`);
      }
      const siblingGuide = siblingGuideLine;
      
      // Compute arc geometry connecting the two guides
      const arcGeometry = computeArcGeometry(world, primaryGuide, siblingGuide);
      
      if (arcGeometry) {
        // Store arc in BOTH guides for rendering
        primaryGuide.arcGeometry = arcGeometry;
        siblingGuide.arcGeometry = arcGeometry;
      } else {
        console.warn(`[GuideSequenceFactory] Failed to compute arc geometry`);
      }
    }
    
    return { guideId, siblingGuideId };
  }
}

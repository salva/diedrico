/**
 * AddGuide2DPerpendicularToLineOp - Operation to add a Guide2DPerpendicularToLine using ProjectionPlane factory method
 * 
 * Wraps ProjectionPlane.addGuide2D() in the Operation interface.
 */

import type { IOperation, OperationResult } from './IOperation';
import type { World } from '@/domain/world/World';

export class AddGuide2DPerpendicularToLineOp implements IOperation {
  readonly type = 'AddGuide2DPerpendicularToLine';
  readonly parameters: Record<string, any>;
  outputs: Record<string, any> = {};

  constructor(
    private planeId: string,
    private referenceLineId: string,
    private throughPointId: string
  ) {
    this.parameters = { planeId, referenceLineId, throughPointId };
  }

  apply(world: World): OperationResult {
    try {
      const plane = world.getProjectionPlaneById(this.planeId);
      if (!plane) {
        throw new Error(`Plane not found: ${this.planeId}`);
      }
      
      // Pass stored ID if available (for redo), otherwise let plane generate new one
      const guide = plane.addGuide2D(
        this.referenceLineId,
        this.throughPointId,
        world,
        this.outputs.guideId
      );
      this.outputs = { guideId: guide.id };
      return {
        success: true,
        outputs: this.outputs
      };
    } catch (error) {
      return {
        success: false,
        outputs: {},
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  undo(world: World): void {
    if (this.outputs.guideId) {
      const plane = world.getProjectionPlaneById(this.planeId);
      if (plane) {
        // Guides are stored in the lines Map
        plane.removeLine(this.outputs.guideId);
      }
    }
  }
}

/**
 * AddSiblingGuide2DOp - Operation to add a sibling guide in the paired projection plane
 * 
 * Sibling guides are automatically created when a primary Guide2D is created.
 * This operation wraps ProjectionPlane.addSiblingGuide2D().
 * 
 * Architecture note: Sibling creation must be done at command level using specific ops,
 * not embedded in the world layer (as per architecture requirements).
 */
export class AddSiblingGuide2DOp implements IOperation {
  readonly type = 'AddSiblingGuide2D';
  readonly parameters: Record<string, any>;
  outputs: Record<string, any> = {};

  constructor(
    private planeId: string,
    private primaryGuideId: string,
    private referenceLineId: string
  ) {
    this.parameters = { planeId, primaryGuideId, referenceLineId };
  }

  apply(world: World): OperationResult {
    try {
      const plane = world.getProjectionPlaneById(this.planeId);
      if (!plane) {
        throw new Error(`Plane not found: ${this.planeId}`);
      }
      
      // Pass stored ID if available (for redo), otherwise let plane generate new one
      const siblingGuide = plane.addSiblingGuide2D(
        this.primaryGuideId,
        this.referenceLineId,
        world,
        this.outputs.siblingGuideId
      );
      this.outputs = { siblingGuideId: siblingGuide.id };
      return {
        success: true,
        outputs: this.outputs
      };
    } catch (error) {
      return {
        success: false,
        outputs: {},
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  undo(world: World): void {
    if (this.outputs.siblingGuideId) {
      const plane = world.getProjectionPlaneById(this.planeId);
      if (plane) {
        // Sibling guides are stored in the lines Map
        plane.removeLine(this.outputs.siblingGuideId);
      }
    }
  }
}

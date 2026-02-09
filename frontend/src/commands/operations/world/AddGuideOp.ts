/**
 * AddGuide2DPerpendicularToLineOp - Operation to add a Guide2DPerpendicularToLine using ProjectionPlane factory method
 * 
 * Wraps ProjectionPlane.addGuide2D() in the Operation interface.
 */

import type { IOperation, OperationResult } from '../IOperation';
import type { World } from '@/domain/world/World';

export class AddGuide2DPerpendicularToLineOp implements IOperation {
  readonly type = 'AddGuide2DPerpendicularToLine';
  readonly parameters: Record<string, any>;
  outputs: Record<string, any> = {};

  constructor(
    private planeId: string,
    private referenceLineId: string,
    private throughPointId: string,
    private guideId?: string
  ) {
    this.parameters = { planeId, referenceLineId, throughPointId, guideId };
  }

  apply(world: World): OperationResult {
    try {
      const plane = world.getProjectionPlaneById(this.planeId);
      if (!plane) {
        throw new Error(`Plane not found: ${this.planeId}`);
      }
      
      // Use guideId from constructor (for deserialization), outputs (for redo), or let it generate
      const guide = plane.addGuide2D(
        this.referenceLineId,
        this.throughPointId,
        world,
        this.guideId || this.outputs.guideId
      );
      this.outputs = { guideId: guide.id };
      // Back-fill generated ID into parameters for persistence
      this.parameters.guideId = guide.id;
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

  serialize() {
    return {
      opType: this.type,
      planeId: this.planeId,
      referenceLineId: this.referenceLineId,
      throughPointId: this.throughPointId,
      guideId: this.outputs.guideId || this.parameters.guideId
    };
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
    private referenceLineId: string,
    private siblingGuideId?: string
  ) {
    this.parameters = { planeId, primaryGuideId, referenceLineId, siblingGuideId };
  }

  apply(world: World): OperationResult {
    try {
      const plane = world.getProjectionPlaneById(this.planeId);
      if (!plane) {
        throw new Error(`Plane not found: ${this.planeId}`);
      }
      
      // Use siblingGuideId from constructor (for deserialization), outputs (for redo), or let it generate
      const siblingGuide = plane.addSiblingGuide2D(
        this.primaryGuideId,
        this.referenceLineId,
        world,
        this.siblingGuideId || this.outputs.siblingGuideId
      );
      this.outputs = { siblingGuideId: siblingGuide.id };
      // Back-fill generated ID into parameters for persistence
      this.parameters.siblingGuideId = siblingGuide.id;
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

  serialize() {
    return {
      opType: this.type,
      planeId: this.planeId,
      primaryGuideId: this.primaryGuideId,
      referenceLineId: this.referenceLineId,
      siblingGuideId: this.outputs.siblingGuideId || this.parameters.siblingGuideId
    };
  }
}

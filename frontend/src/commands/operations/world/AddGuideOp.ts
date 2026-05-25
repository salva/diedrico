/**
 * AddGuide2DPerpendicularToLineOp - Operation to add a Guide2DPerpendicularToLine using ProjectionPlane factory method
 *
 * Wraps ProjectionPlane.addGuide2D() in the Operation interface.
 */

import type { IOperation, JsonObject, OperationResult } from '../IOperation';
import type { World } from '@/domain/world/World';

interface AddGuideOutput extends JsonObject {
  guideId?: string;
}

interface AddSiblingGuideOutput extends JsonObject {
  siblingGuideId?: string;
}

export class AddGuide2DPerpendicularToLineOp implements IOperation {
  readonly type = 'AddGuide2DPerpendicularToLine';
  outputs: AddGuideOutput = {};

  constructor(
    private readonly planeId: string,
    private readonly referenceLineId: string,
    private readonly throughPointId: string,
    private readonly restoredGuideId?: string
  ) {}

  apply(world: World): OperationResult<AddGuideOutput> {
    try {
      const plane = world.getProjectionPlaneById(this.planeId);
      if (!plane) {
        throw new Error(`Plane not found: ${this.planeId}`);
      }

      const guide = plane.addGuide2D(
        this.referenceLineId,
        this.throughPointId,
        world,
        this.restoredGuideId ?? this.outputs.guideId
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
      guideId: this.outputs.guideId
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
  outputs: AddSiblingGuideOutput = {};

  constructor(
    private readonly planeId: string,
    private readonly primaryGuideId: string,
    private readonly referenceLineId: string,
    private readonly restoredSiblingGuideId?: string
  ) {}

  apply(world: World): OperationResult<AddSiblingGuideOutput> {
    try {
      const plane = world.getProjectionPlaneById(this.planeId);
      if (!plane) {
        throw new Error(`Plane not found: ${this.planeId}`);
      }

      const siblingGuide = plane.addSiblingGuide2D(
        this.primaryGuideId,
        this.referenceLineId,
        world,
        this.restoredSiblingGuideId ?? this.outputs.siblingGuideId
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
      siblingGuideId: this.outputs.siblingGuideId
    };
  }
}

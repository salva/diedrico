/**
 * AddGuide2DPerpendicularToLineOp - Operation to add a Guide2DPerpendicularToLine using ProjectionConstructionService
 *
 * Wraps ProjectionConstructionService.addGuide2D() in the Operation interface.
 */

import { Guide2D } from '@/domain/world/Guide';
import type { IOperation, JsonObject, OperationResult } from '../IOperation';
import type { OperationContext } from '../OperationContext';
import { removeLineFromPlane } from './operationHelpers';

interface AddGuideOutput extends JsonObject {
  guideId?: string;
}

interface AddSiblingGuideOutput extends JsonObject {
  siblingGuideId?: string;
}

export class AddGuide2DPerpendicularToLineOp implements IOperation {
  readonly type = 'AddGuide2DPerpendicularToLine';
  outputs: AddGuideOutput = {};

  private createdLabel?: string;

  constructor(
    private readonly planeId: string,
    private readonly referenceLineId: string,
    private readonly throughPointId: string,
    private readonly restoredGuideId?: string
  ) {}

  apply(context: OperationContext): OperationResult<AddGuideOutput> {
    try {
      const plane = context.world.getProjectionPlaneById(this.planeId);
      if (!plane) {
        throw new Error(`Plane not found: ${this.planeId}`);
      }

      const guide = context.projectionConstruction.addGuide2D(
        plane,
        this.referenceLineId,
        this.throughPointId,
        this.restoredGuideId ?? this.outputs.guideId
      );
      if (this.createdLabel !== undefined) guide.label = this.createdLabel;
      else if (typeof this.outputs.label === 'string') guide.label = this.outputs.label;
      this.createdLabel = guide.label;
      context.labelGenerator.reserve('Guide2D', guide.label);
      this.outputs = { guideId: guide.id, label: guide.label };
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

  undo(context: OperationContext): void {
    if (this.outputs.guideId) {
      const plane = context.world.getProjectionPlaneById(this.planeId);
      if (plane) {
        removeLineFromPlane(context, plane, this.outputs.guideId);
      }
    }
  }

  serialize() {
    return {
      opType: this.type,
      planeId: this.planeId,
      referenceLineId: this.referenceLineId,
      throughPointId: this.throughPointId,
      guideId: this.outputs.guideId,
      label: this.createdLabel
    };
  }
}

/**
 * AddSiblingGuide2DOp - Operation to add a sibling guide in the paired projection plane
 *
 * Sibling guides are automatically created when a primary Guide2D is created.
 * This operation wraps ProjectionConstructionService.addSiblingGuide2D().
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

  apply(context: OperationContext): OperationResult<AddSiblingGuideOutput> {
    try {
      const plane = context.world.getProjectionPlaneById(this.planeId);
      if (!plane) {
        throw new Error(`Plane not found: ${this.planeId}`);
      }

      const siblingGuide = context.projectionConstruction.addSiblingGuide2D(
        plane,
        this.primaryGuideId,
        this.referenceLineId,
        this.restoredSiblingGuideId ?? this.outputs.siblingGuideId
      );
      const primary = context.world.getAllProjectionPlanes()
        .map(candidate => candidate.getLine(this.primaryGuideId)).find(Boolean);
      if (primary instanceof Guide2D) primary.siblingGuideId = siblingGuide.id;
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

  undo(context: OperationContext): void {
    if (this.outputs.siblingGuideId) {
      const primary = context.world.getAllProjectionPlanes()
        .map(candidate => candidate.getLine(this.primaryGuideId)).find(Boolean);
      if (primary instanceof Guide2D && primary.siblingGuideId === this.outputs.siblingGuideId) {
        primary.siblingGuideId = undefined;
      }
      const plane = context.world.getProjectionPlaneById(this.planeId);
      if (plane) {
        removeLineFromPlane(context, plane, this.outputs.siblingGuideId);
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

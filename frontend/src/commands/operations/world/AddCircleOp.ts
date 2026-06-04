/**
 * AddCircle2DByCenterAndPointOp - Operation to add a Circle2DByCenterAndPoint using ConstructionService
 * 
 * This is the standard circle construction that defines both radius magnitude and angular reference.
 * Wraps ConstructionService.addCircle2DByCenterAndPoint() in the Operation interface.
 */

import type { IOperation, JsonObject, OperationDescriptor, OperationResult } from '../IOperation';
import type { World } from '@/domain/world/World';
import { operationFailure, operationSuccess } from '../operationResultHelpers';
import { removeCircleFromPlane, requireProjectionPlane } from './operationHelpers';

export interface AddCircle2DByCenterAndPointDescriptor extends OperationDescriptor<'AddCircle2DByCenterAndPoint'> {
  planeId: string;
  centerPointId: string;
  circumferencePointId: string;
  circleId?: string;
}

export interface AddCircle2DByCenterAndPointOutput extends JsonObject {
  circleId?: string;
}

export class AddCircle2DByCenterAndPointOp implements IOperation<AddCircle2DByCenterAndPointDescriptor, AddCircle2DByCenterAndPointOutput> {
  readonly type = 'AddCircle2DByCenterAndPoint';
  outputs: AddCircle2DByCenterAndPointOutput = {};

  constructor(
    private planeId: string,
    private centerPointId: string,
    private circumferencePointId: string
  ) {
  }

  apply(world: World): OperationResult<AddCircle2DByCenterAndPointOutput> {
    try {
      const plane = requireProjectionPlane(world, this.planeId);
      
      const circle = world.getConstructionService().addCircle2DByCenterAndPoint(
        plane,
        this.centerPointId,
        this.circumferencePointId,
        this.outputs.circleId
      );
      this.outputs = { circleId: circle.id };
      return operationSuccess(this.outputs);
    } catch (error) {
      return operationFailure(error);
    }
  }

  undo(world: World): void {
    if (this.outputs.circleId) {
      const plane = world.getProjectionPlaneById(this.planeId);
      if (plane) {
        removeCircleFromPlane(world, plane, this.outputs.circleId);
      }
    }
  }

  serialize(): AddCircle2DByCenterAndPointDescriptor {
    return {
      opType: this.type,
      planeId: this.planeId,
      centerPointId: this.centerPointId,
      circumferencePointId: this.circumferencePointId,
      circleId: this.outputs.circleId
    };
  }
}

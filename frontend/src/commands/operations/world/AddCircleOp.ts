/**
 * AddCircle2DByCenterAndPointOp - Operation to add a Circle2DByCenterAndPoint using ProjectionPlane factory method
 * 
 * This is the standard circle construction that defines both radius magnitude and angular reference.
 * Wraps ProjectionPlane.addCircle2DByCenterAndPoint() in the Operation interface.
 */

import type { IOperation, OperationOutputBag, OperationResult } from '../IOperation';
import type { World } from '@/domain/world/World';
import { operationFailure, operationSuccess } from '../operationResultHelpers';
import { requireProjectionPlane } from './operationHelpers';

export class AddCircle2DByCenterAndPointOp implements IOperation {
  readonly type = 'AddCircle2DByCenterAndPoint';
  outputs: OperationOutputBag = {};

  constructor(
    private planeId: string,
    private centerPointId: string,
    private circumferencePointId: string
  ) {
  }

  apply(world: World): OperationResult {
    try {
      const plane = requireProjectionPlane(world, this.planeId);
      
      // Pass stored ID if available (for redo), otherwise let plane generate new one
      const circle = plane.addCircle2DByCenterAndPoint(
        this.centerPointId,
        this.circumferencePointId,
        world,
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
        plane.removeCircle(this.outputs.circleId);
      }
    }
  }

  serialize() {
    return {
      opType: this.type,
      planeId: this.planeId,
      centerPointId: this.centerPointId,
      circumferencePointId: this.circumferencePointId,
      circleId: this.outputs.circleId
    };
  }
}

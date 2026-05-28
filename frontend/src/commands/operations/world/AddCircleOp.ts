/**
 * AddCircle2DByCenterAndPointOp - Operation to add a Circle2DByCenterAndPoint using ProjectionPlane factory method
 * 
 * This is the standard circle construction that defines both radius magnitude and angular reference.
 * Wraps ProjectionPlane.addCircle2DByCenterAndPoint() in the Operation interface.
 */

import type { IOperation, OperationOutputBag, OperationResult } from '../IOperation';
import type { World } from '@/domain/world/World';

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
      const plane = world.getProjectionPlaneById(this.planeId);
      if (!plane) {
        throw new Error(`Plane not found: ${this.planeId}`);
      }
      
      // Pass stored ID if available (for redo), otherwise let plane generate new one
      const circle = plane.addCircle2DByCenterAndPoint(
        this.centerPointId,
        this.circumferencePointId,
        world,
        this.outputs.circleId
      );
      this.outputs = { circleId: circle.id };
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

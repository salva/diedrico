/**
 * AddFreePoint2DOp - Operation to add a FreePoint2D using ProjectionPlane factory method
 * 
 * Wraps ProjectionPlane.addFreePoint2D() in the Operation interface.
 */

import type { Vector3 } from 'three';
import type { IOperation, JsonObject, OperationDescriptor, OperationResult } from '../IOperation';
import type { World } from '@/domain/world/World';
import { operationFailure, operationSuccess } from '../operationResultHelpers';
import { requireProjectionPlane } from './operationHelpers';

export interface AddFreePoint2DDescriptor extends OperationDescriptor<'AddFreePoint2D'> {
  planeId: string;
  position: [number, number, number];
  pointId?: string;
}

export interface AddFreePoint2DOutput extends JsonObject {
  pointId?: string;
}

export class AddFreePoint2DOp implements IOperation<AddFreePoint2DDescriptor, AddFreePoint2DOutput> {
  readonly type = 'AddFreePoint2D';
  outputs: AddFreePoint2DOutput = {};

  constructor(
    private planeId: string,
    private position: Vector3
  ) {
  }

  apply(world: World): OperationResult<AddFreePoint2DOutput> {
    try {
      const plane = requireProjectionPlane(world, this.planeId);
      
      // Pass stored ID if available (for redo), otherwise let plane generate new one
      const point = plane.addFreePoint2D(this.position, world, this.outputs.pointId);
      this.outputs = { pointId: point.id };
      return operationSuccess(this.outputs);
    } catch (error) {
      return operationFailure(error);
    }
  }

  undo(world: World): void {
    if (this.outputs.pointId) {
      world.getProjectionPlaneById(this.planeId)?.removePoint(this.outputs.pointId);
    }
  }

  serialize(): AddFreePoint2DDescriptor {
    return {
      opType: this.type,
      planeId: this.planeId,
      position: [this.position.x, this.position.y, this.position.z],
      pointId: this.outputs.pointId
    };
  }
}

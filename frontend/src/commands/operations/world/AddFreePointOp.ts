/**
 * AddFreePoint2DOp - Operation to add a FreePoint2D using ProjectionConstructionService
 * 
 * Wraps ProjectionConstructionService.addFreePoint2D() in the Operation interface.
 */

import type { Vector3 } from 'three';
import type { IOperation, JsonObject, OperationDescriptor, OperationResult } from '../IOperation';
import type { OperationContext } from '../OperationContext';
import { operationFailure, operationSuccess } from '../operationResultHelpers';
import { removePointFromPlane, requireProjectionPlane } from './operationHelpers';

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

  private createdLabel?: string;

  constructor(
    private planeId: string,
    private position: Vector3
  ) {
    this.position = position.clone();
  }

  apply(context: OperationContext): OperationResult<AddFreePoint2DOutput> {
    try {
      const plane = requireProjectionPlane(context.world, this.planeId);
      
      const point = context.projectionConstruction.addFreePoint2D(plane, this.position, this.outputs.pointId, this.createdLabel ?? (typeof this.outputs.label === 'string' ? this.outputs.label : undefined));
      this.createdLabel = point.label;
      context.labelGenerator.reserve('Point2D', point.label);
      this.outputs = { pointId: point.id, label: point.label };
      return operationSuccess(this.outputs);
    } catch (error) {
      return operationFailure(error);
    }
  }

  undo(context: OperationContext): void {
    if (this.outputs.pointId) {
      const plane = context.world.getProjectionPlaneById(this.planeId);
      if (plane) removePointFromPlane(context, plane, this.outputs.pointId);
    }
  }

  serialize(): AddFreePoint2DDescriptor {
    return {
      opType: this.type,
      planeId: this.planeId,
      position: [this.position.x, this.position.y, this.position.z],
      pointId: this.outputs.pointId,
      label: this.createdLabel
    };
  }
}

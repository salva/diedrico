/**
 * AddCircle2DByCenterAndPointOp - Operation to add a Circle2DByCenterAndPoint using ProjectionConstructionService
 * 
 * This is the standard circle construction that defines both radius magnitude and angular reference.
 * Wraps ProjectionConstructionService.addCircle2DByCenterAndPoint() in the Operation interface.
 */

import type { IOperation, JsonObject, OperationDescriptor, OperationResult } from '../IOperation';
import type { OperationContext } from '../OperationContext';
import { operationFailure, operationSuccess } from '../operationResultHelpers';
import { invalidateRealization, removeCircleFromPlane, requireProjectionPlane } from './operationHelpers';
import { Circle2DByCenterAndRadiusVector } from '@/domain/world/Circle';
import { Vector3 } from 'three';
import type { VisualStyle } from '@/domain/world/VisualStyle';

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

  apply(context: OperationContext): OperationResult<AddCircle2DByCenterAndPointOutput> {
    try {
      const plane = requireProjectionPlane(context.world, this.planeId);
      
      const circle = context.projectionConstruction.addCircle2DByCenterAndPoint(
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

  undo(context: OperationContext): void {
    if (this.outputs.circleId) {
      const plane = context.world.getProjectionPlaneById(this.planeId);
      if (plane) {
        removeCircleFromPlane(context, plane, this.outputs.circleId);
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

export interface AddCircle2DByCenterAndRadiusVectorDescriptor extends OperationDescriptor<'AddCircle2DByCenterAndRadiusVector'> {
  planeId: string;
  centerPointId: string;
  radiusVector: [number, number, number];
  circleId?: string;
}

export interface AddCircle2DByCenterAndRadiusVectorOutput extends JsonObject {
  circleId?: string;
}

function vectorFromTuple(tuple: [number, number, number]): Vector3 {
  return new Vector3(tuple[0], tuple[1], tuple[2]);
}

function vectorToTuple(vector: Vector3): [number, number, number] {
  return [vector.x, vector.y, vector.z];
}

export class AddCircle2DByCenterAndRadiusVectorOp implements IOperation<AddCircle2DByCenterAndRadiusVectorDescriptor, AddCircle2DByCenterAndRadiusVectorOutput> {
  readonly type = 'AddCircle2DByCenterAndRadiusVector';
  outputs: AddCircle2DByCenterAndRadiusVectorOutput = {};

  constructor(
    private planeId: string,
    private centerPointId: string,
    private radiusVector: Vector3
  ) {
  }

  apply(context: OperationContext): OperationResult<AddCircle2DByCenterAndRadiusVectorOutput> {
    try {
      const plane = requireProjectionPlane(context.world, this.planeId);
      const circle = context.projectionConstruction.addCircle2DByCenterAndRadiusVector(
        plane,
        this.centerPointId,
        this.radiusVector,
        this.outputs.circleId
      );
      this.outputs = { circleId: circle.id };
      return operationSuccess(this.outputs);
    } catch (error) {
      return operationFailure(error);
    }
  }

  undo(context: OperationContext): void {
    if (this.outputs.circleId) {
      const plane = context.world.getProjectionPlaneById(this.planeId);
      if (plane) {
        removeCircleFromPlane(context, plane, this.outputs.circleId);
      }
    }
  }

  serialize(): AddCircle2DByCenterAndRadiusVectorDescriptor {
    return {
      opType: this.type,
      planeId: this.planeId,
      centerPointId: this.centerPointId,
      radiusVector: vectorToTuple(this.radiusVector),
      circleId: this.outputs.circleId
    };
  }
}

export interface UpdateCircle2DRadiusVectorDescriptor extends OperationDescriptor<'UpdateCircle2DRadiusVector'> {
  planeId: string;
  circleId: string;
  newRadiusVector: [number, number, number];
}

export class UpdateCircle2DRadiusVectorOp implements IOperation<UpdateCircle2DRadiusVectorDescriptor> {
  readonly type = 'UpdateCircle2DRadiusVector';
  outputs: JsonObject = {};

  private previousRadiusVector?: Vector3;
  private previousLabel?: string;
  private previousStyle?: VisualStyle;

  constructor(
    private planeId: string,
    private circleId: string,
    private newRadiusVector: Vector3
  ) {
  }

  apply(context: OperationContext): OperationResult {
    try {
      const plane = requireProjectionPlane(context.world, this.planeId);
      const existing = plane.getCircle(this.circleId);
      if (!(existing instanceof Circle2DByCenterAndRadiusVector)) {
        throw new Error(`Cannot edit radius vector of non-parameterized circle: ${this.circleId}`);
      }

      if (!this.previousRadiusVector) {
        this.previousRadiusVector = existing.radiusVector.clone();
        this.previousLabel = existing.label;
        this.previousStyle = existing.visualStyle ? { ...existing.visualStyle } : undefined;
      }

      const updated = new Circle2DByCenterAndRadiusVector(
        existing.id,
        existing.centerPointId,
        this.newRadiusVector,
        existing.planeId,
        this.previousLabel
      );
      updated.visualStyle = existing.visualStyle ? { ...existing.visualStyle } : undefined;

      invalidateRealization(context, this.circleId);
      plane.removeCircle(this.circleId);
      plane.addCircle(updated);
      context.dependencies.registerNode(updated.id, updated.getDependencies());

      return operationSuccess({ circleId: this.circleId });
    } catch (error) {
      return operationFailure(error);
    }
  }

  undo(context: OperationContext): void {
    if (!this.previousRadiusVector) return;
    const plane = context.world.getProjectionPlaneById(this.planeId);
    const existing = plane?.getCircle(this.circleId);
    if (!plane || !(existing instanceof Circle2DByCenterAndRadiusVector)) return;

    const restored = new Circle2DByCenterAndRadiusVector(
      this.circleId,
      existing.centerPointId,
      this.previousRadiusVector,
      this.planeId,
      this.previousLabel
    );
    restored.visualStyle = this.previousStyle ? { ...this.previousStyle } : undefined;

    invalidateRealization(context, this.circleId);
    plane.removeCircle(this.circleId);
    plane.addCircle(restored);
    context.dependencies.registerNode(restored.id, restored.getDependencies());
  }

  serialize(): UpdateCircle2DRadiusVectorDescriptor {
    return {
      opType: this.type,
      planeId: this.planeId,
      circleId: this.circleId,
      newRadiusVector: vectorToTuple(this.newRadiusVector)
    };
  }
}

export function parseRadiusVectorDescriptor(value: number[]): Vector3 {
  return vectorFromTuple(value as [number, number, number]);
}

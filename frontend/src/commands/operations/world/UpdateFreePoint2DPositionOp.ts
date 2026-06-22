/**
 * UpdateFreePoint2DPositionOp - Move a FreePoint2D by updating its defining rule.
 *
 * This is the foundation for drag-to-move with live preview:
 * tools/UI can rollback+reapply this op multiple times while building a command.
 */

import { Vector3 } from 'three';
import type { IOperation, JsonObject, OperationDescriptor, OperationResult } from '../IOperation';
import type { OperationContext } from '../OperationContext';
import { FreePoint2D } from '@/domain/world/Point';
import { invalidateRealization } from './operationHelpers';
import type { VisualStyle } from '@/domain/world/VisualStyle';

type SerializableVector3 = { x: number; y: number; z: number };

export interface UpdateFreePoint2DPositionDescriptor extends OperationDescriptor<'UpdateFreePoint2DPosition'> {
  planeId: string;
  pointId: string;
  newPosition: [number, number, number];
}

export interface UpdateFreePoint2DPositionOutput extends JsonObject {
}

function toVector3(value: Vector3 | SerializableVector3): Vector3 {
  // Covers both real Vector3 instances and plain objects (from JSON)
  return new Vector3(value.x, value.y, value.z);
}

export class UpdateFreePoint2DPositionOp implements IOperation<UpdateFreePoint2DPositionDescriptor, UpdateFreePoint2DPositionOutput> {
  readonly type = 'UpdateFreePoint2DPosition';
  outputs: UpdateFreePoint2DPositionOutput = {};

  private previousPosition?: Vector3;
  private previousLabel?: string;
  private previousLocked?: boolean;
  private previousStyle?: VisualStyle;

  constructor(
    private planeId: string,
    private pointId: string,
    private newPosition: Vector3 | SerializableVector3
  ) {
  }

  apply(context: OperationContext): OperationResult<UpdateFreePoint2DPositionOutput> {
    try {
      const plane = context.world.getProjectionPlaneById(this.planeId);
      if (!plane) {
        throw new Error(`Plane not found: ${this.planeId}`);
      }

      const existing = plane.getPoint(this.pointId);
      if (!existing) {
        throw new Error(`Point not found: ${this.pointId}`);
      }

      if (!(existing instanceof FreePoint2D)) {
        throw new Error(`Cannot move non-free point: ${this.pointId} (${existing.constructor.name})`);
      }

      const freePoint = existing;
      if (freePoint.locked) {
        throw new Error(`Cannot move locked point: ${this.pointId}`);
      }

      if (!this.previousPosition) {
        this.previousPosition = toVector3(freePoint.position);
        this.previousLabel = freePoint.label;
        this.previousLocked = freePoint.locked;
        this.previousStyle = freePoint.visualStyle ? { ...freePoint.visualStyle } : undefined;
      }

      const nextPos = toVector3(this.newPosition);
      const updated = new FreePoint2D(this.pointId, nextPos, this.planeId, this.previousLabel);
      updated.locked = this.previousLocked ?? false;
      updated.visualStyle = freePoint.visualStyle ? { ...freePoint.visualStyle } : undefined;

      invalidateRealization(context, this.pointId);

      plane.removePoint(this.pointId);
      plane.addPoint(updated);

      return { success: true, outputs: this.outputs };
    } catch (error) {
      return {
        success: false,
        outputs: {},
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  undo(context: OperationContext): void {
    if (!this.previousPosition) {
      return;
    }

    const plane = context.world.getProjectionPlaneById(this.planeId);
    if (!plane) {
      return;
    }

    const restored = new FreePoint2D(this.pointId, this.previousPosition, this.planeId, this.previousLabel);
    restored.locked = this.previousLocked ?? false;
    restored.visualStyle = this.previousStyle ? { ...this.previousStyle } : undefined;

    invalidateRealization(context, this.pointId);

    plane.removePoint(this.pointId);
    plane.addPoint(restored);
  }

  serialize(): UpdateFreePoint2DPositionDescriptor {
    const pos = toVector3(this.newPosition);
    return {
      opType: this.type,
      planeId: this.planeId,
      pointId: this.pointId,
      newPosition: [pos.x, pos.y, pos.z]
    };
  }
}

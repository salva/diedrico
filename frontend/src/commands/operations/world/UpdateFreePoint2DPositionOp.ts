/**
 * UpdateFreePoint2DPositionOp - Move a FreePoint2D by updating its defining rule.
 *
 * This is the foundation for drag-to-move with live preview:
 * tools/UI can rollback+reapply this op multiple times while building a command.
 */

import { Vector3 } from 'three';
import type { IOperation, OperationResult } from '../IOperation';
import type { World } from '@/domain/world/World';
import { FreePoint2D } from '@/domain/world/Point';

type SerializableVector3 = { x: number; y: number; z: number };

function toVector3(value: Vector3 | SerializableVector3): Vector3 {
  // Covers both real Vector3 instances and plain objects (from JSON)
  return new Vector3(value.x, value.y, value.z);
}

export class UpdateFreePoint2DPositionOp implements IOperation {
  readonly type = 'UpdateFreePoint2DPosition';
  readonly parameters: Record<string, any>;
  outputs: Record<string, any> = {};

  private previousPosition?: Vector3;
  private previousLabel?: string;
  private previousLocked?: boolean;

  constructor(
    private planeId: string,
    private pointId: string,
    private newPosition: Vector3 | SerializableVector3
  ) {
    const pos = this.newPosition as any;
    this.parameters = {
      planeId,
      pointId,
      newPosition: { x: pos.x, y: pos.y, z: pos.z }
    };
  }

  apply(world: World): OperationResult {
    try {
      const plane = world.getProjectionPlaneById(this.planeId);
      if (!plane) {
        throw new Error(`Plane not found: ${this.planeId}`);
      }

      const existing = plane.getPoint(this.pointId);
      if (!existing) {
        throw new Error(`Point not found: ${this.pointId}`);
      }

      if (existing.type !== 'free') {
        throw new Error(`Cannot move non-free point: ${this.pointId} (${existing.type})`);
      }

      const freePoint = existing as FreePoint2D;
      if (freePoint.locked) {
        throw new Error(`Cannot move locked point: ${this.pointId}`);
      }

      if (!this.previousPosition) {
        this.previousPosition = toVector3((freePoint as any).position);
        this.previousLabel = freePoint.label;
        this.previousLocked = freePoint.locked;
      }

      const nextPos = toVector3(this.newPosition);
      const updated = new FreePoint2D(this.pointId, nextPos, this.planeId, this.previousLabel);
      updated.locked = this.previousLocked ?? false;

      plane.removePoint(this.pointId);
      plane.addPoint(updated);

      world.invalidateRealization(this.pointId);
      world.markDirty();

      return { success: true, outputs: this.outputs };
    } catch (error) {
      return {
        success: false,
        outputs: {},
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  undo(world: World): void {
    if (!this.previousPosition) {
      return;
    }

    const plane = world.getProjectionPlaneById(this.planeId);
    if (!plane) {
      return;
    }

    const restored = new FreePoint2D(this.pointId, this.previousPosition, this.planeId, this.previousLabel);
    restored.locked = this.previousLocked ?? false;

    plane.removePoint(this.pointId);
    plane.addPoint(restored);

    world.invalidateRealization(this.pointId);
    world.markDirty();
  }
}

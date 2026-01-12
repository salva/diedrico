/**
 * AddFreePoint2DOp - Operation to add a FreePoint2D using ProjectionPlane factory method
 * 
 * Wraps ProjectionPlane.addFreePoint2D() in the Operation interface.
 */

import type { Vector3 } from 'three';
import type { IOperation, OperationResult } from '../IOperation';
import type { World } from '@/domain/world/World';

export class AddFreePoint2DOp implements IOperation {
  readonly type = 'AddFreePoint2D';
  readonly parameters: Record<string, any>;
  outputs: Record<string, any> = {};

  constructor(
    private planeId: string,
    private position: Vector3
  ) {
    this.parameters = { planeId, position };
  }

  apply(world: World): OperationResult {
    try {
      // Get the projection plane
      const plane = world.getProjectionPlaneById(this.planeId);
      if (!plane) {
        throw new Error(`Plane not found: ${this.planeId}`);
      }
      
      // Pass stored ID if available (for redo), otherwise let plane generate new one
      const point = plane.addFreePoint2D(this.position, world, this.outputs.pointId);
      this.outputs = { pointId: point.id };
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
    if (this.outputs.pointId) {
      const plane = world.getProjectionPlaneById(this.planeId);
      if (plane) {
        plane.removePoint(this.outputs.pointId);
      }
    }
  }
}

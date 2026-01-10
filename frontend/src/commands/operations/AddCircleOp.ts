/**
 * AddCircle2DByCenterAndRadiusOp - Operation to add a Circle2DByCenterAndRadius using ProjectionPlane factory method
 * 
 * Wraps ProjectionPlane.addCircle2DByCenter() in the Operation interface.
 */

import type { IOperation, OperationResult } from './IOperation';
import type { World } from '@/domain/world/World';

export class AddCircle2DByCenterAndRadiusOp implements IOperation {
  readonly type = 'AddCircle2DByCenterAndRadius';
  readonly parameters: Record<string, any>;
  outputs: Record<string, any> = {};

  constructor(
    private planeId: string,
    private centerId: string,
    private radius: number
  ) {
    this.parameters = { planeId, centerId, radius };
  }

  apply(world: World): OperationResult {
    try {
      const plane = world.getProjectionPlaneById(this.planeId);
      if (!plane) {
        throw new Error(`Plane not found: ${this.planeId}`);
      }
      
      // Pass stored ID if available (for redo), otherwise let plane generate new one
      const circle = plane.addCircle2DByCenter(
        this.centerId,
        this.radius,
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
}

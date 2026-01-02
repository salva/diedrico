/**
 * AddCircle2DByCenterAndRadiusOp - Operation to add a Circle2DByCenterAndRadius using World factory method
 * 
 * Wraps World.addCircle2DByCenter() in the Operation interface.
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
      // Pass stored ID if available (for redo), otherwise let World generate new one
      const circle = world.addCircle2DByCenter(
        this.planeId,
        this.centerId,
        this.radius,
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
      world.removeCircle2D(this.planeId, this.outputs.circleId);
    }
  }
}

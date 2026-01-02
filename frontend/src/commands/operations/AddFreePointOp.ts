/**
 * AddFreePoint2DOp - Operation to add a FreePoint2D using World factory method
 * 
 * Wraps World.addFreePoint2D() in the Operation interface.
 */

import type { Vector3 } from 'three';
import type { IOperation, OperationResult } from './IOperation';
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
      // Pass stored ID if available (for redo), otherwise let World generate new one
      const point = world.addFreePoint2D(this.planeId, this.position, this.outputs.pointId);
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
      world.removePoint2D(this.planeId, this.outputs.pointId);
    }
  }
}

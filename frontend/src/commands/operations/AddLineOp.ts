/**
 * AddLine2DByTwoPointsOp - Operation to add a Line2DByTwoPoints using World factory method
 * 
 * Wraps World.addLine2DBetweenTwoPoints() in the Operation interface.
 */

import type { IOperation, OperationResult } from './IOperation';
import type { World } from '@/domain/world/World';

export class AddLine2DByTwoPointsOp implements IOperation {
  readonly type = 'AddLine2DByTwoPoints';
  readonly parameters: Record<string, any>;
  outputs: Record<string, any> = {};

  constructor(
    private planeId: string,
    private point1Id: string,
    private point2Id: string
  ) {
    this.parameters = { planeId, point1Id, point2Id };
  }

  apply(world: World): OperationResult {
    try {
      // Pass stored ID if available (for redo), otherwise let World generate new one
      const line = world.addLine2DBetweenTwoPoints(
        this.planeId,
        this.point1Id,
        this.point2Id,
        this.outputs.lineId
      );
      this.outputs = { lineId: line.id };
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
    if (this.outputs.lineId) {
      world.removeLine2D(this.planeId, this.outputs.lineId);
    }
  }
}

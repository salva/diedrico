/**
 * AddIntersectionPoint2DOp - Operation to add an IntersectionPoint2D using World factory method
 * 
 * Wraps World.addIntersectionPoint2D() in the Operation interface.
 */

import type { IOperation, OperationResult } from './IOperation';
import type { World } from '@/domain/world/World';

export class AddIntersectionPoint2DOp implements IOperation {
  readonly type = 'AddIntersectionPoint2D';
  readonly parameters: Record<string, any>;
  outputs: Record<string, any> = {};

  constructor(
    private planeId: string,
    private line1Id: string,
    private line2Id: string,
    private index: number
  ) {
    this.parameters = { planeId, line1Id, line2Id, index };
  }

  apply(world: World): OperationResult {
    try {
      // Pass stored ID if available (for redo), otherwise let World generate new one
      const point = world.addIntersectionPoint2D(
        this.planeId,
        this.line1Id,
        this.line2Id,
        this.index,
        this.outputs.pointId
      );
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

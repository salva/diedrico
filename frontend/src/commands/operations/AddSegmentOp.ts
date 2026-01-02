/**
 * AddSegment2DByPointsOp - Operation to add a Segment2DByPoints using World factory method
 * 
 * Wraps World.addSegment2DBetweenPoints() in the Operation interface.
 */

import type { IOperation, OperationResult } from './IOperation';
import type { World } from '@/domain/world/World';

export class AddSegment2DByPointsOp implements IOperation {
  readonly type = 'AddSegment2DByPoints';
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
      const segment = world.addSegment2DBetweenPoints(
        this.planeId,
        this.point1Id,
        this.point2Id,
        this.outputs.segmentId
      );
      this.outputs = { segmentId: segment.id };
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
    if (this.outputs.segmentId) {
      world.removeSegment2D(this.planeId, this.outputs.segmentId);
    }
  }
}

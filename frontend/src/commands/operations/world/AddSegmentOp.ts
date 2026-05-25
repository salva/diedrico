/**
 * AddSegment2DByPointsOp - Operation to add a Segment2DByPoints using ProjectionPlane factory method
 * 
 * Wraps ProjectionPlane.addSegment2DBetweenPoints() in the Operation interface.
 */

import type { IOperation, OperationResult } from '../IOperation';
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
      const plane = world.getProjectionPlaneById(this.planeId);
      if (!plane) {
        throw new Error(`Plane not found: ${this.planeId}`);
      }
      
      // Pass stored ID if available (for redo), otherwise let plane generate new one
      const segment = plane.addSegment2DBetweenPoints(
        this.point1Id,
        this.point2Id,
        world,
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
      const plane = world.getProjectionPlaneById(this.planeId);
      if (plane) {
        // Segments are stored in the lines Map
        plane.removeLine(this.outputs.segmentId);
      }
    }
  }

  serialize() {
    return {
      opType: this.type,
      planeId: this.planeId,
      point1Id: this.point1Id,
      point2Id: this.point2Id,
      segmentId: this.outputs.segmentId
    };
  }
}

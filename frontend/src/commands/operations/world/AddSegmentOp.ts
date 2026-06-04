/**
 * AddSegment2DByPointsOp - Operation to add a Segment2D using ConstructionService
 * 
 * Wraps ConstructionService.addSegment2DBetweenPoints() in the Operation interface.
 */

import type { IOperation, JsonObject, OperationDescriptor, OperationResult } from '../IOperation';
import type { World } from '@/domain/world/World';
import { removeLineFromPlane } from './operationHelpers';

export interface AddSegment2DByPointsDescriptor extends OperationDescriptor<'AddSegment2DByPoints'> {
  planeId: string;
  point1Id: string;
  point2Id: string;
  segmentId?: string;
}

export interface AddSegment2DByPointsOutput extends JsonObject {
  segmentId?: string;
}

export class AddSegment2DByPointsOp implements IOperation<AddSegment2DByPointsDescriptor, AddSegment2DByPointsOutput> {
  readonly type = 'AddSegment2DByPoints';
  outputs: AddSegment2DByPointsOutput = {};

  constructor(
    private planeId: string,
    private point1Id: string,
    private point2Id: string
  ) {
  }

  apply(world: World): OperationResult<AddSegment2DByPointsOutput> {
    try {
      const plane = world.getProjectionPlaneById(this.planeId);
      if (!plane) {
        throw new Error(`Plane not found: ${this.planeId}`);
      }
      
      const segment = world.getConstructionService().addSegment2DBetweenPoints(
        plane,
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
      const plane = world.getProjectionPlaneById(this.planeId);
      if (plane) {
        removeLineFromPlane(world, plane, this.outputs.segmentId);
      }
    }
  }

  serialize(): AddSegment2DByPointsDescriptor {
    return {
      opType: this.type,
      planeId: this.planeId,
      point1Id: this.point1Id,
      point2Id: this.point2Id,
      segmentId: this.outputs.segmentId
    };
  }
}

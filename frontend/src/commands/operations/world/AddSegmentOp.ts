/**
 * AddSegment2DByPointsOp - Operation to add a Segment2D using ProjectionConstructionService
 * 
 * Wraps ProjectionConstructionService.addSegment2DBetweenPoints() in the Operation interface.
 */

import type { IOperation, JsonObject, OperationDescriptor, OperationResult } from '../IOperation';
import type { OperationContext } from '../OperationContext';
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

  apply(context: OperationContext): OperationResult<AddSegment2DByPointsOutput> {
    try {
      const plane = context.world.getProjectionPlaneById(this.planeId);
      if (!plane) {
        throw new Error(`Plane not found: ${this.planeId}`);
      }
      
      const segment = context.projectionConstruction.addSegment2DBetweenPoints(
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

  undo(context: OperationContext): void {
    if (this.outputs.segmentId) {
      const plane = context.world.getProjectionPlaneById(this.planeId);
      if (plane) {
        removeLineFromPlane(context, plane, this.outputs.segmentId);
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

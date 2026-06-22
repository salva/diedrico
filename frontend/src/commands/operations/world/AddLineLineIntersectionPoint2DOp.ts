/**
 * AddLineLineIntersectionPoint2DOp - Operation to add a Point2DLineLineIntersection
 * 
 * Wraps ProjectionConstructionService.addLineLineIntersection() in the Operation interface.
 * 
 * Note: Sibling point creation for HalfHingeLine2D intersections is handled automatically
 * by the domain logic, not by this operation.
 */

import type { IOperation, JsonObject, OperationDescriptor, OperationResult } from '../IOperation';
import type { OperationContext } from '../OperationContext';
import { removePointFromPlane, requireProjectionPlane } from './operationHelpers';

export interface AddLineLineIntersectionPoint2DDescriptor extends OperationDescriptor<'AddLineLineIntersectionPoint2D'> {
  planeId: string;
  line1Id: string;
  line2Id: string;
  pointId?: string;
}

export interface AddLineLineIntersectionPoint2DOutput extends JsonObject {
  pointId?: string;
}

export class AddLineLineIntersectionPoint2DOp implements IOperation<AddLineLineIntersectionPoint2DDescriptor, AddLineLineIntersectionPoint2DOutput> {
  readonly type = 'AddLineLineIntersectionPoint2D';
  outputs: AddLineLineIntersectionPoint2DOutput = {};

  constructor(
    private planeId: string,
    private line1Id: string,
    private line2Id: string
  ) {
  }

  apply(context: OperationContext): OperationResult<AddLineLineIntersectionPoint2DOutput> {
    try {
      const plane = requireProjectionPlane(context.world, this.planeId);
      
      const point = context.projectionConstruction.addLineLineIntersection(
        plane,
        this.line1Id,
        this.line2Id,
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

  undo(context: OperationContext): void {
    // Remove primary point
    if (this.outputs.pointId) {
      const plane = context.world.getProjectionPlaneById(this.planeId);
      if (plane) removePointFromPlane(context, plane, this.outputs.pointId);
    }
    
    // Note: If sibling points exist, they should be removed by domain logic
    // via dependency tracking, not explicitly here
  }

  serialize(): AddLineLineIntersectionPoint2DDescriptor {
    return {
      opType: this.type,
      planeId: this.planeId,
      line1Id: this.line1Id,
      line2Id: this.line2Id,
      pointId: this.outputs.pointId
    };
  }
}

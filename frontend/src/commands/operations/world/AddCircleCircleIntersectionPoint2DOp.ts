/**
 * AddCircleCircleIntersectionPoint2DOp - Operation to add a Point2DCircleCircleIntersection
 * 
 * Wraps ProjectionConstructionService.addCircleCircleIntersection() in the Operation interface.
 * 
 * Note: Sibling point creation for HalfHingeLine2D intersections is handled automatically
 * by the domain logic, not by this operation.
 */

import type { IOperation, JsonObject, OperationDescriptor, OperationResult } from '../IOperation';
import type { OperationContext } from '../OperationContext';
import { removePointFromPlane } from './operationHelpers';

export interface AddCircleCircleIntersectionPoint2DDescriptor extends OperationDescriptor<'AddCircleCircleIntersectionPoint2D'> {
  planeId: string;
  circle1Id: string;
  circle2Id: string;
  index: number;
  pointId?: string;
}

export interface AddCircleCircleIntersectionPoint2DOutput extends JsonObject {
  pointId?: string;
}

export class AddCircleCircleIntersectionPoint2DOp implements IOperation<AddCircleCircleIntersectionPoint2DDescriptor, AddCircleCircleIntersectionPoint2DOutput> {
  readonly type = 'AddCircleCircleIntersectionPoint2D';
  outputs: AddCircleCircleIntersectionPoint2DOutput = {};

  constructor(
    private planeId: string,
    private circle1Id: string,
    private circle2Id: string,
    private index: number
  ) {
  }

  apply(context: OperationContext): OperationResult<AddCircleCircleIntersectionPoint2DOutput> {
    try {
      const plane = context.world.getProjectionPlaneById(this.planeId);
      if (!plane) {
        throw new Error(`Plane not found: ${this.planeId}`);
      }
      
      const point = context.projectionConstruction.addCircleCircleIntersection(
        plane,
        this.circle1Id,
        this.circle2Id,
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

  undo(context: OperationContext): void {
    // Remove primary point
    if (this.outputs.pointId) {
      const plane = context.world.getProjectionPlaneById(this.planeId);
      if (plane) {
        removePointFromPlane(context.world, plane, this.outputs.pointId);
      }
    }
    
    // Note: If sibling points exist, they should be removed by domain logic
    // via dependency tracking, not explicitly here
  }

  serialize(): AddCircleCircleIntersectionPoint2DDescriptor {
    return {
      opType: this.type,
      planeId: this.planeId,
      circle1Id: this.circle1Id,
      circle2Id: this.circle2Id,
      index: this.index,
      pointId: this.outputs.pointId
    };
  }
}

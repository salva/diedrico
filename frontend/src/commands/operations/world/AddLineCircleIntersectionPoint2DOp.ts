/**
 * AddLineCircleIntersectionPoint2DOp - Operation to add a Point2DLineCircleIntersection
 * 
 * Wraps ConstructionService.addLineCircleIntersection() in the Operation interface.
 * 
 * Note: Sibling point creation for HalfHingeLine2D intersections is handled automatically
 * by the domain logic, not by this operation.
 */

import type { IOperation, JsonObject, OperationDescriptor, OperationResult } from '../IOperation';
import type { World } from '@/domain/world/World';
import { removePointFromPlane } from './operationHelpers';

export interface AddLineCircleIntersectionPoint2DDescriptor extends OperationDescriptor<'AddLineCircleIntersectionPoint2D'> {
  planeId: string;
  lineId: string;
  circleId: string;
  index: number;
  pointId?: string;
}

export interface AddLineCircleIntersectionPoint2DOutput extends JsonObject {
  pointId?: string;
}

export class AddLineCircleIntersectionPoint2DOp implements IOperation<AddLineCircleIntersectionPoint2DDescriptor, AddLineCircleIntersectionPoint2DOutput> {
  readonly type = 'AddLineCircleIntersectionPoint2D';
  outputs: AddLineCircleIntersectionPoint2DOutput = {};

  constructor(
    private planeId: string,
    private lineId: string,
    private circleId: string,
    private index: number
  ) {
  }

  apply(world: World): OperationResult<AddLineCircleIntersectionPoint2DOutput> {
    try {
      const plane = world.getProjectionPlaneById(this.planeId);
      if (!plane) {
        throw new Error(`Plane not found: ${this.planeId}`);
      }
      
      const point = world.getConstructionService().addLineCircleIntersection(
        plane,
        this.lineId,
        this.circleId,
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
    // Remove primary point
    if (this.outputs.pointId) {
      const plane = world.getProjectionPlaneById(this.planeId);
      if (plane) {
        removePointFromPlane(world, plane, this.outputs.pointId);
      }
    }
    
    // Note: If sibling points exist, they should be removed by domain logic
    // via dependency tracking, not explicitly here
  }

  serialize(): AddLineCircleIntersectionPoint2DDescriptor {
    return {
      opType: this.type,
      planeId: this.planeId,
      lineId: this.lineId,
      circleId: this.circleId,
      index: this.index,
      pointId: this.outputs.pointId
    };
  }
}

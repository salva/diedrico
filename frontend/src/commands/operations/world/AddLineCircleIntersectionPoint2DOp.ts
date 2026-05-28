/**
 * AddLineCircleIntersectionPoint2DOp - Operation to add a Point2DLineCircleIntersection
 * 
 * Wraps ProjectionPlane.addLineCircleIntersection() in the Operation interface.
 * 
 * Note: Sibling point creation for HalfHingeLine2D intersections is handled automatically
 * by the domain logic, not by this operation.
 */

import type { IOperation, JsonObject, OperationDescriptor, OperationResult } from '../IOperation';
import type { World } from '@/domain/world/World';

interface LineCircleIntersectionOutput extends JsonObject {
  pointId?: string;
}

export class AddLineCircleIntersectionPoint2DOp implements IOperation<OperationDescriptor, LineCircleIntersectionOutput> {
  readonly type = 'AddLineCircleIntersectionPoint2D';
  outputs: LineCircleIntersectionOutput = {};

  constructor(
    private planeId: string,
    private lineId: string,
    private circleId: string,
    private index: number
  ) {
  }

  apply(world: World): OperationResult<LineCircleIntersectionOutput> {
    try {
      const plane = world.getProjectionPlaneById(this.planeId);
      if (!plane) {
        throw new Error(`Plane not found: ${this.planeId}`);
      }
      
      // Pass stored ID if available (for redo), otherwise let plane generate new one
      const point = plane.addLineCircleIntersection(
        this.lineId,
        this.circleId,
        this.index,
        world,
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
        plane.removePoint(this.outputs.pointId);
      }
    }
    
    // Note: If sibling points exist, they should be removed by domain logic
    // via dependency tracking, not explicitly here
  }

  serialize() {
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

/**
 * AddCircleCircleIntersectionPoint2DOp - Operation to add a Point2DCircleCircleIntersection
 * 
 * Wraps ProjectionPlane.addCircleCircleIntersection() in the Operation interface.
 * 
 * Note: Sibling point creation for HalfHingeLine2D intersections is handled automatically
 * by the domain logic, not by this operation.
 */

import type { IOperation, JsonObject, OperationDescriptor, OperationResult } from '../IOperation';
import type { World } from '@/domain/world/World';

interface CircleCircleIntersectionOutput extends JsonObject {
  pointId?: string;
}

export class AddCircleCircleIntersectionPoint2DOp implements IOperation<OperationDescriptor, CircleCircleIntersectionOutput> {
  readonly type = 'AddCircleCircleIntersectionPoint2D';
  outputs: CircleCircleIntersectionOutput = {};

  constructor(
    private planeId: string,
    private circle1Id: string,
    private circle2Id: string,
    private index: number
  ) {
  }

  apply(world: World): OperationResult<CircleCircleIntersectionOutput> {
    try {
      const plane = world.getProjectionPlaneById(this.planeId);
      if (!plane) {
        throw new Error(`Plane not found: ${this.planeId}`);
      }
      
      // Pass stored ID if available (for redo), otherwise let plane generate new one
      const point = plane.addCircleCircleIntersection(
        this.circle1Id,
        this.circle2Id,
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
      circle1Id: this.circle1Id,
      circle2Id: this.circle2Id,
      index: this.index,
      pointId: this.outputs.pointId
    };
  }
}

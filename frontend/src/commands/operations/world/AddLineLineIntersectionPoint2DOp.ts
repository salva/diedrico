/**
 * AddLineLineIntersectionPoint2DOp - Operation to add a Point2DLineLineIntersection
 * 
 * Wraps ProjectionPlane.addLineLineIntersection() in the Operation interface.
 * 
 * Note: Sibling point creation for HalfHingeLine2D intersections is handled automatically
 * by the domain logic, not by this operation.
 */

import type { IOperation, JsonObject, OperationDescriptor, OperationResult } from '../IOperation';
import type { World } from '@/domain/world/World';
import { requireProjectionPlane } from './operationHelpers';

interface LineLineIntersectionOutput extends JsonObject {
  pointId?: string;
}

export class AddLineLineIntersectionPoint2DOp implements IOperation<OperationDescriptor, LineLineIntersectionOutput> {
  readonly type = 'AddLineLineIntersectionPoint2D';
  outputs: LineLineIntersectionOutput = {};

  constructor(
    private planeId: string,
    private line1Id: string,
    private line2Id: string
  ) {
  }

  apply(world: World): OperationResult<LineLineIntersectionOutput> {
    try {
      const plane = requireProjectionPlane(world, this.planeId);
      
      // Pass stored ID if available (for redo), otherwise let plane generate new one
      const point = plane.addLineLineIntersection(
        this.line1Id,
        this.line2Id,
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
      world.getProjectionPlaneById(this.planeId)?.removePoint(this.outputs.pointId);
    }
    
    // Note: If sibling points exist, they should be removed by domain logic
    // via dependency tracking, not explicitly here
  }

  serialize() {
    return {
      opType: this.type,
      planeId: this.planeId,
      line1Id: this.line1Id,
      line2Id: this.line2Id,
      pointId: this.outputs.pointId
    };
  }
}

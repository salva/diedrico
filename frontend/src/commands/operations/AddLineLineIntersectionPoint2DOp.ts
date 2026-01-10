/**
 * AddLineLineIntersectionPoint2DOp - Operation to add a Point2DLineLineIntersection
 * 
 * Wraps ProjectionPlane.addLineLineIntersection() in the Operation interface.
 * 
 * Note: Sibling point creation for HalfHingeLine2D intersections is handled automatically
 * by the domain logic, not by this operation.
 */

import type { IOperation, OperationResult } from './IOperation';
import type { World } from '@/domain/world/World';

export class AddLineLineIntersectionPoint2DOp implements IOperation {
  readonly type = 'AddLineLineIntersectionPoint2D';
  readonly parameters: Record<string, any>;
  outputs: Record<string, any> = {};

  constructor(
    private planeId: string,
    private line1Id: string,
    private line2Id: string
  ) {
    this.parameters = { planeId, line1Id, line2Id };
  }

  apply(world: World): OperationResult {
    try {
      const plane = world.getProjectionPlaneById(this.planeId);
      if (!plane) {
        throw new Error(`Plane not found: ${this.planeId}`);
      }
      
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
      const plane = world.getProjectionPlaneById(this.planeId);
      if (plane) {
        plane.removePoint(this.outputs.pointId);
      }
    }
    
    // Note: If sibling points exist, they should be removed by domain logic
    // via dependency tracking, not explicitly here
  }
}

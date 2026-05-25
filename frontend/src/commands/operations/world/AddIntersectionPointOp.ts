/**
 * AddIntersectionPoint2DOp - Operation to add an IntersectionPoint2D using ProjectionPlane factory method
 * 
 * Wraps ProjectionPlane.addLineLineIntersection() in the Operation interface.
 * 
 * Note: Sibling point creation for HalfHingeLine2D intersections is handled automatically
 * by the domain logic, not by this operation.
 */

import type { IOperation, OperationResult } from '../IOperation';
import type { World } from '@/domain/world/World';

export class AddIntersectionPoint2DOp implements IOperation {
  readonly type = 'AddIntersectionPoint2D';
  readonly parameters: Record<string, any>;
  outputs: Record<string, any> = {};

  constructor(
    private planeId: string,
    private line1Id: string,
    private line2Id: string,
    private index: number  // Note: index parameter currently unused - line-line intersection has at most 1 point
  ) {
    this.parameters = { planeId, line1Id, line2Id, index };
  }

  apply(world: World): OperationResult {
    try {
      const plane = world.getProjectionPlaneById(this.planeId);
      if (!plane) {
        throw new Error(`Plane not found: ${this.planeId}`);
      }
      
      // Pass stored ID if available (for redo), otherwise let plane generate new one
      // Note: index is stored but not used - line-line intersection has at most 1 point
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

  serialize() {
    return {
      opType: this.type,
      planeId: this.parameters.planeId,
      element1Id: this.parameters.element1Id,
      element2Id: this.parameters.element2Id,
      index: this.parameters.index,
      pointId: this.outputs.pointId
    };
  }
}

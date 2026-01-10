/**
 * AddIntersectionPoint2DOp - Operation to add an IntersectionPoint2D using World factory method
 * 
 * Wraps World.addIntersectionPoint2DWithSibling() to automatically create sibling points
 * when intersecting with HalfHingeLine2D.
 */

import type { IOperation, OperationResult } from './IOperation';
import type { World } from '@/domain/world/World';

export class AddIntersectionPoint2DOp implements IOperation {
  readonly type = 'AddIntersectionPoint2D';
  readonly parameters: Record<string, any>;
  outputs: Record<string, any> = {};

  constructor(
    private planeId: string,
    private line1Id: string,
    private line2Id: string,
    private index: number
  ) {
    this.parameters = { planeId, line1Id, line2Id, index };
  }

  apply(world: World): OperationResult {
    try {
      // Use sibling-aware factory method
      // Pass stored IDs if available (for redo), otherwise let World generate new ones
      const result = world.addIntersectionPoint2DWithSibling(
        this.planeId,
        this.line1Id,
        this.line2Id,
        this.index,
        this.outputs.pointId,
        this.outputs.siblingPointId
      );
      
      this.outputs = { 
        pointId: result.primary.id,
        siblingPointId: result.sibling?.id
      };
      
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
    // Remove sibling first (if exists)
    if (this.outputs.siblingPointId) {
      const siblingPlaneId = this.planeId === 'proj_plane_H' ? 'proj_plane_V' : 'proj_plane_H';
      const siblingPlane = world.getProjectionPlaneById(siblingPlaneId);
      if (siblingPlane) {
        siblingPlane.removePoint(this.outputs.siblingPointId);
      }
    }
    
    // Remove primary
    if (this.outputs.pointId) {
      const plane = world.getProjectionPlaneById(this.planeId);
      if (plane) {
        plane.removePoint(this.outputs.pointId);
      }
    }
  }
}

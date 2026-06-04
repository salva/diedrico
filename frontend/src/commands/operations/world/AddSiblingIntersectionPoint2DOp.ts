import type { IOperation, JsonObject, OperationDescriptor, OperationResult } from '../IOperation';
import type { OperationContext } from '../OperationContext';
import { IntersectionPoint2D } from '@/domain/world/Point';
import { removePointFromPlane } from './operationHelpers';

/**
 * AddSiblingIntersectionPoint2DOp - Operation to add a sibling intersection point in the paired projection plane
 * 
 * When an element intersects with a HalfHingeLine2D, the intersection point represents a 3D point
 * that has projections on both planes. This operation creates the sibling intersection point
 * on the paired projection plane.
 * 
 * Architecture note: Sibling creation must be done at command level using specific ops,
 * not embedded in the world layer (as per architecture requirements).
 * 
 * Pattern: Follows the same architecture as AddSiblingGuide2DOp (Phase 36)
 * 
 * @see AddSiblingGuide2DOp for the sibling guide pattern
 * @see SiblingIntersectionPoint2D for the domain class
 * @see data-model.md §HalfHingeLine2D Intersection Sibling Behavior for architecture details
 */
export interface AddSiblingIntersectionPoint2DDescriptor extends OperationDescriptor<'AddSiblingIntersectionPoint2D'> {
  planeId: string;
  primaryIntersectionId: string;
  pointId?: string;
}

export interface AddSiblingIntersectionPoint2DOutput extends JsonObject {
  pointId?: string;
}

export class AddSiblingIntersectionPoint2DOp implements IOperation<AddSiblingIntersectionPoint2DDescriptor, AddSiblingIntersectionPoint2DOutput> {
  readonly type = 'AddSiblingIntersectionPoint2D';
  outputs: AddSiblingIntersectionPoint2DOutput = {};

  constructor(
    private planeId: string,
    private primaryIntersectionId: string
  ) {
  }

  apply(context: OperationContext): OperationResult<AddSiblingIntersectionPoint2DOutput> {
    try {
      const plane = context.world.getProjectionPlaneById(this.planeId);
      if (!plane) {
        throw new Error(`Plane not found: ${this.planeId}`);
      }
      
      const siblingPoint = context.constructionService.addSiblingIntersectionPoint(
        plane,
        this.primaryIntersectionId,
        this.outputs.pointId
      );
      this.outputs = { pointId: siblingPoint.id };
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
    if (this.outputs.pointId) {
      const plane = context.world.getProjectionPlaneById(this.planeId);
      if (plane) {
        removePointFromPlane(context.world, plane, this.outputs.pointId);
        
        // Unlink from primary - traverse all planes to find primary
        for (const projPlane of context.world.getAllProjectionPlanes()) {
          const primaryPoint = projPlane.getPoint(this.primaryIntersectionId);
          if (primaryPoint instanceof IntersectionPoint2D) {
            primaryPoint.siblingPointId = undefined;
            break;
          }
        }
      }
    }
  }

  serialize(): AddSiblingIntersectionPoint2DDescriptor {
    return {
      opType: this.type,
      planeId: this.planeId,
      primaryIntersectionId: this.primaryIntersectionId,
      pointId: this.outputs.pointId
    };
  }
}

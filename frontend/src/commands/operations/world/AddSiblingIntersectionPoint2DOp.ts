import type { IOperation, JsonObject, OperationDescriptor, OperationResult } from '../IOperation';
import type { World } from '@/domain/world/World';

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
interface SiblingIntersectionOutput extends JsonObject {
  pointId?: string;
}

export class AddSiblingIntersectionPoint2DOp implements IOperation<OperationDescriptor, SiblingIntersectionOutput> {
  readonly type = 'AddSiblingIntersectionPoint2D';
  outputs: SiblingIntersectionOutput = {};

  constructor(
    private planeId: string,
    private primaryIntersectionId: string
  ) {
  }

  apply(world: World): OperationResult<SiblingIntersectionOutput> {
    try {
      const plane = world.getProjectionPlaneById(this.planeId);
      if (!plane) {
        throw new Error(`Plane not found: ${this.planeId}`);
      }
      
      // Pass stored ID if available (for redo), otherwise let plane generate new one
      const siblingPoint = plane.addSiblingIntersectionPoint(
        this.primaryIntersectionId,
        world,
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

  undo(world: World): void {
    if (this.outputs.pointId) {
      const plane = world.getProjectionPlaneById(this.planeId);
      if (plane) {
        // Remove sibling point
        plane.removePoint(this.outputs.pointId);
        
        // Unlink from primary - traverse all planes to find primary
        for (const projPlane of world.projectionPlanes.values()) {
          const primaryPoint = projPlane.getPoint(this.primaryIntersectionId);
          if (primaryPoint && 'siblingPointId' in primaryPoint) {
            (primaryPoint as any).siblingPointId = undefined;
            break;
          }
        }
      }
    }
  }

  serialize() {
    return {
      opType: this.type,
      planeId: this.planeId,
      primaryIntersectionId: this.primaryIntersectionId,
      pointId: this.outputs.pointId
    };
  }
}

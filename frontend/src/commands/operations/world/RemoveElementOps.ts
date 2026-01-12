/**
 * RemoveElementOperations - Operations to remove geometric elements from World
 * 
 * These operations store complete element state for restoration during undo.
 * Each operation handles a specific element type (Point2D, Line2D, etc.).
 * 
 * Reference: specs/001-dihedral-learning-mvp/tasks.md Phase 30, T286
 */

import type { IOperation, OperationResult } from '../IOperation';
import type { World } from '@/domain/world/World';
import type { Point2D } from '@/domain/world/Point';
import type { Line2D } from '@/domain/world/Line';
import type { Segment2D } from '@/domain/world/Segment';
import type { Circle2D } from '@/domain/world/Circle';
import type { Guide2D } from '@/domain/world/Guide';

/**
 * RemovePoint2DOp - Remove a point from a projection plane
 * 
 * Stores the complete Point2D state for undo restoration.
 * Uses World's removePoint2D and addPoint2D methods.
 */
export class RemovePoint2DOp implements IOperation {
  readonly type = 'RemovePoint2D';
  readonly parameters: Record<string, any>;
  outputs: Record<string, any> = {};
  
  // Stored element data for undo
  private removedPoint?: Point2D;

  constructor(
    private planeId: string,
    private pointId: string
  ) {
    this.parameters = { planeId, pointId };
  }

  apply(world: World): OperationResult {
    try {
      // Store element before removal for undo - get from plane
      const plane = world.projectionPlanes.get(this.planeId);
      if (!plane) {
        return {
          success: false,
          outputs: {},
          error: `Plane ${this.planeId} not found`
        };
      }
      
      this.removedPoint = plane.getPoint(this.pointId);
      if (!this.removedPoint) {
        return {
          success: false,
          outputs: {},
          error: `Point ${this.pointId} not found`
        };
      }

      // Remove the point from the plane
      const removed = plane.removePoint(this.pointId);
      if (!removed) {
        return {
          success: false,
          outputs: {},
          error: `Failed to remove point ${this.pointId}`
        };
      }
      
      this.outputs = { removedPointId: this.pointId };
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
    if (!this.removedPoint) {
      throw new Error('Cannot undo: no point data stored');
    }

    // Restore the point by adding it back to the plane
    const plane = world.projectionPlanes.get(this.planeId);
    if (!plane) {
      throw new Error(`Plane ${this.planeId} not found`);
    }
    plane.addPoint(this.removedPoint);
  }
}

/**
 * RemoveLine2DOp - Remove a line from a projection plane
 * 
 * Stores the complete Line2D state for undo restoration.
 */
export class RemoveLine2DOp implements IOperation {
  readonly type = 'RemoveLine2D';
  readonly parameters: Record<string, any>;
  outputs: Record<string, any> = {};
  
  private removedLine?: Line2D;

  constructor(
    private planeId: string,
    private lineId: string
  ) {
    this.parameters = { planeId, lineId };
  }

  apply(world: World): OperationResult {
    try {
      // Get from plane for undo storage
      const plane = world.projectionPlanes.get(this.planeId);
      if (!plane) {
        return {
          success: false,
          outputs: {},
          error: `Plane ${this.planeId} not found`
        };
      }
      
      this.removedLine = plane.getLine(this.lineId);
      if (!this.removedLine) {
        return {
          success: false,
          outputs: {},
          error: `Line ${this.lineId} not found`
        };
      }

      // Remove the line from the plane
      const removed = plane.removeLine(this.lineId);
      if (!removed) {
        return {
          success: false,
          outputs: {},
          error: `Failed to remove line ${this.lineId}`
        };
      }
      
      this.outputs = { removedLineId: this.lineId };
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
    if (!this.removedLine) {
      throw new Error('Cannot undo: no line data stored');
    }

    // Restore the line by adding it back to the plane
    const plane = world.projectionPlanes.get(this.planeId);
    if (!plane) {
      throw new Error(`Plane ${this.planeId} not found`);
    }
    plane.addLine(this.removedLine);
  }
}

/**
 * RemoveSegment2DOp - Remove a segment from a projection plane
 */
export class RemoveSegment2DOp implements IOperation {
  readonly type = 'RemoveSegment2D';
  readonly parameters: Record<string, any>;
  outputs: Record<string, any> = {};
  
  private removedSegment?: Segment2D;

  constructor(
    private planeId: string,
    private segmentId: string
  ) {
    this.parameters = { planeId, segmentId };
  }

  apply(world: World): OperationResult {
    try {
      // Get from plane for undo storage
      const plane = world.projectionPlanes.get(this.planeId);
      if (!plane) {
        return {
          success: false,
          outputs: {},
          error: `Plane ${this.planeId} not found`
        };
      }
      
      const line = plane.getLine(this.segmentId);
      this.removedSegment = line && line.type === 'segment' ? line as Segment2D : undefined;
      if (!this.removedSegment) {
        return {
          success: false,
          outputs: {},
          error: `Segment ${this.segmentId} not found`
        };
      }

      // Remove the segment from the plane (segments are stored as lines)
      const removed = plane.removeLine(this.segmentId);
      if (!removed) {
        return {
          success: false,
          outputs: {},
          error: `Failed to remove segment ${this.segmentId}`
        };
      }
      
      this.outputs = { removedSegmentId: this.segmentId };
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
    if (!this.removedSegment) {
      throw new Error('Cannot undo: no segment data stored');
    }

    // Restore the segment by adding it back to the plane as a line
    const plane = world.projectionPlanes.get(this.planeId);
    if (!plane) {
      throw new Error(`Plane ${this.planeId} not found`);
    }
    plane.addLine(this.removedSegment);
  }
}

/**
 * RemoveCircle2DOp - Remove a circle from a projection plane
 */
export class RemoveCircle2DOp implements IOperation {
  readonly type = 'RemoveCircle2D';
  readonly parameters: Record<string, any>;
  outputs: Record<string, any> = {};
  
  private removedCircle?: Circle2D;

  constructor(
    private planeId: string,
    private circleId: string
  ) {
    this.parameters = { planeId, circleId };
  }

  apply(world: World): OperationResult {
    try {
      // Get from plane for undo storage
      const plane = world.projectionPlanes.get(this.planeId);
      if (!plane) {
        return {
          success: false,
          outputs: {},
          error: `Plane ${this.planeId} not found`
        };
      }
      
      this.removedCircle = plane.getCircle(this.circleId);
      if (!this.removedCircle) {
        return {
          success: false,
          outputs: {},
          error: `Circle ${this.circleId} not found`
        };
      }

      // Remove the circle from the plane
      const removed = plane.removeCircle(this.circleId);
      if (!removed) {
        return {
          success: false,
          outputs: {},
          error: `Failed to remove circle ${this.circleId}`
        };
      }
      
      this.outputs = { removedCircleId: this.circleId };
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
    if (!this.removedCircle) {
      throw new Error('Cannot undo: no circle data stored');
    }

    // Restore the circle by adding it back to the plane
    const plane = world.projectionPlanes.get(this.planeId);
    if (!plane) {
      throw new Error(`Plane ${this.planeId} not found`);
    }
    plane.addCircle(this.removedCircle);
  }
}

/**
 * RemoveGuide2DOp - Remove a guide from a projection plane
 * 
 * Handles sibling guide deletion cascade:
 * - If deleting SiblingGuide2D → redirects to delete primary guide instead
 * - If deleting Guide2D with sibling → also deletes the sibling guide
 * 
 * Architecture: Sibling objects must be deleted in pairs, with deletion always
 * redirected to the primary object (as per architecture requirements).
 */
export class RemoveGuide2DOp implements IOperation {
  readonly type = 'RemoveGuide2D';
  readonly parameters: Record<string, any>;
  outputs: Record<string, any> = {};
  
  private removedGuide?: Guide2D;
  private removedSibling?: import('@/domain/world/Guide').SiblingGuide2D;
  private siblingPlaneId?: string;

  constructor(
    private planeId: string,
    private guideId: string
  ) {
    this.parameters = { planeId, guideId };
  }

  apply(world: World): OperationResult {
    try {
      // Get from plane for undo storage
      const plane = world.projectionPlanes.get(this.planeId);
      if (!plane) {
        return {
          success: false,
          outputs: {},
          error: `Plane ${this.planeId} not found`
        };
      }

      const guide = plane.getGuide(this.guideId);
      if (!guide) {
        return {
          success: false,
          outputs: {},
          error: `Guide ${this.guideId} not found`
        };
      }

      // Check if this is a SiblingGuide2D → redirect to delete primary
      const { isSiblingGuide2D } = require('@/domain/world/Guide');
      if (isSiblingGuide2D(guide)) {
        const siblingGuide = guide as import('@/domain/world/Guide').SiblingGuide2D;
        console.warn(`[RemoveGuide2DOp] Cannot delete sibling guide ${this.guideId} directly. Redirect to delete primary guide ${siblingGuide.primaryGuideId} instead.`);
        return {
          success: false,
          outputs: {},
          error: `Cannot delete sibling guide directly. Delete primary guide ${siblingGuide.primaryGuideId} instead.`
        };
      }

      // This is a primary Guide2D - proceed with deletion
      this.removedGuide = guide as Guide2D;

      // Check if it has a sibling → delete sibling first
      if ('siblingGuideId' in this.removedGuide && (this.removedGuide as any).siblingGuideId) {
        const siblingGuideId = (this.removedGuide as any).siblingGuideId;
        
        // Find sibling's plane and delete sibling
        const siblingGuide = world.getLine2D(siblingGuideId);
        if (siblingGuide) {
          const siblingPlane = world.getProjectionPlaneById(siblingGuide.planeId);
          if (siblingPlane) {
            this.siblingPlaneId = siblingGuide.planeId;
            this.removedSibling = siblingGuide as import('@/domain/world/Guide').SiblingGuide2D;
            
            // Remove sibling guide
            const siblingRemoved = siblingPlane.removeGuide(siblingGuideId);
            if (!siblingRemoved) {
              console.warn(`[RemoveGuide2DOp] Failed to remove sibling guide ${siblingGuideId}`);
            } else {
              console.log(`[RemoveGuide2DOp] Removed sibling guide ${siblingGuideId} from plane ${this.siblingPlaneId}`);
            }
          }
        }
      }

      // Remove the primary guide from the plane
      const removed = plane.removeGuide(this.guideId);
      if (!removed) {
        // If primary removal failed but sibling was removed, restore sibling
        if (this.removedSibling && this.siblingPlaneId) {
          const siblingPlane = world.getProjectionPlaneById(this.siblingPlaneId);
          if (siblingPlane) {
            siblingPlane.guides.set(this.removedSibling.id, this.removedSibling);
          }
        }
        return {
          success: false,
          outputs: {},
          error: `Failed to remove guide ${this.guideId}`
        };
      }
      
      this.outputs = { 
        removedGuideId: this.guideId,
        removedSiblingId: this.removedSibling?.id
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
    if (!this.removedGuide) {
      throw new Error('Cannot undo: no guide data stored');
    }

    // Restore the primary guide
    const plane = world.projectionPlanes.get(this.planeId);
    if (!plane) {
      throw new Error(`Plane ${this.planeId} not found`);
    }
    if (!plane.guides.has(this.removedGuide.id)) {
      plane.guides.set(this.removedGuide.id, this.removedGuide);
    }

    // Restore the sibling guide if it was deleted
    if (this.removedSibling && this.siblingPlaneId) {
      const siblingPlane = world.projectionPlanes.get(this.siblingPlaneId);
      if (siblingPlane && !siblingPlane.guides.has(this.removedSibling.id)) {
        siblingPlane.guides.set(this.removedSibling.id, this.removedSibling);
      }
    }
  }
}

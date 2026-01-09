/**
 * RemoveElementOperations - Operations to remove geometric elements from World
 * 
 * These operations store complete element state for restoration during undo.
 * Each operation handles a specific element type (Point2D, Line2D, etc.).
 * 
 * Reference: specs/001-dihedral-learning-mvp/tasks.md Phase 30, T286
 */

import type { IOperation, OperationResult } from './IOperation';
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
      // Store element before removal for undo
      this.removedPoint = world.getPoint2DById(this.pointId);
      
      if (!this.removedPoint) {
        return {
          success: false,
          outputs: {},
          error: `Point ${this.pointId} not found`
        };
      }

      // Remove the point
      world.removePoint2D(this.planeId, this.pointId);
      
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

    // Restore the point using the stored object
    // World's internal maps will re-add it with the same ID
    world.restorePoint2D(this.planeId, this.removedPoint);
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
      this.removedLine = world.getLine2DById(this.lineId);
      
      if (!this.removedLine) {
        return {
          success: false,
          outputs: {},
          error: `Line ${this.lineId} not found`
        };
      }

      world.removeLine2D(this.planeId, this.lineId);
      
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

    world.restoreLine2D(this.planeId, this.removedLine);
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
      this.removedSegment = world.getSegment2DById(this.segmentId);
      
      if (!this.removedSegment) {
        return {
          success: false,
          outputs: {},
          error: `Segment ${this.segmentId} not found`
        };
      }

      world.removeSegment2D(this.planeId, this.segmentId);
      
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

    world.restoreSegment2D(this.planeId, this.removedSegment);
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
      this.removedCircle = world.getCircle2DById(this.circleId);
      
      if (!this.removedCircle) {
        return {
          success: false,
          outputs: {},
          error: `Circle ${this.circleId} not found`
        };
      }

      world.removeCircle2D(this.planeId, this.circleId);
      
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

    world.restoreCircle2D(this.planeId, this.removedCircle);
  }
}

/**
 * RemoveGuide2DOp - Remove a guide from a projection plane
 */
export class RemoveGuide2DOp implements IOperation {
  readonly type = 'RemoveGuide2D';
  readonly parameters: Record<string, any>;
  outputs: Record<string, any> = {};
  
  private removedGuide?: Guide2D;

  constructor(
    private planeId: string,
    private guideId: string
  ) {
    this.parameters = { planeId, guideId };
  }

  apply(world: World): OperationResult {
    try {
      this.removedGuide = world.getGuide2DById(this.guideId);
      
      if (!this.removedGuide) {
        return {
          success: false,
          outputs: {},
          error: `Guide ${this.guideId} not found`
        };
      }

      world.removeGuide2D(this.planeId, this.guideId);
      
      this.outputs = { removedGuideId: this.guideId };
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

    world.restoreGuide2D(this.planeId, this.removedGuide);
  }
}

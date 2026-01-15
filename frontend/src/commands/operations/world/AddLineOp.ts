/**
 * AddLine2DByTwoPointsOp - Operation to add a Line2DByTwoPoints using ProjectionPlane factory method
 * 
 * Wraps ProjectionPlane.addLine2DBetweenTwoPoints() in the Operation interface.
 */

import type { IOperation, OperationResult } from '../IOperation';
import type { World } from '@/domain/world/World';

export class AddLine2DByTwoPointsOp implements IOperation {
  readonly type = 'AddLine2DByTwoPoints';
  readonly parameters: Record<string, any>;
  outputs: Record<string, any> = {};

  constructor(
    private planeId: string,
    private point1Id: string,
    private point2Id: string
  ) {
    this.parameters = { planeId, point1Id, point2Id };
  }

  apply(world: World): OperationResult {
    try {
      const plane = world.getProjectionPlaneById(this.planeId);
      if (!plane) {
        throw new Error(`Plane not found: ${this.planeId}`);
      }
      
      // Pass stored ID if available (for redo), otherwise let plane generate new one
      const line = plane.addLine2DBetweenTwoPoints(
        this.point1Id,
        this.point2Id,
        world,
        this.outputs.lineId
      );
      this.outputs = { lineId: line.id };
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
    if (this.outputs.lineId) {
      const plane = world.getProjectionPlaneById(this.planeId);
      if (plane) {
        plane.removeLine(this.outputs.lineId);
      }
    }
  }
}

/**
 * AddLine2DParallelToLineOp - Operation to add a Line2DParallel using ProjectionPlane factory method
 * 
 * Wraps ProjectionPlane.addLine2DParallelToLine() in the Operation interface.
 */
export class AddLine2DParallelToLineOp implements IOperation {
  readonly type = 'AddLine2DParallelToLine';
  readonly parameters: Record<string, any>;
  outputs: Record<string, any> = {};

  constructor(
    private planeId: string,
    private referenceLineId: string,
    private throughPointId: string
  ) {
    this.parameters = { planeId, referenceLineId, throughPointId };
  }

  apply(world: World): OperationResult {
    try {
      const plane = world.getProjectionPlaneById(this.planeId);
      if (!plane) {
        throw new Error(`Plane not found: ${this.planeId}`);
      }
      
      // Pass stored ID if available (for redo), otherwise let plane generate new one
      const line = plane.addLine2DParallelToLine(
        this.referenceLineId,
        this.throughPointId,
        world,
        this.outputs.lineId
      );
      this.outputs = { lineId: line.id };
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
    if (this.outputs.lineId) {
      const plane = world.getProjectionPlaneById(this.planeId);
      if (plane) {
        plane.removeLine(this.outputs.lineId);
      }
    }
  }
}

/**
 * AddLine2DPerpendicularToLineOp - Operation to add a Line2DPerpendicularToLine using ProjectionPlane factory method
 * 
 * Wraps ProjectionPlane.addLine2DPerpendicularToLine() in the Operation interface.
 */
export class AddLine2DPerpendicularToLineOp implements IOperation {
  readonly type = 'AddLine2DPerpendicularToLine';
  readonly parameters: Record<string, any>;
  outputs: Record<string, any> = {};

  constructor(
    private planeId: string,
    private referenceLineId: string,
    private throughPointId: string
  ) {
    this.parameters = { planeId, referenceLineId, throughPointId };
  }

  apply(world: World): OperationResult {
    try {
      const plane = world.getProjectionPlaneById(this.planeId);
      if (!plane) {
        throw new Error(`Plane not found: ${this.planeId}`);
      }
      
      // Pass stored ID if available (for redo), otherwise let plane generate new one
      const line = plane.addLine2DPerpendicularToLine(
        this.referenceLineId,
        this.throughPointId,
        world,
        this.outputs.lineId
      );
      this.outputs = { lineId: line.id };
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
    if (this.outputs.lineId) {
      const plane = world.getProjectionPlaneById(this.planeId);
      if (plane) {
        plane.removeLine(this.outputs.lineId);
      }
    }
  }
}
/**
 * AddLine2DTangentToCircleThroughPointOp - Operation to add a Line2DTangentToCircleThroughPoint using ProjectionPlane factory method
 * 
 * Phase 60: Tangent line to circle through external point
 * Wraps ProjectionPlane.addLine2DTangentToCircleThroughPoint() in the Operation interface.
 */
export class AddLine2DTangentToCircleThroughPointOp implements IOperation {
  readonly type = 'AddLine2DTangentToCircleThroughPoint';
  readonly parameters: Record<string, any>;
  outputs: Record<string, any> = {};

  constructor(
    private planeId: string,
    private circleId: string,
    private throughPointId: string,
    private tangentIndex: 0 | 1
  ) {
    this.parameters = { planeId, circleId, throughPointId, tangentIndex };
  }

  apply(world: World): OperationResult {
    try {
      const plane = world.getProjectionPlaneById(this.planeId);
      if (!plane) {
        throw new Error(`Plane not found: ${this.planeId}`);
      }
      
      // Pass stored ID if available (for redo), otherwise let plane generate new one
      const line = plane.addLine2DTangentToCircleThroughPoint(
        this.circleId,
        this.throughPointId,
        this.tangentIndex,
        world,
        this.outputs.lineId
      );
      this.outputs = { lineId: line.id };
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
    if (this.outputs.lineId) {
      const plane = world.getProjectionPlaneById(this.planeId);
      if (plane) {
        plane.removeLine(this.outputs.lineId);
      }
    }
  }
}

/**
 * AddLine2DTangentToCircleParallelToLineOp - Operation to add a Line2DTangentToCircleParallelToLine using ProjectionPlane factory method
 * 
 * Phase 61: Tangent line to circle parallel to reference line
 * Wraps ProjectionPlane.addLine2DTangentToCircleParallelToLine() in the Operation interface.
 */
export class AddLine2DTangentToCircleParallelToLineOp implements IOperation {
  readonly type = 'AddLine2DTangentToCircleParallelToLine';
  readonly parameters: Record<string, any>;
  outputs: Record<string, any> = {};

  constructor(
    private planeId: string,
    private circleId: string,
    private referenceLineId: string,
    private tangentIndex: 0 | 1
  ) {
    this.parameters = { planeId, circleId, referenceLineId, tangentIndex };
  }

  apply(world: World): OperationResult {
    try {
      const plane = world.getProjectionPlaneById(this.planeId);
      if (!plane) {
        throw new Error(`Plane not found: ${this.planeId}`);
      }
      
      // Pass stored ID if available (for redo), otherwise let plane generate new one
      const line = plane.addLine2DTangentToCircleParallelToLine(
        this.circleId,
        this.referenceLineId,
        this.tangentIndex,
        world,
        this.outputs.lineId
      );
      this.outputs = { lineId: line.id };
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
    if (this.outputs.lineId) {
      const plane = world.getProjectionPlaneById(this.planeId);
      if (plane) {
        plane.removeLine(this.outputs.lineId);
      }
    }
  }
}
/**
 * AddLine2DCircleToCircleExternalOp - Operation to add external tangent between two circles (Phase 73)
 * 
 * Wraps ProjectionPlane.addLine2DCircleToCircleExternal() in the Operation interface.
 */
export class AddLine2DCircleToCircleExternalOp implements IOperation {
  readonly type = 'AddLine2DCircleToCircleExternal';
  readonly parameters: Record<string, any>;
  outputs: Record<string, any> = {};

  constructor(
    private planeId: string,
    private circle1Id: string,
    private circle2Id: string,
    private tangentIndex: 0 | 1
  ) {
    this.parameters = { planeId, circle1Id, circle2Id, tangentIndex };
  }

  apply(world: World): OperationResult {
    try {
      const plane = world.getProjectionPlaneById(this.planeId);
      if (!plane) {
        throw new Error(`Plane not found: ${this.planeId}`);
      }
      
      const line = plane.addLine2DCircleToCircleExternal(
        this.circle1Id,
        this.circle2Id,
        this.tangentIndex,
        world,
        this.outputs.lineId
      );
      this.outputs = { lineId: line.id };
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
    if (this.outputs.lineId) {
      const plane = world.getProjectionPlaneById(this.planeId);
      if (plane) {
        plane.removeLine(this.outputs.lineId);
      }
    }
  }
}

/**
 * AddLine2DCircleToCircleInternalOp - Operation to add internal tangent between two circles (Phase 73)
 * 
 * Wraps ProjectionPlane.addLine2DCircleToCircleInternal() in the Operation interface.
 */
export class AddLine2DCircleToCircleInternalOp implements IOperation {
  readonly type = 'AddLine2DCircleToCircleInternal';
  readonly parameters: Record<string, any>;
  outputs: Record<string, any> = {};

  constructor(
    private planeId: string,
    private circle1Id: string,
    private circle2Id: string,
    private tangentIndex: 0 | 1
  ) {
    this.parameters = { planeId, circle1Id, circle2Id, tangentIndex };
  }

  apply(world: World): OperationResult {
    try {
      const plane = world.getProjectionPlaneById(this.planeId);
      if (!plane) {
        throw new Error(`Plane not found: ${this.planeId}`);
      }
      
      const line = plane.addLine2DCircleToCircleInternal(
        this.circle1Id,
        this.circle2Id,
        this.tangentIndex,
        world,
        this.outputs.lineId
      );
      this.outputs = { lineId: line.id };
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
    if (this.outputs.lineId) {
      const plane = world.getProjectionPlaneById(this.planeId);
      if (plane) {
        plane.removeLine(this.outputs.lineId);
      }
    }
  }
}

/**
 * AddLine2DCircleToCirclePerpendicularOp - Operation to add perpendicular between two circles (Phase 73)
 * 
 * Wraps ProjectionPlane.addLine2DCircleToCirclePerpendicular() in the Operation interface.
 */
export class AddLine2DCircleToCirclePerpendicularOp implements IOperation {
  readonly type = 'AddLine2DCircleToCirclePerpendicular';
  readonly parameters: Record<string, any>;
  outputs: Record<string, any> = {};

  constructor(
    private planeId: string,
    private circle1Id: string,
    private circle2Id: string
  ) {
    this.parameters = { planeId, circle1Id, circle2Id };
  }

  apply(world: World): OperationResult {
    try {
      const plane = world.getProjectionPlaneById(this.planeId);
      if (!plane) {
        throw new Error(`Plane not found: ${this.planeId}`);
      }
      
      const line = plane.addLine2DCircleToCirclePerpendicular(
        this.circle1Id,
        this.circle2Id,
        world,
        this.outputs.lineId
      );
      this.outputs = { lineId: line.id };
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
    if (this.outputs.lineId) {
      const plane = world.getProjectionPlaneById(this.planeId);
      if (plane) {
        plane.removeLine(this.outputs.lineId);
      }
    }
  }
}

/**
 * AddLine2DCircleToCircleThroughCentersOp - Operation to add through-centers line (Phase 73)
 * 
 * Wraps ProjectionPlane.addLine2DCircleToCircleThroughCenters() in the Operation interface.
 */
export class AddLine2DCircleToCircleThroughCentersOp implements IOperation {
  readonly type = 'AddLine2DCircleToCircleThroughCenters';
  readonly parameters: Record<string, any>;
  outputs: Record<string, any> = {};

  constructor(
    private planeId: string,
    private circle1Id: string,
    private circle2Id: string
  ) {
    this.parameters = { planeId, circle1Id, circle2Id };
  }

  apply(world: World): OperationResult {
    try {
      const plane = world.getProjectionPlaneById(this.planeId);
      if (!plane) {
        throw new Error(`Plane not found: ${this.planeId}`);
      }
      
      const line = plane.addLine2DCircleToCircleThroughCenters(
        this.circle1Id,
        this.circle2Id,
        world,
        this.outputs.lineId
      );
      this.outputs = { lineId: line.id };
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
    if (this.outputs.lineId) {
      const plane = world.getProjectionPlaneById(this.planeId);
      if (plane) {
        plane.removeLine(this.outputs.lineId);
      }
    }
  }
}

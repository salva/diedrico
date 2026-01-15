/**
 * AddSegment2DByPointsOp - Operation to add a Segment2DByPoints using ProjectionPlane factory method
 * 
 * Wraps ProjectionPlane.addSegment2DBetweenPoints() in the Operation interface.
 */

import type { IOperation, OperationResult } from '../IOperation';
import type { World } from '@/domain/world/World';

export class AddSegment2DByPointsOp implements IOperation {
  readonly type = 'AddSegment2DByPoints';
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
      const segment = plane.addSegment2DBetweenPoints(
        this.point1Id,
        this.point2Id,
        world,
        this.outputs.segmentId
      );
      this.outputs = { segmentId: segment.id };
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
    if (this.outputs.segmentId) {
      const plane = world.getProjectionPlaneById(this.planeId);
      if (plane) {
        // Segments are stored in the lines Map
        plane.removeLine(this.outputs.segmentId);
      }
    }
  }
}

/**
 * AddSegment2DPointToLineOp - Operation to add perpendicular segment from point to line
 * 
 * Phase 74 - FR-056: Polymorphic Segment Tool
 */
export class AddSegment2DPointToLineOp implements IOperation {
  readonly type = 'AddSegment2DPointToLine';
  readonly parameters: Record<string, any>;
  outputs: Record<string, any> = {};

  constructor(
    private planeId: string,
    private pointId: string,
    private lineId: string
  ) {
    this.parameters = { planeId, pointId, lineId };
  }

  apply(world: World): OperationResult {
    try {
      const plane = world.getProjectionPlaneById(this.planeId);
      if (!plane) {
        throw new Error(`Plane not found: ${this.planeId}`);
      }
      
      const segment = plane.addSegment2DPointToLine(
        this.pointId,
        this.lineId,
        world,
        this.outputs.segmentId
      );
      this.outputs = { segmentId: segment.id };
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
    if (this.outputs.segmentId) {
      const plane = world.getProjectionPlaneById(this.planeId);
      if (plane) {
        plane.removeLine(this.outputs.segmentId);
      }
    }
  }
}

/**
 * AddSegment2DPointToCircleTangentOp - Operation to add tangent segment from point to circle
 * 
 * Phase 74 - FR-056: Polymorphic Segment Tool
 */
export class AddSegment2DPointToCircleTangentOp implements IOperation {
  readonly type = 'AddSegment2DPointToCircleTangent';
  readonly parameters: Record<string, any>;
  outputs: Record<string, any> = {};

  constructor(
    private planeId: string,
    private pointId: string,
    private circleId: string,
    private tangentIndex: 0 | 1
  ) {
    this.parameters = { planeId, pointId, circleId, tangentIndex };
  }

  apply(world: World): OperationResult {
    try {
      const plane = world.getProjectionPlaneById(this.planeId);
      if (!plane) {
        throw new Error(`Plane not found: ${this.planeId}`);
      }
      
      const segment = plane.addSegment2DPointToCircleTangent(
        this.pointId,
        this.circleId,
        this.tangentIndex,
        world,
        this.outputs.segmentId
      );
      this.outputs = { segmentId: segment.id };
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
    if (this.outputs.segmentId) {
      const plane = world.getProjectionPlaneById(this.planeId);
      if (plane) {
        plane.removeLine(this.outputs.segmentId);
      }
    }
  }
}

/**
 * AddSegment2DCircleToCircleExternalOp - Operation to add external tangent segment between circles
 * 
 * Phase 74 - FR-056: Polymorphic Segment Tool
 */
export class AddSegment2DCircleToCircleExternalOp implements IOperation {
  readonly type = 'AddSegment2DCircleToCircleExternal';
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
      
      const segment = plane.addSegment2DCircleToCircleExternal(
        this.circle1Id,
        this.circle2Id,
        this.tangentIndex,
        world,
        this.outputs.segmentId
      );
      this.outputs = { segmentId: segment.id };
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
    if (this.outputs.segmentId) {
      const plane = world.getProjectionPlaneById(this.planeId);
      if (plane) {
        plane.removeLine(this.outputs.segmentId);
      }
    }
  }
}

/**
 * AddSegment2DCircleToCircleInternalOp - Operation to add internal tangent segment between circles
 * 
 * Phase 74 - FR-056: Polymorphic Segment Tool
 */
export class AddSegment2DCircleToCircleInternalOp implements IOperation {
  readonly type = 'AddSegment2DCircleToCircleInternal';
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
      
      const segment = plane.addSegment2DCircleToCircleInternal(
        this.circle1Id,
        this.circle2Id,
        this.tangentIndex,
        world,
        this.outputs.segmentId
      );
      this.outputs = { segmentId: segment.id };
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
    if (this.outputs.segmentId) {
      const plane = world.getProjectionPlaneById(this.planeId);
      if (plane) {
        plane.removeLine(this.outputs.segmentId);
      }
    }
  }
}

/**
 * AddSegment2DCircleToCirclePerpendicularOp - Operation to add perpendicular segment between circles
 * 
 * Phase 74 - FR-056: Polymorphic Segment Tool
 */
export class AddSegment2DCircleToCirclePerpendicularOp implements IOperation {
  readonly type = 'AddSegment2DCircleToCirclePerpendicular';
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
      
      const segment = plane.addSegment2DCircleToCirclePerpendicular(
        this.circle1Id,
        this.circle2Id,
        world,
        this.outputs.segmentId
      );
      this.outputs = { segmentId: segment.id };
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
    if (this.outputs.segmentId) {
      const plane = world.getProjectionPlaneById(this.planeId);
      if (plane) {
        plane.removeLine(this.outputs.segmentId);
      }
    }
  }
}

/**
 * AddSegment2DCircleToCircleThroughCentersOp - Operation to add segment through circle centers
 * 
 * Phase 74 - FR-056: Polymorphic Segment Tool
 */
export class AddSegment2DCircleToCircleThroughCentersOp implements IOperation {
  readonly type = 'AddSegment2DCircleToCircleThroughCenters';
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
      
      const segment = plane.addSegment2DCircleToCircleThroughCenters(
        this.circle1Id,
        this.circle2Id,
        world,
        this.outputs.segmentId
      );
      this.outputs = { segmentId: segment.id };
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
    if (this.outputs.segmentId) {
      const plane = world.getProjectionPlaneById(this.planeId);
      if (plane) {
        plane.removeLine(this.outputs.segmentId);
      }
    }
  }
}

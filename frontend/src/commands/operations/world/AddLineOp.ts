/**
 * AddLine2DByTwoPointsOp - Operation to add a Line2DByTwoPoints using ProjectionPlane factory method
 * 
 * Wraps ProjectionPlane.addLine2DBetweenTwoPoints() in the Operation interface.
 */

import type { IOperation, JsonObject, OperationDescriptor, OperationOutputBag, OperationResult } from '../IOperation';
import type { World } from '@/domain/world/World';
import { operationFailure, operationSuccess } from '../operationResultHelpers';
import { requireProjectionPlane } from './operationHelpers';

export interface AddLine2DByTwoPointsDescriptor extends OperationDescriptor<'AddLine2DByTwoPoints'> {
  planeId: string;
  point1Id: string;
  point2Id: string;
  lineId?: string;
}

export interface AddLine2DByTwoPointsOutput extends JsonObject {
  lineId?: string;
}

export class AddLine2DByTwoPointsOp implements IOperation<AddLine2DByTwoPointsDescriptor, AddLine2DByTwoPointsOutput> {
  readonly type = 'AddLine2DByTwoPoints';
  outputs: AddLine2DByTwoPointsOutput = {};

  constructor(
    private planeId: string,
    private point1Id: string,
    private point2Id: string
  ) {
  }

  apply(world: World): OperationResult<AddLine2DByTwoPointsOutput> {
    try {
      const plane = requireProjectionPlane(world, this.planeId);
      
      // Pass stored ID if available (for redo), otherwise let plane generate new one
      const line = plane.addLine2DBetweenTwoPoints(
        this.point1Id,
        this.point2Id,
        world,
        this.outputs.lineId
      );
      this.outputs = { lineId: line.id };
      return operationSuccess(this.outputs);
    } catch (error) {
      return operationFailure(error);
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

  serialize(): AddLine2DByTwoPointsDescriptor {
    return {
      opType: this.type,
      planeId: this.planeId,
      point1Id: this.point1Id,
      point2Id: this.point2Id,
      lineId: this.outputs.lineId
    };
  }
}

/**
 * AddLine2DParallelToLineOp - Operation to add a Line2DParallel using ProjectionPlane factory method
 * 
 * Wraps ProjectionPlane.addLine2DParallelToLine() in the Operation interface.
 */
export interface AddLine2DParallelToLineDescriptor extends OperationDescriptor<'AddLine2DParallelToLine'> {
  planeId: string;
  referenceLineId: string;
  throughPointId: string;
  lineId?: string;
}

export interface AddLine2DParallelToLineOutput extends JsonObject {
  lineId?: string;
}

export class AddLine2DParallelToLineOp implements IOperation<AddLine2DParallelToLineDescriptor, AddLine2DParallelToLineOutput> {
  readonly type = 'AddLine2DParallelToLine';
  outputs: AddLine2DParallelToLineOutput = {};

  constructor(
    private planeId: string,
    private referenceLineId: string,
    private throughPointId: string
  ) {
  }

  apply(world: World): OperationResult<AddLine2DParallelToLineOutput> {
    try {
      const plane = requireProjectionPlane(world, this.planeId);
      
      // Pass stored ID if available (for redo), otherwise let plane generate new one
      const line = plane.addLine2DParallelToLine(
        this.referenceLineId,
        this.throughPointId,
        world,
        this.outputs.lineId
      );
      this.outputs = { lineId: line.id };
      return operationSuccess(this.outputs);
    } catch (error) {
      return operationFailure(error);
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

  serialize(): AddLine2DParallelToLineDescriptor {
    return {
      opType: this.type,
      planeId: this.planeId,
      referenceLineId: this.referenceLineId,
      throughPointId: this.throughPointId,
      lineId: this.outputs.lineId
    };
  }
}

/**
 * AddLine2DPerpendicularToLineOp - Operation to add a Line2DPerpendicularToLine using ProjectionPlane factory method
 * 
 * Wraps ProjectionPlane.addLine2DPerpendicularToLine() in the Operation interface.
 */
export interface AddLine2DPerpendicularToLineDescriptor extends OperationDescriptor<'AddLine2DPerpendicularToLine'> {
  planeId: string;
  referenceLineId: string;
  throughPointId: string;
  lineId?: string;
}

export interface AddLine2DPerpendicularToLineOutput extends JsonObject {
  lineId?: string;
}

export class AddLine2DPerpendicularToLineOp implements IOperation<AddLine2DPerpendicularToLineDescriptor, AddLine2DPerpendicularToLineOutput> {
  readonly type = 'AddLine2DPerpendicularToLine';
  outputs: AddLine2DPerpendicularToLineOutput = {};

  constructor(
    private planeId: string,
    private referenceLineId: string,
    private throughPointId: string
  ) {
  }

  apply(world: World): OperationResult<AddLine2DPerpendicularToLineOutput> {
    try {
      const plane = requireProjectionPlane(world, this.planeId);
      
      // Pass stored ID if available (for redo), otherwise let plane generate new one
      const line = plane.addLine2DPerpendicularToLine(
        this.referenceLineId,
        this.throughPointId,
        world,
        this.outputs.lineId
      );
      this.outputs = { lineId: line.id };
      return operationSuccess(this.outputs);
    } catch (error) {
      return operationFailure(error);
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

  serialize(): AddLine2DPerpendicularToLineDescriptor {
    return {
      opType: this.type,
      planeId: this.planeId,
      referenceLineId: this.referenceLineId,
      throughPointId: this.throughPointId,
      lineId: this.outputs.lineId
    };
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
  outputs: OperationOutputBag = {};

  constructor(
    private planeId: string,
    private circleId: string,
    private throughPointId: string,
    private tangentIndex: 0 | 1
  ) {
  }

  apply(world: World): OperationResult {
    try {
      const plane = requireProjectionPlane(world, this.planeId);
      
      // Pass stored ID if available (for redo), otherwise let plane generate new one
      const line = plane.addLine2DTangentToCircleThroughPoint(
        this.circleId,
        this.throughPointId,
        this.tangentIndex,
        world,
        this.outputs.lineId
      );
      this.outputs = { lineId: line.id };
      return operationSuccess(this.outputs);
    } catch (error) {
      return operationFailure(error);
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
  serialize() {
    return {
      opType: this.type,
      planeId: this.planeId,
      circleId: this.circleId,
      throughPointId: this.throughPointId,
      index: this.tangentIndex,
      lineId: this.outputs.lineId
    };
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
  outputs: OperationOutputBag = {};

  constructor(
    private planeId: string,
    private circleId: string,
    private referenceLineId: string,
    private tangentIndex: 0 | 1
  ) {
  }

  apply(world: World): OperationResult {
    try {
      const plane = requireProjectionPlane(world, this.planeId);
      
      // Pass stored ID if available (for redo), otherwise let plane generate new one
      const line = plane.addLine2DTangentToCircleParallelToLine(
        this.circleId,
        this.referenceLineId,
        this.tangentIndex,
        world,
        this.outputs.lineId
      );
      this.outputs = { lineId: line.id };
      return operationSuccess(this.outputs);
    } catch (error) {
      return operationFailure(error);
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

  serialize() {
    return {
      opType: this.type,
      planeId: this.planeId,
      circleId: this.circleId,
      referenceLineId: this.referenceLineId,
      index: this.tangentIndex,
      lineId: this.outputs.lineId
    };
  }
}

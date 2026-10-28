/**
 * AddLine2DByTwoPointsOp - Operation to add a Line2DByTwoPoints using ProjectionConstructionService
 * 
 * Wraps ProjectionConstructionService.addLine2DBetweenTwoPoints() in the Operation interface.
 */

import type { IOperation, JsonObject, OperationDescriptor, OperationOutputBag, OperationResult } from '../IOperation';
import type { OperationContext } from '../OperationContext';
import { operationFailure, operationSuccess } from '../operationResultHelpers';
import { invalidateRealization, removeLineFromPlane, requireProjectionPlane } from './operationHelpers';
import { Line2DByPointAndRelativeAngle } from '@/domain/world/Line';
import type { VisualStyle } from '@/domain/world/VisualStyle';

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

  apply(context: OperationContext): OperationResult<AddLine2DByTwoPointsOutput> {
    try {
      const plane = requireProjectionPlane(context.world, this.planeId);
      
      const line = context.projectionConstruction.addLine2DBetweenTwoPoints(
        plane,
        this.point1Id,
        this.point2Id,
        this.outputs.lineId
      );
      if (typeof this.outputs.label === 'string') line.label = this.outputs.label;
      context.labelGenerator.reserve('Line2D', line.label);
      this.outputs = { lineId: line.id, label: line.label };
      return operationSuccess(this.outputs);
    } catch (error) {
      return operationFailure(error);
    }
  }

  undo(context: OperationContext): void {
    if (this.outputs.lineId) {
      const plane = context.world.getProjectionPlaneById(this.planeId);
      if (plane) {
        removeLineFromPlane(context, plane, this.outputs.lineId);
      }
    }
  }

  serialize(): AddLine2DByTwoPointsDescriptor {
    return {
      opType: this.type,
      planeId: this.planeId,
      point1Id: this.point1Id,
      point2Id: this.point2Id,
      lineId: this.outputs.lineId,
      label: this.outputs.label
    };
  }
}

/**
 * AddLine2DParallelToLineOp - Operation to add a Line2DParallel using ProjectionConstructionService
 * 
 * Wraps ProjectionConstructionService.addLine2DParallelToLine() in the Operation interface.
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

  apply(context: OperationContext): OperationResult<AddLine2DParallelToLineOutput> {
    try {
      const plane = requireProjectionPlane(context.world, this.planeId);
      
      const line = context.projectionConstruction.addLine2DParallelToLine(
        plane,
        this.referenceLineId,
        this.throughPointId,
        this.outputs.lineId
      );
      if (typeof this.outputs.label === 'string') line.label = this.outputs.label;
      context.labelGenerator.reserve('Line2D', line.label);
      this.outputs = { lineId: line.id, label: line.label };
      return operationSuccess(this.outputs);
    } catch (error) {
      return operationFailure(error);
    }
  }

  undo(context: OperationContext): void {
    if (this.outputs.lineId) {
      const plane = context.world.getProjectionPlaneById(this.planeId);
      if (plane) {
        removeLineFromPlane(context, plane, this.outputs.lineId);
      }
    }
  }

  serialize(): AddLine2DParallelToLineDescriptor {
    return {
      opType: this.type,
      planeId: this.planeId,
      referenceLineId: this.referenceLineId,
      throughPointId: this.throughPointId,
      lineId: this.outputs.lineId,
      label: this.outputs.label
    };
  }
}

/**
 * AddLine2DPerpendicularToLineOp - Operation to add a Line2DPerpendicularToLine using ProjectionConstructionService
 * 
 * Wraps ProjectionConstructionService.addLine2DPerpendicularToLine() in the Operation interface.
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

  apply(context: OperationContext): OperationResult<AddLine2DPerpendicularToLineOutput> {
    try {
      const plane = requireProjectionPlane(context.world, this.planeId);
      
      const line = context.projectionConstruction.addLine2DPerpendicularToLine(
        plane,
        this.referenceLineId,
        this.throughPointId,
        this.outputs.lineId
      );
      if (typeof this.outputs.label === 'string') line.label = this.outputs.label;
      context.labelGenerator.reserve('Line2D', line.label);
      this.outputs = { lineId: line.id, label: line.label };
      return operationSuccess(this.outputs);
    } catch (error) {
      return operationFailure(error);
    }
  }

  undo(context: OperationContext): void {
    if (this.outputs.lineId) {
      const plane = context.world.getProjectionPlaneById(this.planeId);
      if (plane) {
        removeLineFromPlane(context, plane, this.outputs.lineId);
      }
    }
  }

  serialize(): AddLine2DPerpendicularToLineDescriptor {
    return {
      opType: this.type,
      planeId: this.planeId,
      referenceLineId: this.referenceLineId,
      throughPointId: this.throughPointId,
      lineId: this.outputs.lineId,
      label: this.outputs.label
    };
  }
}

export interface AddLine2DByPointAndRelativeAngleDescriptor extends OperationDescriptor<'AddLine2DByPointAndRelativeAngle'> {
  planeId: string;
  referenceLineId: string;
  throughPointId: string;
  angleRadians: number;
  lineId?: string;
}

export interface AddLine2DByPointAndRelativeAngleOutput extends JsonObject {
  lineId?: string;
}

export class AddLine2DByPointAndRelativeAngleOp implements IOperation<AddLine2DByPointAndRelativeAngleDescriptor, AddLine2DByPointAndRelativeAngleOutput> {
  readonly type = 'AddLine2DByPointAndRelativeAngle';
  outputs: AddLine2DByPointAndRelativeAngleOutput = {};

  constructor(
    private planeId: string,
    private referenceLineId: string,
    private throughPointId: string,
    private angleRadians: number
  ) {
  }

  apply(context: OperationContext): OperationResult<AddLine2DByPointAndRelativeAngleOutput> {
    try {
      const plane = requireProjectionPlane(context.world, this.planeId);
      const line = context.projectionConstruction.addLine2DByPointAndRelativeAngle(
        plane,
        this.referenceLineId,
        this.throughPointId,
        this.angleRadians,
        this.outputs.lineId
      );
      if (typeof this.outputs.label === 'string') line.label = this.outputs.label;
      context.labelGenerator.reserve('Line2D', line.label);
      this.outputs = { lineId: line.id, label: line.label };
      return operationSuccess(this.outputs);
    } catch (error) {
      return operationFailure(error);
    }
  }

  undo(context: OperationContext): void {
    if (this.outputs.lineId) {
      const plane = context.world.getProjectionPlaneById(this.planeId);
      if (plane) {
        removeLineFromPlane(context, plane, this.outputs.lineId);
      }
    }
  }

  serialize(): AddLine2DByPointAndRelativeAngleDescriptor {
    return {
      opType: this.type,
      planeId: this.planeId,
      referenceLineId: this.referenceLineId,
      throughPointId: this.throughPointId,
      angleRadians: this.angleRadians,
      lineId: this.outputs.lineId,
      label: this.outputs.label
    };
  }
}

export interface UpdateLine2DRelativeAngleDescriptor extends OperationDescriptor<'UpdateLine2DRelativeAngle'> {
  planeId: string;
  lineId: string;
  newAngleRadians: number;
}

export class UpdateLine2DRelativeAngleOp implements IOperation<UpdateLine2DRelativeAngleDescriptor> {
  readonly type = 'UpdateLine2DRelativeAngle';
  outputs: OperationOutputBag = {};

  private previousAngleRadians?: number;
  private previousLabel?: string;
  private previousStyle?: VisualStyle;

  constructor(
    private planeId: string,
    private lineId: string,
    private newAngleRadians: number
  ) {
  }

  apply(context: OperationContext): OperationResult {
    try {
      const plane = requireProjectionPlane(context.world, this.planeId);
      const existing = plane.getLine(this.lineId);
      if (!(existing instanceof Line2DByPointAndRelativeAngle)) {
        throw new Error(`Cannot edit angle of non-parameterized line: ${this.lineId}`);
      }

      if (this.previousAngleRadians === undefined) {
        this.previousAngleRadians = existing.angleRadians;
        this.previousLabel = existing.label;
        this.previousStyle = existing.visualStyle ? { ...existing.visualStyle } : undefined;
      }

      const updated = new Line2DByPointAndRelativeAngle(
        existing.id,
        existing.referenceLineId,
        existing.throughPointId,
        this.newAngleRadians,
        existing.planeId,
        this.previousLabel
      );
      updated.visualStyle = existing.visualStyle ? { ...existing.visualStyle } : undefined;

      invalidateRealization(context, this.lineId);
      plane.removeLine(this.lineId);
      plane.addLine(updated);
      context.dependencies.registerNode(updated.id, updated.getDependencies());

      return operationSuccess({ lineId: this.lineId });
    } catch (error) {
      return operationFailure(error);
    }
  }

  undo(context: OperationContext): void {
    if (this.previousAngleRadians === undefined) return;
    const plane = context.world.getProjectionPlaneById(this.planeId);
    const existing = plane?.getLine(this.lineId);
    if (!plane || !(existing instanceof Line2DByPointAndRelativeAngle)) return;

    const restored = new Line2DByPointAndRelativeAngle(
      this.lineId,
      existing.referenceLineId,
      existing.throughPointId,
      this.previousAngleRadians,
      this.planeId,
      this.previousLabel
    );
    restored.visualStyle = this.previousStyle ? { ...this.previousStyle } : undefined;

    invalidateRealization(context, this.lineId);
    plane.removeLine(this.lineId);
    plane.addLine(restored);
    context.dependencies.registerNode(restored.id, restored.getDependencies());
  }

  serialize(): UpdateLine2DRelativeAngleDescriptor {
    return {
      opType: this.type,
      planeId: this.planeId,
      lineId: this.lineId,
      newAngleRadians: this.newAngleRadians
    };
  }
}
/**
 * AddLine2DTangentToCircleThroughPointOp - Operation to add a Line2DTangentToCircleThroughPoint using ProjectionConstructionService
 * 
 * Phase 60: Tangent line to circle through external point
 * Wraps ProjectionConstructionService.addLine2DTangentToCircleThroughPoint() in the Operation interface.
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

  apply(context: OperationContext): OperationResult {
    try {
      const plane = requireProjectionPlane(context.world, this.planeId);
      
      const line = context.projectionConstruction.addLine2DTangentToCircleThroughPoint(
        plane,
        this.circleId,
        this.throughPointId,
        this.tangentIndex,
        this.outputs.lineId
      );
      if (typeof this.outputs.label === 'string') line.label = this.outputs.label;
      context.labelGenerator.reserve('Line2D', line.label);
      this.outputs = { lineId: line.id, label: line.label };
      return operationSuccess(this.outputs);
    } catch (error) {
      return operationFailure(error);
    }
  }

  undo(context: OperationContext): void {
    if (this.outputs.lineId) {
      const plane = context.world.getProjectionPlaneById(this.planeId);
      if (plane) {
        removeLineFromPlane(context, plane, this.outputs.lineId);
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
      lineId: this.outputs.lineId,
      label: this.outputs.label
    };
  }
}

/**
 * AddLine2DTangentToCircleParallelToLineOp - Operation to add a Line2DTangentToCircleParallelToLine using ProjectionConstructionService
 * 
 * Phase 61: Tangent line to circle parallel to reference line
 * Wraps ProjectionConstructionService.addLine2DTangentToCircleParallelToLine() in the Operation interface.
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

  apply(context: OperationContext): OperationResult {
    try {
      const plane = requireProjectionPlane(context.world, this.planeId);
      
      const line = context.projectionConstruction.addLine2DTangentToCircleParallelToLine(
        plane,
        this.circleId,
        this.referenceLineId,
        this.tangentIndex,
        this.outputs.lineId
      );
      if (typeof this.outputs.label === 'string') line.label = this.outputs.label;
      context.labelGenerator.reserve('Line2D', line.label);
      this.outputs = { lineId: line.id, label: line.label };
      return operationSuccess(this.outputs);
    } catch (error) {
      return operationFailure(error);
    }
  }

  undo(context: OperationContext): void {
    if (this.outputs.lineId) {
      const plane = context.world.getProjectionPlaneById(this.planeId);
      if (plane) {
        removeLineFromPlane(context, plane, this.outputs.lineId);
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
      lineId: this.outputs.lineId,
      label: this.outputs.label
    };
  }
}

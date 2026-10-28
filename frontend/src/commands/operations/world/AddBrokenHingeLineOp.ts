/**
 * AddBrokenHingeLineOp - Create broken hinge line for auxiliary projection plane
 * 
 * Phase 101: Broken Hinge Lines (BHL) for Auxiliary Planes
 * 
 * Creates a BrokenHingeLine with its two sibling traces:
 * 1. BrokenHingeLine (3D entity)
 * 2. BrokenHalfHingeLine2D on plane1 (T2 or T2')
 * 3. BrokenHalfHingeLine2D on plane2 (T2 or T2')
 * 
 * CRITICAL: Siblings reference each other via siblingBHHLId to enable:
 * - Auto-creating sibling guides when guide is placed on BHHL
 * - Arc rendering between corresponding guide pairs
 * 
 * The operation is atomic and reversible (undo removes all three entities).
 * 
 * @see BrokenHingeLine in BrokenHingeLine.ts
 * @see BrokenHalfHingeLine2D in BrokenHalfHingeLine2D.ts
 */

import type { IOperation, OperationOutputBag, OperationResult } from '../IOperation';
import type { OperationContext } from '../OperationContext';
import { invalidateRealization, removeLineFromPlane } from './operationHelpers';

export class AddBrokenHingeLineOp implements IOperation {
  readonly type = 'AddBrokenHingeLine';
  outputs: OperationOutputBag = {};

  private createdLabel?: string;

  constructor(
    private mainHingeId: string,           // ID of main hinge line (T1)
    private auxiliaryPlaneId: string,      // ID of auxiliary projection plane (Q)
    private plane1Id: string,              // ID of first plane (has one BHHL trace)
    private plane2Id: string,              // ID of second plane (has other BHHL trace)
    private brokenHingeLineId?: string,    // Optional BHL ID (for redo)
    private bhhl1Id?: string,              // Optional BHHL ID on plane1 (for redo)
    private bhhl2Id?: string               // Optional BHHL ID on plane2 (for redo)
  ) {
  }

  apply(context: OperationContext): OperationResult {
    try {
      // Validate inputs
      const mainHinge = context.world.getHingeLineById(this.mainHingeId);
      if (!mainHinge) {
        throw new Error(`Main hinge line not found: ${this.mainHingeId}`);
      }

      const auxPlane = context.world.getProjectionPlaneById(this.auxiliaryPlaneId);
      if (!auxPlane) {
        throw new Error(`Auxiliary projection plane not found: ${this.auxiliaryPlaneId}`);
      }

      const plane1 = context.world.getProjectionPlaneById(this.plane1Id);
      const plane2 = context.world.getProjectionPlaneById(this.plane2Id);
      if (!plane1 || !plane2) {
        throw new Error(`One or both planes not found: ${this.plane1Id}, ${this.plane2Id}`);
      }

      const { brokenHingeLine, bhhl1, bhhl2 } = context.projectionPlaneConstruction.addBrokenHingeLine({
        mainHingeId: this.mainHingeId,
        auxiliaryPlaneId: this.auxiliaryPlaneId,
        plane1,
        plane2,
        brokenHingeLineId: this.brokenHingeLineId || this.outputs.brokenHingeLineId,
        label: this.createdLabel ?? (typeof this.outputs.label === 'string' ? this.outputs.label : undefined),
        bhhl1Id: this.bhhl1Id || this.outputs.bhhl1Id,
        bhhl2Id: this.bhhl2Id || this.outputs.bhhl2Id,
      });

      if (this.createdLabel !== undefined) brokenHingeLine.label = this.createdLabel;
      else if (typeof this.outputs.label === 'string') brokenHingeLine.label = this.outputs.label;
      this.createdLabel = brokenHingeLine.label;
      context.labelGenerator.reserve('BrokenHingeLine', brokenHingeLine.label);
      // Store outputs for undo
      this.outputs = {
        brokenHingeLineId: brokenHingeLine.id,
        bhhl1Id: bhhl1.id,
        bhhl2Id: bhhl2.id,
        plane1Id: this.plane1Id,
        plane2Id: this.plane2Id
      };

      // Back-fill generated IDs into parameters for persistence
      this.brokenHingeLineId = brokenHingeLine.id;
      this.bhhl1Id = bhhl1.id;
      this.bhhl2Id = bhhl2.id;

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
    if (this.outputs.brokenHingeLineId && this.outputs.bhhl1Id && this.outputs.bhhl2Id) {
      const plane1 = context.world.getProjectionPlaneById(this.outputs.plane1Id);
      const plane2 = context.world.getProjectionPlaneById(this.outputs.plane2Id);
      if (plane1) removeLineFromPlane(context, plane1, this.outputs.bhhl1Id);
      if (plane2) removeLineFromPlane(context, plane2, this.outputs.bhhl2Id);

      invalidateRealization(context, this.outputs.brokenHingeLineId);
      context.world.deleteHingeLine(this.outputs.brokenHingeLineId);
      context.dependencies.unregisterNode(this.outputs.brokenHingeLineId);
    }
  }

  serialize() {
    return {
      opType: this.type,
      mainHingeId: this.mainHingeId,
      auxiliaryPlaneId: this.auxiliaryPlaneId,
      plane1Id: this.plane1Id,
      plane2Id: this.plane2Id,
      brokenHingeLineId: this.outputs.brokenHingeLineId || this.brokenHingeLineId,
      bhhl1Id: this.outputs.bhhl1Id || this.bhhl1Id,
      bhhl2Id: this.outputs.bhhl2Id || this.bhhl2Id,
      label: this.createdLabel
    };
  }
}

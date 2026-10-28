/**
 * Add3DLineOp - Operation to add a Line3D from two existing 2D line projections
 * 
 * Phase 78: 3D Element Creation Tools
 * 
 * Creates a Line3DFromProjections by:
 * 1. Validating that projections are on different planes
 * 2. Referencing existing Line2D elements as projections
 * 3. Reconstructing 3D line from 2D projections
 * 4. Adding to World.lines3D storage
 * 
 * The operation is reversible (undo removes the line).
 * 
 * @see Line3DFromProjections in Line3D.ts
 * @see ReconstructionConstructionService for storage
 */

import type { IOperation, JsonObject, OperationDescriptor, OperationResult } from '../IOperation';
import type { OperationContext } from '../OperationContext';
import { invalidateRealization, requireDistinctProjectionPlanes, requireFeasibleProjectionPair } from './operationHelpers';

export interface Add3DLineDescriptor extends OperationDescriptor<'Add3DLine'> {
  projection1Id: string;
  projection2Id: string;
  plane1Id: string;
  plane2Id: string;
  label?: string;
  visualStyle?: JsonObject;
  lineId?: string;
}

export interface Add3DLineOutput extends JsonObject {
  lineId?: string;
}

export class Add3DLineOp implements IOperation<Add3DLineDescriptor, Add3DLineOutput> {
  readonly type = 'Add3DLine';
  outputs: Add3DLineOutput = {};

  constructor(
    private projection1Id: string,     // ID of first Line2D projection
    private projection2Id: string,     // ID of second Line2D projection
    private plane1Id: string,          // ID of first projection plane
    private plane2Id: string,          // ID of second projection plane
    private label?: string,            // Optional label for the line
    private visualStyle?: any          // Optional visual style
  ) {
  }

  apply(context: OperationContext): OperationResult<Add3DLineOutput> {
    try {
      const { plane1, plane2 } = requireDistinctProjectionPlanes(context.world, this.plane1Id, this.plane2Id, 'line');
      
      // Validate that projection lines exist
      const proj1 = plane1.getLine(this.projection1Id);
      const proj2 = plane2.getLine(this.projection2Id);
      
      if (!proj1) {
        throw new Error(`Projection line not found: ${this.projection1Id} on plane ${this.plane1Id}`);
      }
      if (!proj2) {
        throw new Error(`Projection line not found: ${this.projection2Id} on plane ${this.plane2Id}`);
      }
      
      // Validate that projections are geometrically feasible
      const proj1Real = proj1.realize2D(context.realizationContext);
      const proj2Real = proj2.realize2D(context.realizationContext);
      
      requireFeasibleProjectionPair('line', proj1Real, proj2Real);
      
      const line = context.reconstructionConstruction.addLineFromProjections({
        projection1Id: this.projection1Id,
        projection2Id: this.projection2Id,
        plane1Id: this.plane1Id,
        plane2Id: this.plane2Id,
        lineId: this.outputs.lineId,
        label: this.label,
        visualStyle: this.visualStyle,
      });
      
      this.label = line.label;
      context.labelGenerator.reserve('Line3D', line.label);
      // Store outputs for undo
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

  undo(context: OperationContext): void {
    if (this.outputs.lineId) {
      invalidateRealization(context, this.outputs.lineId);
      context.world.deleteLine3D(this.outputs.lineId);
      context.dependencies.unregisterNode(this.outputs.lineId);
    }
  }

  serialize(): Add3DLineDescriptor {
    return {
      opType: this.type,
      projection1Id: this.projection1Id,
      projection2Id: this.projection2Id,
      plane1Id: this.plane1Id,
      plane2Id: this.plane2Id,
      label: this.label,
      visualStyle: this.visualStyle,
      lineId: this.outputs.lineId
    };
  }

}

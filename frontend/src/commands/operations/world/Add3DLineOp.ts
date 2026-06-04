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
 * @see World.add3DLine() for storage
 */

import type { IOperation, OperationOutputBag, OperationResult } from '../IOperation';
import type { World } from '@/domain/world/World';
import { Line3DFromProjections } from '@/domain/world/Line3D';
import { requireDistinctProjectionPlanes, requireFeasibleProjectionPair } from './operationHelpers';

export class Add3DLineOp implements IOperation {
  readonly type = 'Add3DLine';
  outputs: OperationOutputBag = {};

  constructor(
    private projection1Id: string,     // ID of first Line2D projection
    private projection2Id: string,     // ID of second Line2D projection
    private plane1Id: string,          // ID of first projection plane
    private plane2Id: string,          // ID of second projection plane
    private label?: string,            // Optional label for the line
    private visualStyle?: any          // Optional visual style
  ) {
  }

  apply(world: World): OperationResult {
    try {
      const { plane1, plane2 } = requireDistinctProjectionPlanes(world, this.plane1Id, this.plane2Id, 'line');
      
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
      const proj1Real = proj1.realize2D(world);
      const proj2Real = proj2.realize2D(world);
      
      requireFeasibleProjectionPair('line', proj1Real, proj2Real);
      
      // Use stored ID if available (for redo), otherwise generate new one
      const lineId = this.outputs.lineId || world.generate3DLineId();
      
      // Phase 97: Generate default label if not provided
      const label = this.label || world.generateDefaultLabel(lineId, 'Line3D');
      
      // Create default visual style if not provided
      const visualStyle = this.visualStyle || {
        color: '#FF6B35',    // Orange for 3D elements
        thickness: 0.003,     // Thicker than 2D lines (0.002)
        visible: true
      };
      
      // Create Line3DFromProjections
      const line = new Line3DFromProjections(
        lineId,
        label,
        this.projection1Id,
        this.projection2Id,
        this.plane1Id,
        this.plane2Id,
        visualStyle
      );
      
      // Add to World storage
      world.add3DLine(line);
      
      // Store outputs for undo
      this.outputs = { lineId };
      
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
      world.remove3DLine(this.outputs.lineId);
    }
  }

  serialize() {
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

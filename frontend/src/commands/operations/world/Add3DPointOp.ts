/**
 * Add3DPointOp - Operation to add a Point3D from two existing 2D projection points
 * 
 * Phase 78: 3D Element Creation Tools
 * 
 * Creates a Point3DFromProjections by:
 * 1. Validating that projections are on different planes
 * 2. Referencing existing Point2D elements as projections
 * 3. Reconstructing 3D position from 2D projections
 * 4. Adding to World.points3D storage
 * 
 * The operation is reversible (undo removes the point).
 * 
 * IMPORTANT: This operation assumes the 2D projection points already exist.
 * The tool (Create3DPointTool) is responsible for:
 * - Creating the 2D projection points if needed
 * - Passing their IDs to this operation
 * 
 * @see Point3DFromProjections in Point3D.ts
 * @see World.add3DPoint() for storage
 * @see Create3DPointTool for the interactive creation flow
 */

import type { IOperation, JsonObject, OperationDescriptor, OperationResult } from '../IOperation';
import type { World } from '@/domain/world/World';
import { Point3DFromProjections } from '@/domain/world/Point3D';
import { requireDistinctProjectionPlanes, requireFeasibleProjectionPair } from './operationHelpers';

export interface Add3DPointDescriptor extends OperationDescriptor<'Add3DPoint'> {
  projection1Id: string;
  projection2Id: string;
  plane1Id: string;
  plane2Id: string;
  label?: string;
  visualStyle?: JsonObject;
  pointId?: string;
}

export interface Add3DPointOutput extends JsonObject {
  pointId?: string;
}

export class Add3DPointOp implements IOperation<Add3DPointDescriptor, Add3DPointOutput> {
  readonly type = 'Add3DPoint';
  outputs: Add3DPointOutput = {};

  constructor(
    private projection1Id: string,     // ID of first Point2D projection
    private projection2Id: string,     // ID of second Point2D projection
    private plane1Id: string,          // ID of first projection plane
    private plane2Id: string,          // ID of second projection plane
    private label?: string,            // Optional label for the point
    private visualStyle?: any          // Optional visual style
  ) {
  }

  apply(world: World): OperationResult<Add3DPointOutput> {
    try {
      const { plane1, plane2 } = requireDistinctProjectionPlanes(world, this.plane1Id, this.plane2Id, 'point');
      
      // Validate that projection points exist
      const proj1 = plane1.getPoint(this.projection1Id);
      const proj2 = plane2.getPoint(this.projection2Id);
      
      if (!proj1) {
        throw new Error(`Projection point not found: ${this.projection1Id} on plane ${this.plane1Id}`);
      }
      if (!proj2) {
        throw new Error(`Projection point not found: ${this.projection2Id} on plane ${this.plane2Id}`);
      }
      
      // Validate that projections are geometrically feasible
      const proj1Real = proj1.realize2D(world);
      const proj2Real = proj2.realize2D(world);
      
      requireFeasibleProjectionPair('point', proj1Real, proj2Real);
      
      // Use stored ID if available (for redo), otherwise generate new one
      const pointId = this.outputs.pointId || world.generate3DPointId();
      
      // Phase 97: Generate default label if not provided
      const label = this.label || world.generateDefaultLabel(pointId, 'Point3D');
      
      // Create default visual style if not provided
      const visualStyle = this.visualStyle || {
        color: '#FF6B35',    // Orange for 3D elements
        thickness: 0.015,     // Thicker than 2D points (0.01)
        visible: true
      };
      
      // Create Point3DFromProjections
      const point = new Point3DFromProjections(
        pointId,
        label,
        this.projection1Id,
        this.projection2Id,
        this.plane1Id,
        this.plane2Id,
        visualStyle
      );
      
      // Add to World storage
      world.add3DPoint(point);
      
      // Store outputs for undo
      this.outputs = { pointId };
      
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
      world.remove3DPoint(this.outputs.pointId);
    }
  }

  serialize(): Add3DPointDescriptor {
    return {
      opType: this.type,
      projection1Id: this.projection1Id,
      projection2Id: this.projection2Id,
      plane1Id: this.plane1Id,
      plane2Id: this.plane2Id,
      label: this.label,
      visualStyle: this.visualStyle,
      pointId: this.outputs.pointId
    };
  }

}

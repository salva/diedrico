/**
 * Add3DPlaneOp - Operation to add a Plane3D from two existing trace lines
 * 
 * Phase 78: 3D Element Creation Tools
 * 
 * Creates a Plane3DFromTraces by:
 * 1. Validating that traces are on different planes
 * 2. Referencing existing Line2D elements as traces
 * 3. Reconstructing 3D plane equation from traces
 * 4. Adding to World.planes3D storage
 * 
 * The operation is reversible (undo removes the plane).
 * 
 * @see Plane3DFromTraces in Plane.ts
 * @see ReconstructionConstructionService for storage
 */

import type { IOperation, JsonObject, OperationDescriptor, OperationResult } from '../IOperation';
import type { OperationContext } from '../OperationContext';
import { computePlaneEquationFromTwo3DLines } from '@/utils/projectionPlaneUtils';
import { Vector3, Vector4 } from 'three';
import { applyMatrix4x3 } from '@/utils/threeUtils';
import { invalidateRealization, requireDistinctProjectionPlanes, requireFeasibleProjectionPair } from './operationHelpers';

export interface Add3DPlaneDescriptor extends OperationDescriptor<'Add3DPlane'> {
  trace1Id: string;
  trace2Id: string;
  plane1Id: string;
  plane2Id: string;
  label?: string;
  planeId?: string;
}

export interface Add3DPlaneOutput extends JsonObject {
  planeId?: string;
}

export class Add3DPlaneOp implements IOperation<Add3DPlaneDescriptor, Add3DPlaneOutput> {
  readonly type = 'Add3DPlane';
  outputs: Add3DPlaneOutput = {};

  constructor(
    private trace1Id: string,          // ID of first trace Line2D
    private trace2Id: string,          // ID of second trace Line2D
    private plane1Id: string,          // ID of first projection plane
    private plane2Id: string,          // ID of second projection plane
    private label?: string             // Optional label for the plane
  ) {
  }

  apply(context: OperationContext): OperationResult<Add3DPlaneOutput> {
    try {
      const { plane1, plane2 } = requireDistinctProjectionPlanes(context.world, this.plane1Id, this.plane2Id, 'plane', 'traces');
      
      // Validate that trace lines exist
      const trace1 = plane1.getLine(this.trace1Id);
      const trace2 = plane2.getLine(this.trace2Id);
      
      if (!trace1) {
        throw new Error(`Trace line not found: ${this.trace1Id} on plane ${this.plane1Id}`);
      }
      if (!trace2) {
        throw new Error(`Trace line not found: ${this.trace2Id} on plane ${this.plane2Id}`);
      }
      
      // Validate that traces are geometrically feasible
      const [trace1Real, trace2Real] = requireFeasibleProjectionPair('plane', trace1.realize2D(context.realizationContext), trace2.realize2D(context.realizationContext), 'traces');
      
      // CRITICAL VALIDATION: Verify that traces intersect in 3D
      // Transform traces to 3D and check intersection
      const plane1Realization = context.realizations.realizeProjectionPlane3D(plane1, context.realizationContext);
      const plane2Realization = context.realizations.realizeProjectionPlane3D(plane2, context.realizationContext);
      
      if (!plane1Realization || !plane2Realization) {
        throw new Error('Cannot create 3D plane: projection plane realizations not available');
      }
      
      // Transform trace1 from 2D to 3D
      // trace1Real.point1 is a point (w=1), trace1Real.point2 is a direction (w=0)
      const p1_4D = applyMatrix4x3(trace1Real.point1, plane1Realization.planeTo3D);
      const p1_3D = new Vector3(p1_4D.x, p1_4D.y, p1_4D.z);
      
      // Transform direction by applying to point1 + direction
      const p1_plus_d1 = new Vector3(
        trace1Real.point1.x + trace1Real.point2.x,
        trace1Real.point1.y + trace1Real.point2.y,
        1  // Keep w=1 for point
      );
      const p1d_4D = applyMatrix4x3(p1_plus_d1, plane1Realization.planeTo3D);
      const p1d_3D = new Vector3(p1d_4D.x, p1d_4D.y, p1d_4D.z);
      const d1_3D = new Vector3(
        p1d_3D.x - p1_3D.x,
        p1d_3D.y - p1_3D.y,
        p1d_3D.z - p1_3D.z
      );
      
      // Transform trace2 from 2D to 3D
      const p2_4D = applyMatrix4x3(trace2Real.point1, plane2Realization.planeTo3D);
      const p2_3D = new Vector3(p2_4D.x, p2_4D.y, p2_4D.z);
      
      // Transform direction by applying to point1 + direction
      const p2_plus_d2 = new Vector3(
        trace2Real.point1.x + trace2Real.point2.x,
        trace2Real.point1.y + trace2Real.point2.y,
        1  // Keep w=1 for point
      );
      const p2d_4D = applyMatrix4x3(p2_plus_d2, plane2Realization.planeTo3D);
      const p2d_3D = new Vector3(p2d_4D.x, p2d_4D.y, p2d_4D.z);
      const d2_3D = new Vector3(
        p2d_3D.x - p2_3D.x,
        p2d_3D.y - p2_3D.y,
        p2d_3D.z - p2_3D.z
      );
      
      const p1_homogeneous = new Vector4(p1_3D.x, p1_3D.y, p1_3D.z, 1);  // Point (w=1)
      const d1_homogeneous = new Vector4(d1_3D.x, d1_3D.y, d1_3D.z, 0);  // Direction (w=0)
      const p2_homogeneous = new Vector4(p2_3D.x, p2_3D.y, p2_3D.z, 1);  // Point (w=1)
      const d2_homogeneous = new Vector4(d2_3D.x, d2_3D.y, d2_3D.z, 0);  // Direction (w=0)
      const planeEquation = computePlaneEquationFromTwo3DLines(
        p1_homogeneous,
        d1_homogeneous,
        p2_homogeneous,
        d2_homogeneous
      );
      if (!planeEquation) {
        throw new Error('Cannot create 3D plane: traces must intersect or be distinct parallel lines');
      }
      
      const plane = context.reconstructionConstruction.addPlaneFromTraces({
        trace1Id: this.trace1Id,
        trace2Id: this.trace2Id,
        plane1Id: this.plane1Id,
        plane2Id: this.plane2Id,
        planeId: this.outputs.planeId,
        label: this.label,
      });
      
      this.label = plane.label;
      context.labelGenerator.reserve('Plane3D', plane.label);
      // Store outputs for undo
      this.outputs = { planeId: plane.id };
      
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
    if (this.outputs.planeId) {
      invalidateRealization(context, this.outputs.planeId);
      context.world.deletePlane3D(this.outputs.planeId);
      context.dependencies.unregisterNode(this.outputs.planeId);
    }
  }

  serialize(): Add3DPlaneDescriptor {
    return {
      opType: this.type,
      trace1Id: this.trace1Id,
      trace2Id: this.trace2Id,
      plane1Id: this.plane1Id,
      plane2Id: this.plane2Id,
      label: this.label,
      planeId: this.outputs.planeId
    };
  }
}

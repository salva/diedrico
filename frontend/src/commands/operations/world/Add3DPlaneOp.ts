/**
 * Add3DPlaneOp - Operation to add a Plane3D from two existing trace lines
 * 
 * Phase 78: 3D Element Creation Tools
 * 
 * Creates a Plane3DFromTraces by:
 * 1. Validating that traces are on different planes
 * 2. Referencing existing Line2D elements as traces
 * 3. Reconstructing 3D plane equation from traces
 * 4. Adding to World.planes3DUser storage
 * 
 * The operation is reversible (undo removes the plane).
 * 
 * @see Plane3DFromTraces in Plane.ts
 * @see World.add3DPlaneUser() for storage
 */

import type { IOperation, OperationResult } from '../IOperation';
import type { World } from '@/domain/world/World';
import { Plane3DFromTraces } from '@/domain/world/Plane';
import { computeLineLineIntersection3D } from '@/utils/projectionPlaneUtils';
import { Vector3 } from 'three';
import { applyMatrix4x3 } from '@/utils/threeUtils';

export class Add3DPlaneOp implements IOperation {
  readonly type = 'Add3DPlane';
  readonly parameters: Record<string, any>;
  outputs: Record<string, any> = {};

  constructor(
    private trace1Id: string,          // ID of first trace Line2D
    private trace2Id: string,          // ID of second trace Line2D
    private plane1Id: string,          // ID of first projection plane
    private plane2Id: string,          // ID of second projection plane
    private label?: string             // Optional label for the plane
  ) {
    this.parameters = { 
      trace1Id, 
      trace2Id, 
      plane1Id, 
      plane2Id,
      label
    };
  }

  apply(world: World): OperationResult {
    try {
      // Validate that planes exist
      const plane1 = world.getProjectionPlaneById(this.plane1Id);
      const plane2 = world.getProjectionPlaneById(this.plane2Id);
      
      if (!plane1) {
        throw new Error(`Projection plane not found: ${this.plane1Id}`);
      }
      if (!plane2) {
        throw new Error(`Projection plane not found: ${this.plane2Id}`);
      }
      
      // Phase 78 requirement: Different-plane validation
      if (this.plane1Id === this.plane2Id) {
        throw new Error(
          `Cannot create 3D plane: traces must be on different planes. ` +
          `Both traces are on plane ${this.plane1Id}`
        );
      }
      
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
      const trace1Real = trace1.realize2D(world);
      const trace2Real = trace2.realize2D(world);
      
      if (!trace1Real || !trace2Real || !trace1Real.isFeasible() || !trace2Real.isFeasible()) {
        throw new Error('Cannot create 3D plane: one or both traces are not geometrically feasible');
      }
      
      // CRITICAL VALIDATION: Verify that traces intersect in 3D
      // Transform traces to 3D and check intersection
      const plane1Realization = world.getProjectionPlane3DRealization(this.plane1Id);
      const plane2Realization = world.getProjectionPlane3DRealization(this.plane2Id);
      
      if (!plane1Realization || !plane2Realization) {
        throw new Error('Cannot create 3D plane: projection plane realizations not available');
      }
      
      // Transform trace1 from 2D to 3D
      const p1_4D = applyMatrix4x3(trace1Real.point1, plane1Realization.planeTo3D);
      const p1_3D = new Vector3(p1_4D.x, p1_4D.y, p1_4D.z);
      const d1_3D = new Vector3(trace1Real.point2.x, trace1Real.point2.y, trace1Real.point2.z);
      
      // Transform trace2 from 2D to 3D
      const p2_4D = applyMatrix4x3(trace2Real.point1, plane2Realization.planeTo3D);
      const p2_3D = new Vector3(p2_4D.x, p2_4D.y, p2_4D.z);
      const d2_3D = new Vector3(trace2Real.point2.x, trace2Real.point2.y, trace2Real.point2.z);
      
      try {
        // This will throw an error if traces are parallel or skew (don't intersect)
        computeLineLineIntersection3D(
          { point: p1_3D, direction: d1_3D },
          { point: p2_3D, direction: d2_3D }
        );
      } catch (error) {
        throw new Error(
          `Cannot create 3D plane: ${error instanceof Error ? error.message : 'Traces do not intersect'}`
        );
      }
      
      // Use stored ID if available (for redo), otherwise generate new one
      const planeId = this.outputs.planeId || world.generate3DPlaneId();
      
      // Create Plane3DFromTraces
      const plane = new Plane3DFromTraces(
        planeId,
        this.label || `Plane ${planeId}`,
        this.trace1Id,
        this.trace2Id,
        this.plane1Id,
        this.plane2Id
      );
      
      // Add to World storage
      world.add3DPlaneUser(plane);
      
      // Store outputs for undo
      this.outputs = { planeId };
      
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
    if (this.outputs.planeId) {
      world.remove3DPlaneUser(this.outputs.planeId);
    }
  }
}

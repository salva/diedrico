/**
 * Add3DSegmentOp - Operation to add a Segment3D from two existing 2D segment projections
 * 
 * Phase 78: 3D Element Creation Tools
 * 
 * Creates a Segment3DFromProjections by:
 * 1. Validating that projections are on different planes
 * 2. Referencing existing Segment2D elements as projections
 * 3. Reconstructing 3D segment from 2D projections
 * 4. Adding to World.segments3D storage
 * 
 * The operation is reversible (undo removes the segment).
 * 
 * @see Segment3DFromProjections in Segment3D.ts
 * @see ReconstructionConstructionService for storage
 */

import type { IOperation, JsonObject, OperationDescriptor, OperationResult } from '../IOperation';
import type { OperationContext } from '../OperationContext';
import { reconstruct3DPointFromProjections } from '@/utils/threeUtils';
import { invalidateRealization, requireDistinctProjectionPlanes, requireFeasibleProjectionPair } from './operationHelpers';

export interface Add3DSegmentDescriptor extends OperationDescriptor<'Add3DSegment'> {
  projection1Id: string;
  projection2Id: string;
  plane1Id: string;
  plane2Id: string;
  label?: string;
  visualStyle?: JsonObject;
  segmentId?: string;
}

export interface Add3DSegmentOutput extends JsonObject {
  segmentId?: string;
}

export class Add3DSegmentOp implements IOperation<Add3DSegmentDescriptor, Add3DSegmentOutput> {
  readonly type = 'Add3DSegment';
  outputs: Add3DSegmentOutput = {};

  constructor(
    private projection1Id: string,     // ID of first Segment2D projection
    private projection2Id: string,     // ID of second Segment2D projection
    private plane1Id: string,          // ID of first projection plane
    private plane2Id: string,          // ID of second projection plane
    private label?: string,            // Optional label for the segment
    private visualStyle?: any          // Optional visual style
  ) {
  }

  apply(context: OperationContext): OperationResult<Add3DSegmentOutput> {
    try {
      const { plane1, plane2 } = requireDistinctProjectionPlanes(context.world, this.plane1Id, this.plane2Id, 'segment');
      
      // Validate that projection segments exist (segments are stored as Line2D in ProjectionPlane)
      const proj1 = plane1.getLine(this.projection1Id);
      const proj2 = plane2.getLine(this.projection2Id);
      
      if (!proj1) {
        throw new Error(`Projection segment not found: ${this.projection1Id} on plane ${this.plane1Id}`);
      }
      if (!proj2) {
        throw new Error(`Projection segment not found: ${this.projection2Id} on plane ${this.plane2Id}`);
      }
      
      // Validate that projections are geometrically feasible
      const [proj1Real, proj2Real] = requireFeasibleProjectionPair('segment', proj1.realize2D(context.realizationContext), proj2.realize2D(context.realizationContext));
      
      // Phase 107: Validate compatibility — check that at least one endpoint pairing
      // produces consistent 3D points
      const plane1Real3D = context.realizations.realizeProjectionPlane3D(plane1, context.realizationContext);
      const plane2Real3D = context.realizations.realizeProjectionPlane3D(plane2, context.realizationContext);
      
      if (plane1Real3D && plane2Real3D) {
        const p1_s1 = proj1Real.point1;
        const p2_s1 = proj1Real.point2;
        const p1_s2 = proj2Real.point1;
        const p2_s2 = proj2Real.point2;
        
        // Try pairing A: (s1.p1 ↔ s2.p1) and (s1.p2 ↔ s2.p2)
        const pA_start = reconstruct3DPointFromProjections(
          p1_s1, p1_s2, plane1Real3D.threeDToPlane, plane2Real3D.threeDToPlane
        );
        const pA_end = reconstruct3DPointFromProjections(
          p2_s1, p2_s2, plane1Real3D.threeDToPlane, plane2Real3D.threeDToPlane
        );
        const pairingA_ok = pA_start.feasible && pA_end.feasible;
        
        // Try pairing B: (s1.p1 ↔ s2.p2) and (s1.p2 ↔ s2.p1)
        const pB_start = reconstruct3DPointFromProjections(
          p1_s1, p2_s2, plane1Real3D.threeDToPlane, plane2Real3D.threeDToPlane
        );
        const pB_end = reconstruct3DPointFromProjections(
          p2_s1, p1_s2, plane1Real3D.threeDToPlane, plane2Real3D.threeDToPlane
        );
        const pairingB_ok = pB_start.feasible && pB_end.feasible;
        
        if (!pairingA_ok && !pairingB_ok) {
          throw new Error(
            'Cannot create 3D segment: projections are geometrically incompatible ' +
            '(no consistent endpoint pairing found)'
          );
        }
      }
      
      const segment = context.reconstructionConstruction.addSegmentFromProjections({
        projection1Id: this.projection1Id,
        projection2Id: this.projection2Id,
        plane1Id: this.plane1Id,
        plane2Id: this.plane2Id,
        segmentId: this.outputs.segmentId,
        label: this.label,
        visualStyle: this.visualStyle,
      });
      
      this.label = segment.label;
      context.labelGenerator.reserve('Segment3D', segment.label);
      // Store outputs for undo
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

  undo(context: OperationContext): void {
    if (this.outputs.segmentId) {
      invalidateRealization(context, this.outputs.segmentId);
      context.world.deleteSegment3D(this.outputs.segmentId);
      context.dependencies.unregisterNode(this.outputs.segmentId);
    }
  }

  serialize(): Add3DSegmentDescriptor {
    return {
      opType: this.type,
      projection1Id: this.projection1Id,
      projection2Id: this.projection2Id,
      plane1Id: this.plane1Id,
      plane2Id: this.plane2Id,
      label: this.label,
      visualStyle: this.visualStyle,
      segmentId: this.outputs.segmentId
    };
  }

}

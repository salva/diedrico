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
 * @see World.add3DSegment() for storage
 */

import type { IOperation, OperationResult } from '../IOperation';
import type { World } from '@/domain/world/World';
import { Segment3DFromProjections } from '@/domain/world/Segment3D';

export class Add3DSegmentOp implements IOperation {
  readonly type = 'Add3DSegment';
  readonly parameters: Record<string, any>;
  outputs: Record<string, any> = {};

  constructor(
    private projection1Id: string,     // ID of first Segment2D projection
    private projection2Id: string,     // ID of second Segment2D projection
    private plane1Id: string,          // ID of first projection plane
    private plane2Id: string,          // ID of second projection plane
    private label?: string,            // Optional label for the segment
    private visualStyle?: any          // Optional visual style
  ) {
    this.parameters = { 
      projection1Id, 
      projection2Id, 
      plane1Id, 
      plane2Id,
      label,
      visualStyle
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
          `Cannot create 3D segment: projections must be on different planes. ` +
          `Both projections are on plane ${this.plane1Id}`
        );
      }
      
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
      const proj1Real = proj1.realize2D(world);
      const proj2Real = proj2.realize2D(world);
      
      if (!proj1Real || !proj2Real || !proj1Real.isFeasible() || !proj2Real.isFeasible()) {
        throw new Error('Cannot create 3D segment: one or both projections are not geometrically feasible');
      }
      
      // Use stored ID if available (for redo), otherwise generate new one
      const segmentId = this.outputs.segmentId || world.generate3DSegmentId();
      
      // Phase 97: Generate default label if not provided
      const label = this.label || world.generateDefaultLabel(segmentId, 'Segment3D');
      
      // Create default visual style if not provided
      const visualStyle = this.visualStyle || {
        color: '#FF6B35',    // Orange for 3D elements
        thickness: 0.003,     // Thicker than 2D segments (0.002)
        visible: true
      };
      
      // Create Segment3DFromProjections
      const segment = new Segment3DFromProjections(
        segmentId,
        label,
        this.projection1Id,
        this.projection2Id,
        this.plane1Id,
        this.plane2Id,
        visualStyle
      );
      
      // Add to World storage
      world.add3DSegment(segment);
      
      // Store outputs for undo
      this.outputs = { segmentId };
      
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
      world.remove3DSegment(this.outputs.segmentId);
    }
  }
}

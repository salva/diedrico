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

import type { IOperation, OperationResult } from '../IOperation';
import type { World } from '@/domain/world/World';
import { Point3DFromProjections } from '@/domain/world/Point3D';
import { createAdd3DPointAction } from '@/domain/processTree/actions/Element3DActions';

export class Add3DPointOp implements IOperation {
  readonly type = 'Add3DPoint';
  readonly parameters: Record<string, any>;
  outputs: Record<string, any> = {};

  constructor(
    private projection1Id: string,     // ID of first Point2D projection
    private projection2Id: string,     // ID of second Point2D projection
    private plane1Id: string,          // ID of first projection plane
    private plane2Id: string,          // ID of second projection plane
    private label?: string,            // Optional label for the point
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
      
      // Phase 78 requirement: MANDATORY different-plane validation
      // Cannot create 3D point from projections on same plane
      if (this.plane1Id === this.plane2Id) {
        throw new Error(
          `Cannot create 3D point: projections must be on different planes. ` +
          `Both projections are on plane ${this.plane1Id}`
        );
      }
      
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
      
      if (!proj1Real.isFeasible() || !proj2Real.isFeasible()) {
        throw new Error('Cannot create 3D point: one or both projections are not geometrically feasible');
      }
      
      // Use stored ID if available (for redo), otherwise generate new one
      const pointId = this.outputs.pointId || world.generate3DPointId();
      
      // Create default visual style if not provided
      const visualStyle = this.visualStyle || {
        color: '#FF6B35',    // Orange for 3D elements
        thickness: 0.015,     // Thicker than 2D points (0.01)
        visible: true
      };
      
      // Create Point3DFromProjections
      const point = new Point3DFromProjections(
        pointId,
        this.label || `Point ${pointId}`,
        this.projection1Id,
        this.projection2Id,
        this.plane1Id,
        this.plane2Id,
        visualStyle
      );
      
      // Add to World storage
      world.add3DPoint(point);
      
      // Register dependency: 3D point depends on its 2D projection points
      // This ensures cache invalidation cascades correctly when 2D projections change
      const action = createAdd3DPointAction(
        pointId,
        this.projection1Id,
        this.projection2Id,
        this.plane1Id,
        this.plane2Id,
        this.label
      );
      world.addAction(action);
      
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
}

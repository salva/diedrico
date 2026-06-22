/**
 * AddAuxiliaryProjectionPlaneOp - Create auxiliary projection plane from traces
 * 
 * Phase 82: Create Projection Plane Tool
 * 
 * Creates an AuxiliaryProjectionPlane by:
 * 1. Storing trace line IDs (dependencies), NOT transformation matrices
 * 2. Matrices computed on-demand via realize3D() using computeProjectionPlaneMatrices()
 * 3. Parametric behavior: matrices recalculate when trace lines move
 * 
 * CRITICAL DISTINCTION:
 * - AddProjectionPlaneFixedOp: Initialization only (P_H, P_V) with pre-computed matrices, no dependencies
 * - AddAuxiliaryProjectionPlaneOp: User-created planes that recompute matrices from trace dependencies
 * 
 * The operation is reversible (undo removes the plane).
 * 
 * @see AuxiliaryProjectionPlane in projectionPlane/AuxiliaryProjectionPlane.ts
 * @see computeProjectionPlaneMatrices in projectionPlaneUtils.ts
 */

import type { IOperation, OperationOutputBag, OperationResult } from '../IOperation';
import type { OperationContext } from '../OperationContext';
import { AuxiliaryProjectionPlane } from '@/domain/world/projectionPlane/AuxiliaryProjectionPlane';
import { invalidateRealization } from './operationHelpers';
import { GeometryElementLookup } from '@/domain/world/GeometryElementLookup';

export class AddAuxiliaryProjectionPlaneOp implements IOperation {
  readonly type = 'AddAuxiliaryProjectionPlane';
  outputs: OperationOutputBag = {};

  constructor(
    private plane3DId: string,              // ID of associated Plane3D
    private t1HingeTraceId: string,         // ID of hinge trace line (T1)
    private t2OtherTraceId: string,         // ID of other trace line (T2)
    private t2PrimeLineId: string,          // ID of position/orientation line (T2')
    private name?: string                   // Optional persisted name for the plane
  ) {
  }

  apply(context: OperationContext): OperationResult {
    try {
      // Validate that trace lines exist
      const lookup = new GeometryElementLookup(context.world);
      const t1Line = lookup.getLine2D(this.t1HingeTraceId);
      const t2Line = lookup.getLine2D(this.t2OtherTraceId);
      const t2PrimeLine = lookup.getLine2D(this.t2PrimeLineId);
      
      if (!t1Line) {
        throw new Error(`Hinge trace line not found: ${this.t1HingeTraceId}`);
      }
      if (!t2Line) {
        throw new Error(`Other trace line not found: ${this.t2OtherTraceId}`);
      }
      if (!t2PrimeLine) {
        throw new Error(`Position line not found: ${this.t2PrimeLineId}`);
      }
      
      // Validate that T1 and T2 are on different planes
      if (t1Line.planeId === t2Line.planeId) {
        throw new Error(
          `Cannot create auxiliary projection plane: T1 and T2 must be on different planes. ` +
          `Both are on plane ${t1Line.planeId}`
        );
      }
      
      // Validate that T2' is on the same plane as T1
      if (t2PrimeLine.planeId !== t1Line.planeId) {
        throw new Error(
          `Cannot create auxiliary projection plane: T2' must be on the same plane as T1. ` +
          `T1 is on ${t1Line.planeId}, T2' is on ${t2PrimeLine.planeId}`
        );
      }
      
      // Validate that traces are geometrically feasible
      const t1Real = t1Line.realize2D(context.realizationContext);
      const t2Real = t2Line.realize2D(context.realizationContext);
      const t2PrimeReal = t2PrimeLine.realize2D(context.realizationContext);
      
      if (!t1Real || !t2Real || !t2PrimeReal || 
          !t1Real.isFeasible() || !t2Real.isFeasible() || !t2PrimeReal.isFeasible()) {
        throw new Error('Cannot create auxiliary projection plane: one or more trace lines are not geometrically feasible');
      }
      
      // Use stored ID if available (for redo), otherwise generate new one
      const projPlaneId = this.outputs.projPlaneId || context.idAllocator.prefixed('projPlane');
      
      // Auto-generate name if not provided - use generateDefaultLabel for proper subscript formatting
      const planeName = this.name || context.labelGenerator.next('ProjectionPlane');
      
      // Create AuxiliaryProjectionPlane
      // NOTE: Stores trace IDs (dependencies), NOT matrices
      // Matrices will be computed on-demand via realizeWithWorld()
      const plane = new AuxiliaryProjectionPlane(
        projPlaneId,
        planeName,
        this.t1HingeTraceId,
        this.t2OtherTraceId,
        this.t2PrimeLineId,
        false,  // Not active by default
        true,   // Visible
        '#808080',  // Default gray
        this.plane3DId
      );
      
      // Add to World storage
      context.world.putProjectionPlane(plane);
      
      // Register with dependency service (CRITICAL for parametric updates)
      // When trace lines move, the dependency service will find this plane and invalidate it
      context.dependencies.registerNode(projPlaneId, plane.getDependencies());
      
      // Store outputs for undo
      this.outputs = { projPlaneId };
      
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
    if (this.outputs.projPlaneId) {
      invalidateRealization(context, this.outputs.projPlaneId);
      context.world.deleteProjectionPlane(this.outputs.projPlaneId);
      context.dependencies.unregisterNode(this.outputs.projPlaneId);
    }
  }

  serialize() {
    return {
      opType: this.type,
      plane3DId: this.plane3DId,
      t1HingeTraceId: this.t1HingeTraceId,
      t2OtherTraceId: this.t2OtherTraceId,
      t2PrimeLineId: this.t2PrimeLineId,
      name: this.name,
      projPlaneId: this.outputs.projPlaneId
    };
  }
}

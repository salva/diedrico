import { Matrix3 } from 'three';
import { Matrix4x3, Matrix3x4 } from '@/utils/threeUtils';
import { computeProjectionPlaneMatrices } from '@/utils/projectionPlaneUtils';
import type { ProjectionPlaneRealizationContext } from './ProjectionPlaneContext';
import { ProjectionPlane, type ProjectionPlaneType } from '@/domain/world/projectionPlane/ProjectionPlane';
import { computeBackward2DMatrix } from './ProjectionPlaneMatrixHelpers';
import { ProjectionPlaneRealization2D, ProjectionPlaneRealization3D } from './ProjectionPlaneRealization';

export class AuxiliaryProjectionPlane extends ProjectionPlane {
  readonly type: ProjectionPlaneType = 'auxiliary';

  // Dependencies for computing transformation (the RULE)
  readonly t1HingeTraceId: string;      // Trace line used as hinge (T1)
  readonly t2OtherTraceId: string;      // Other trace line on different plane (T2)
  readonly t2PrimeLineId: string;       // Position/orientation line on same plane as T1 (T2')

  constructor(
    id: string,
    name: string,
    t1HingeTraceId: string,
    t2OtherTraceId: string,
    t2PrimeLineId: string,
    isActive: boolean = false,
    isVisible: boolean = true,
    color: string = '#000000',
    plane3DId?: string
  ) {
    super(id, name, isActive, isVisible, color, plane3DId);
    this.t1HingeTraceId = t1HingeTraceId;
    this.t2OtherTraceId = t2OtherTraceId;
    this.t2PrimeLineId = t2PrimeLineId;
  }

  clone(): AuxiliaryProjectionPlane {
    return new AuxiliaryProjectionPlane(
      this.id,
      this.name,
      this.t1HingeTraceId,
      this.t2OtherTraceId,
      this.t2PrimeLineId,
      this.isActive,
      this.isVisible,
      this.color,
      this.plane3DId
    );
  }

  /**
   * Get dependencies - returns IDs of trace lines this plane depends on
   * Used for invalidation tracking when traces move
   */
  getDependencies(): string[] {
    return [this.t1HingeTraceId, this.t2OtherTraceId, this.t2PrimeLineId];
  }

  /**
   * Calculate the 3D transformation realization for this auxiliary plane
   * Computes transformation matrices from trace dependencies using computeProjectionPlaneMatrices().
   * 
   * @param context - Realization context for element lookup
   * @returns ProjectionPlaneRealization3D with computed transformation matrices
   */
  realize3D(context: ProjectionPlaneRealizationContext): ProjectionPlaneRealization3D {
    if (!this.id) {
      throw new Error('Cannot create realization for plane without ID');
    }
    
    
    try {
      // Compute transformation matrices from trace dependencies
      const matrices = computeProjectionPlaneMatrices(
        this.t1HingeTraceId,
        this.t2OtherTraceId,
        this.t2PrimeLineId,
        context
      );
      
      if (!matrices) {
        // Trace lines are not feasible - return infeasible realization
        return new ProjectionPlaneRealization3D(
          this.id,
          new Matrix4x3(),
          new Matrix3x4(),
          false
        );
      }
      
      
      return new ProjectionPlaneRealization3D(
        this.id,
        matrices.planeTo3D,
        matrices.threeDToPlane,
        true
      );
      
    } catch {
      // Return infeasible realization with fallback identity matrices
      return new ProjectionPlaneRealization3D(
        this.id,
        new Matrix4x3(),
        new Matrix3x4(),
        false
      );
    }
  }

  /**
   * Calculate the 2D realization (transformation matrices) for this auxiliary plane
   * Unlike base planes, this requires a realization context to resolve trace dependencies.
   * 
   * @param context - Realization context for element lookup
   * @returns ProjectionPlaneRealization2D with computed transformation matrices
   */
  realize2D(context: ProjectionPlaneRealizationContext): ProjectionPlaneRealization2D {
    if (!this.id) {
      throw new Error('Cannot create realization for plane without ID');
    }
    
    try {
      // Compute transformation matrices
      const matrices = computeProjectionPlaneMatrices(
        this.t1HingeTraceId,
        this.t2OtherTraceId,
        this.t2PrimeLineId,
        context
      );
      
      if (!matrices) {
        // Trace lines are not feasible - return infeasible realization
        const identityMatrix = new Matrix3();
        identityMatrix.identity();
        return new ProjectionPlaneRealization2D(
          this.id,
          identityMatrix,
          identityMatrix.clone(),
          false
        );
      }
      
      // Use shared helper to compute backward matrix with determinant check
      const { paperToPlane, feasible } = computeBackward2DMatrix(matrices.planeToPaper);
      
      return new ProjectionPlaneRealization2D(
        this.id,
        matrices.planeToPaper,
        paperToPlane,
        feasible
      );
      
    } catch {
      // Return fallback identity matrices
      const identityMatrix = new Matrix3();
      identityMatrix.identity();
      return new ProjectionPlaneRealization2D(
        this.id,
        identityMatrix,
        identityMatrix.clone(),
        false
      );
    }
  }
}

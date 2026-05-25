import { Matrix3 } from 'three';
import { Matrix4x3 } from '@/utils/threeUtils';
import type { ProjectionPlaneRealizationContext } from './ProjectionPlaneContext';
import { ProjectionPlane, type ProjectionPlaneType } from '@/domain/world/projectionPlane/ProjectionPlane';
import { ProjectionPlaneRealization2D, ProjectionPlaneRealization3D } from './ProjectionPlaneRealization';

export class FixedProjectionPlane extends ProjectionPlane {
  readonly type: ProjectionPlaneType = 'base';

  // Predetermined forward transformation matrices (part of the plane definition)
  private readonly planeToPaper2D: Matrix3;
  private readonly planeTo3D: Matrix4x3;

  constructor(
    id: string,
    name: string,
    planeToPaper2D: Matrix3,
    planeTo3D: Matrix4x3,
    isActive: boolean = false,
    isVisible: boolean = true,
    color: string = '#000000',
    plane3DId?: string
  ) {
    super(id, name, isActive, isVisible, color, plane3DId);
    this.planeToPaper2D = planeToPaper2D;
    this.planeTo3D = planeTo3D;
  }

  clone(): FixedProjectionPlane {
    return new FixedProjectionPlane(
      this.id,
      this.name,
      this.planeToPaper2D.clone(),
      this.planeTo3D.clone(),
      this.isActive,
      this.isVisible,
      this.color,
      this.plane3DId
    );
  }
  
  getDependencies(): string[] {
    return []; // Fixed planes have no dependencies on other elements
  }
  
  /**
   * Calculate the 2D transformation realization for this fixed plane
   * Computes paperToPlane2D (inverse) using shared base class helper.
   * 
   * @param _world - World instance (not used for fixed planes, but required for API uniformity)
   */
  realize2D(_context?: ProjectionPlaneRealizationContext): ProjectionPlaneRealization2D {
    if (!this.id) {
      throw new Error('Cannot create realization for plane without ID');
    }
    
    // Use shared helper to compute backward matrix with determinant check
    const { paperToPlane, feasible } = this.computeBackward2DMatrix(this.planeToPaper2D);
    
    return new ProjectionPlaneRealization2D(
      this.id,
      this.planeToPaper2D.clone(),
      paperToPlane,
      feasible
    );
  }

  /**
   * Calculate the 3D transformation realization for this fixed plane
   * Computes threeDToPlane (projection) from planeTo3D basis vectors using shared helper.
   * 
   * @param _world - World instance (not used for fixed planes, but required for API uniformity)
   */
  realize3D(_context?: ProjectionPlaneRealizationContext): ProjectionPlaneRealization3D {
    if (!this.id) {
      throw new Error('Cannot create realization for plane without ID');
    }
    
    // Use shared helper to compute backward matrix from basis vectors
    const threeDToPlane = this.computeBackward3DMatrix(this.planeTo3D);
    
    return new ProjectionPlaneRealization3D(
      this.id,
      this.planeTo3D.clone(),
      threeDToPlane,
      true  // Fixed planes are always feasible
    );
  }
}


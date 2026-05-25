import { Matrix3 } from 'three';
import { Matrix4x3, Matrix3x4 } from '@/utils/threeUtils';
import { Realization } from '../Realization';

export class ProjectionPlaneRealization2D extends Realization {
  planeId: string;
  
  // Plane-to-paper: 3x3 homogeneous matrix
  // Transforms plane (u,v) coordinates → paper (x,y) coordinates
  // Usage: [x, y, 1] = M × [u, v, 1]
  planeToPaper2D: Matrix3;
  
  // Paper-to-plane: Inverse of planeToPaper2D
  // Transforms paper (x,y) coordinates → plane (u,v) coordinates
  // Used for mouse input conversion
  paperToPlane2D: Matrix3;

  constructor(
    planeId: string,
    planeToPaper2D: Matrix3,
    paperToPlane2D: Matrix3,
    feasible: boolean = true
  ) {
    super(feasible);
    this.planeId = planeId;
    this.planeToPaper2D = planeToPaper2D;
    this.paperToPlane2D = paperToPlane2D;
  }

  /**
   * Clone this realization
   */
  clone(): ProjectionPlaneRealization2D {
    return new ProjectionPlaneRealization2D(
      this.planeId,
      this.planeToPaper2D.clone(),
      this.paperToPlane2D.clone(),
      this.feasible
    );
  }
}

/**
 * ProjectionPlaneRealization3D - Stores computed 3D transformation matrices for a ProjectionPlane
 * This is the cache of evaluated 3D plane transformation for Three.js rendering.
 * Uses Matrix4x3 for dimension-changing transforms (2D homogeneous → 3D homogeneous).
 * 
 * Phase 94: Simple data holder - stores both forward and backward matrices as public fields.
 * Computation happens in realize3D() methods of ProjectionPlane subclasses.
 */
export class ProjectionPlaneRealization3D extends Realization {
  planeId: string;
  
  // Forward: Plane (u,v,1) → 3D (x,y,z,w)
  // 4x3 matrix transforms Vector3 to Vector4 (homogeneous coordinates)
  // Usage: [x, y, z, w] = M × [u, v, 1]
  planeTo3D: Matrix4x3;
  
  // Inverse: 3D (x,y,z,w) → Plane (u,v,1)
  // 3x4 matrix transforms Vector4 to Vector3 (homogeneous coordinates)
  // Usage: [u, v, 1] = M × [x, y, z, w]
  threeDToPlane: Matrix3x4;

  constructor(
    planeId: string,
    planeTo3D: Matrix4x3,
    threeDToPlane: Matrix3x4,
    feasible: boolean = true
  ) {
    super(feasible);
    this.planeId = planeId;
    this.planeTo3D = planeTo3D;
    this.threeDToPlane = threeDToPlane;
  }

  /**
   * Clone this realization
   */
  clone(): ProjectionPlaneRealization3D {
    return new ProjectionPlaneRealization3D(
      this.planeId,
      this.planeTo3D.clone(),
      this.threeDToPlane.clone(),
      this.feasible
    );
  }
}

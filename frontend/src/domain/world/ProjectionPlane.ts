/**
 * ProjectionPlane - 2D surface where 2D elements exist
 * 
 * This class represents the DEFINITION/RULE of a projection plane.
 * Actual transformation matrices are stored in PlaneRealization objects.
 * 
 * Two types of projection planes:
 * - Base planes (P_H, P_V): Predetermined transformations (computed on-demand but constant)
 * - Auxiliary planes: Dynamic transformations computed from trace/hinge and supporting 3D plane
 * 
 * Design principles:
 * - Principle V: Transformation matrices computed and cached in realizations
 * - Base planes: Transformations are constant but stored in realization cache
 * - Auxiliary planes: Transformations computed from geometric dependencies
 * 
 * @see specs/001-dihedral-learning-mvp/data-model.md#projectionplane
 */

import { Matrix3 } from 'three';

export type ProjectionPlaneType = 'base' | 'auxiliary';

/**
 * ProjectionPlaneRealization2D - Stores computed 2D transformation matrices for a ProjectionPlane
 * This is the cache of evaluated 2D plane transformations for paper/canvas rendering.
 */
export class ProjectionPlaneRealization2D {
  planeId: string;
  
  // Plane-to-paper: 3x3 homogeneous matrix
  // Transforms plane (u,v) coordinates → paper (x,y) coordinates
  // Usage: [x, y, 1] = M × [u, v, 1]
  planeToPaper: Matrix3;
  
  // Paper-to-plane: Inverse of planeToPaper
  // Transforms paper (x,y) coordinates → plane (u,v) coordinates
  // Used for mouse input conversion
  paperToPlane: Matrix3;

  constructor(
    planeId: string,
    planeToPaper: Matrix3,
    paperToPlane: Matrix3
  ) {
    this.planeId = planeId;
    this.planeToPaper = planeToPaper;
    this.paperToPlane = paperToPlane;
  }

  /**
   * Clone this realization
   */
  clone(): ProjectionPlaneRealization2D {
    return new ProjectionPlaneRealization2D(
      this.planeId,
      this.planeToPaper.clone(),
      this.paperToPlane.clone()
    );
  }
}

/**
 * ProjectionPlaneRealization3D - Stores computed 3D transformation matrix for a ProjectionPlane
 * This is the cache of evaluated 3D plane transformation for Three.js rendering.
 */
export class ProjectionPlaneRealization3D {
  planeId: string;
  
  // 3D transformation: 3x3 matrix for 3D visualization
  // Transforms plane (u,v) → 3D space (x,y,z)
  // Takes 2D homogeneous coords [u, v, 1] directly
  // Usage: [x, y, z] = M × [u, v, 1]
  planeTo3D: Matrix3;

  constructor(
    planeId: string,
    planeTo3D: Matrix3
  ) {
    this.planeId = planeId;
    this.planeTo3D = planeTo3D;
  }

  /**
   * Clone this realization
   */
  clone(): ProjectionPlaneRealization3D {
    return new ProjectionPlaneRealization3D(
      this.planeId,
      this.planeTo3D.clone()
    );
  }
}

/**
 * Base ProjectionPlane class - represents the rule/definition of a projection plane
 */
export abstract class ProjectionPlane {
  id?: string;
  abstract readonly type: ProjectionPlaneType;
  name: string;
  isActive: boolean;
  isVisible: boolean;
  color: string;  // Hex color (#RRGGBB)
  plane3DId?: string;  // Reference to Plane3D element (geometric definition)

  constructor(
    name: string,
    isActive: boolean = false,
    isVisible: boolean = true,
    color: string = '#000000',
    plane3DId?: string
  ) {
    this.name = name;
    this.isActive = isActive;
    this.isVisible = isVisible;
    this.color = color;
    this.plane3DId = plane3DId;
  }

  /**
   * Clone this plane
   */
  abstract clone(): ProjectionPlane;

  /**
   * Calculate the 2D realization (transformation matrices) for this projection plane
   * For base planes: returns predetermined transforms
   * For auxiliary planes: computes from trace/hinge geometry
   */
  abstract realize2D(): ProjectionPlaneRealization2D;

  /**
   * Calculate the 3D realization (transformation matrix) for this projection plane
   * Transforms plane intrinsic coordinates to 3D space coordinates
   */
  abstract realize3D(): ProjectionPlaneRealization3D;
}

/**
 * BaseProjectionPlane - For P_H and P_V with predetermined transformations
 * 
 * The rule is: "this is P_H" or "this is P_V"
 * These planes have fixed positions in paper coordinate system.
 * Their transformation matrices are predetermined constants stored in the object.
 */
export class BaseProjectionPlane extends ProjectionPlane {
  readonly type: 'base' = 'base';
  
  // Predetermined transformation matrices (part of the plane definition)
  private readonly planeToPaper2D: Matrix3;
  private readonly paperToPlane2D: Matrix3;
  private readonly planeTo3D: Matrix3;

  constructor(
    name: string,
    planeToPaper2D: Matrix3,
    paperToPlane2D: Matrix3,
    planeTo3D: Matrix3,
    isActive: boolean = false,
    isVisible: boolean = true,
    color: string = '#000000',
    plane3DId?: string
  ) {
    super(name, isActive, isVisible, color, plane3DId);
    this.planeToPaper2D = planeToPaper2D;
    this.paperToPlane2D = paperToPlane2D;
    this.planeTo3D = planeTo3D;
  }

  clone(): BaseProjectionPlane {
    const cloned = new BaseProjectionPlane(
      this.name,
      this.planeToPaper2D.clone(),
      this.paperToPlane2D.clone(),
      this.planeTo3D.clone(),
      this.isActive,
      this.isVisible,
      this.color,
      this.plane3DId
    );
    if (this.id) {
      cloned.id = this.id;
    }
    return cloned;
  }

  /**
   * Create P_H (horizontal projection plane)
   * Fixed position: horizontal plane at z=0
   */
  static createPH(): BaseProjectionPlane {
    // P_H: Horizontal projection plane at z=0
    // Transform: x' = u, y' = v + 200
    // Matrix3.set() uses ROW-MAJOR: set(n11, n12, n13, n21, n22, n23, n31, n32, n33)
    // Matrix layout:
    // [n11  n12  n13]   [1  0    0]
    // [n21  n22  n23] = [0  1  200]
    // [n31  n32  n33]   [0  0    1]
    const planeToPaper = new Matrix3().set(
      1, 0, 0,      // Row 1: x' = 1*u + 0*v + 0*1
      0, 1, 200,    // Row 2: y' = 0*u + 1*v + 200*1
      0, 0, 1       // Row 3: w' = 0*u + 0*v + 1*1
    );
    
    // Compute inverse - standard matrix inversion works for any transform
    const paperToPlane = planeToPaper.clone().invert();
    
    // 3D transformation: (u,v) → (u, v, 0) in 3D
    // Matrix3.set() uses ROW-MAJOR: set(n11, n12, n13, n21, n22, n23, n31, n32, n33)
    // [x]   [1  0  0]   [u]
    // [y] = [0  1  0] × [v]
    // [z]   [0  0  0]   [1]
    const planeTo3D = new Matrix3().set(
      1, 0, 0,  // Row 1: x = u
      0, 1, 0,  // Row 2: y = v
      0, 0, 0   // Row 3: z = 0 (horizontal plane)
    );
    
    return new BaseProjectionPlane(
      'P_H',
      planeToPaper,
      paperToPlane,
      planeTo3D,
      true,   // Active by default
      true,   // Visible
      '#2196F3',  // Blue
      undefined
    );
  }

  /**
   * Create P_V (vertical projection plane)
   * Fixed position: vertical plane at y=0
   */
  static createPV(): BaseProjectionPlane {
    // P_V: Vertical projection plane at y=0
    // Transform: x' = u, y' = v - 200
    // Matrix3.set() uses ROW-MAJOR: set(n11, n12, n13, n21, n22, n23, n31, n32, n33)
    // Matrix layout:
    // [n11  n12  n13]   [1  0     0]
    // [n21  n22  n23] = [0  1  -200]
    // [n31  n32  n33]   [0  0     1]
    const planeToPaper = new Matrix3().set(
      1, 0, 0,       // Row 1: x' = 1*u + 0*v + 0*1
      0, 1, -200,    // Row 2: y' = 0*u + 1*v - 200*1
      0, 0, 1        // Row 3: w' = 0*u + 0*v + 1*1
    );
    
    // Compute inverse - standard matrix inversion works for any transform
    const paperToPlane = planeToPaper.clone().invert();
    
    // 3D transformation: (u,v) → (u, 0, v) in 3D
    // Matrix3.set() uses ROW-MAJOR: set(n11, n12, n13, n21, n22, n23, n31, n32, n33)
    // [x]   [1  0  0]   [u]
    // [y] = [0  0  0] × [v]
    // [z]   [0  1  0]   [1]
    const planeTo3D = new Matrix3().set(
      1, 0, 0,  // Row 1: x = u
      0, 0, 0,  // Row 2: y = 0 (vertical plane)
      0, 1, 0   // Row 3: z = v
    );
    
    return new BaseProjectionPlane(
      'P_V',
      planeToPaper,
      paperToPlane,
      planeTo3D,
      false,  // Not active by default
      true,   // Visible
      '#4CAF50',  // Green
      undefined
    );
  }
  
  /**
   * Calculate the 2D transformation realization for this base plane
   * Returns the predetermined transformation matrices as a realization object.
   */
  realize2D(): ProjectionPlaneRealization2D {
    if (!this.id) {
      throw new Error('Cannot create realization for plane without ID');
    }
    return new ProjectionPlaneRealization2D(
      this.id,
      this.planeToPaper2D.clone(),
      this.paperToPlane2D.clone()
    );
  }

  /**
   * Calculate the 3D transformation realization for this base plane
   * Returns the predetermined transformation matrix as a realization object.
   */
  realize3D(): ProjectionPlaneRealization3D {
    if (!this.id) {
      throw new Error('Cannot create realization for plane without ID');
    }
    return new ProjectionPlaneRealization3D(
      this.id,
      this.planeTo3D.clone()
    );
  }
}

/**
 * AuxiliaryProjectionPlane - For extra projection planes with dynamic transformations
 * 
 * The rule is: "plane defined by dependencies (hinge line + supporting 3D plane)"
 * These planes compute their transformations from geometric dependencies:
 * - The trace used as hinge line (traceH or traceV)
 * - The supporting 3D plane definition
 * 
 * The transformation is computed through geometric unfolding:
 * 1. Identify traces on P_H and P_V
 * 2. User selects which trace to use as hinge
 * 3. 180° rotation around hinge, away from origin
 * 4. Coordinate system: u along hinge, v perpendicular outward
 * 
 * Transformations are computed and cached in ProjectionPlaneRealization2D/ProjectionPlaneRealization3D, not stored here.
 */
export class AuxiliaryProjectionPlane extends ProjectionPlane {
  readonly type: 'auxiliary' = 'auxiliary';
  
  // Dependencies for computing transformation (the RULE)
  hingeLineId: string;     // ID of the trace line used as hinge (on P_H or P_V)
  hingeOnPlaneId: string;  // ID of base plane where hinge lies ('P_H' or 'P_V')

  constructor(
    name: string,
    hingeLineId: string,
    hingeOnPlaneId: string,
    isActive: boolean = false,
    isVisible: boolean = true,
    color: string = '#000000',
    plane3DId?: string
  ) {
    super(name, isActive, isVisible, color, plane3DId);
    this.hingeLineId = hingeLineId;
    this.hingeOnPlaneId = hingeOnPlaneId;
  }

  clone(): AuxiliaryProjectionPlane {
    const cloned = new AuxiliaryProjectionPlane(
      this.name,
      this.hingeLineId,
      this.hingeOnPlaneId,
      this.isActive,
      this.isVisible,
      this.color,
      this.plane3DId
    );
    if (this.id) {
      cloned.id = this.id;
    }
    return cloned;
  }

  /**
   * Calculate the 2D transformation realization for this auxiliary plane
   * Computes transformation matrices from hinge line and supporting 3D plane geometry.
   * 
   * TODO: Implement geometric computation:
   * 1. Get hinge line realization from context
   * 2. Compute 180° rotation around hinge
   * 3. Build coordinate system (u along hinge, v perpendicular)
   * 4. Generate planeToPaper and paperToPlane matrices
   */
  realize2D(): ProjectionPlaneRealization2D {
    if (!this.id) {
      throw new Error('Cannot create realization for plane without ID');
    }
    
    // TODO: Implement computation from hingeLineId and hingeOnPlaneId
    // For now, throw error since auxiliary planes are not yet supported
    throw new Error('Auxiliary projection plane realization not yet implemented');
  }

  /**
   * Calculate the 3D transformation realization for this auxiliary plane
   * Computes transformation matrix from hinge line and supporting 3D plane geometry.
   */
  realize3D(): ProjectionPlaneRealization3D {
    if (!this.id) {
      throw new Error('Cannot create realization for plane without ID');
    }
    
    // TODO: Implement computation from hingeLineId and hingeOnPlaneId
    // For now, throw error since auxiliary planes are not yet supported
    throw new Error('Auxiliary projection plane 3D realization not yet implemented');
  }
}

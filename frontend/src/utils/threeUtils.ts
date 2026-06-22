/**
 * threeUtils - Non-destructive wrappers for Three.js algebraic operations
 * 
 * Three.js operations like applyMatrix3, invert, normalize, etc. are destructive
 * (they modify the object in-place). This module provides non-destructive versions
 * that clone the input before applying the operation.
 * 
 * Benefits:
 * - Cleaner code without explicit .clone() calls everywhere
 * - Safer - prevents accidental mutations
 * - More functional programming style
 */

import { Matrix3, Vector3, Vector4 } from 'three';

/**
 * Apply a 3x3 matrix transformation to a vector (non-destructive)
 * Returns a new vector with the transformation applied
 */
export function applyMatrix3(vector: Vector3, matrix: Matrix3): Vector3 {
  return vector.clone().applyMatrix3(matrix);
}

/**
 * Compute cross product of two Vector4 objects (treating as 3D vectors, ignoring w)
 * Returns a new Vector4 with the cross product (w=0 for direction vector)
 */
export function crossVector3Homogeneous(v1: Vector4, v2: Vector4): Vector4 {
  return new Vector4(
    v1.y * v2.z - v1.z * v2.y,
    v1.z * v2.x - v1.x * v2.z,
    v1.x * v2.y - v1.y * v2.x,
    0 // Cross product is a direction, not a point
  );
}

/**
 * Compute dot (scalar) product of two Vector4 objects (treating as 3D vectors, ignoring w)
 * Returns the scalar dot product: v1.x * v2.x + v1.y * v2.y + v1.z * v2.z
 */
export function dotVector3Homogeneous(v1: Vector4, v2: Vector4): number {
  return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
}

/**
 * Compute dot (scalar) product of two Vector3 objects (treating as 2D vectors, ignoring z)
 * Returns the scalar dot product: v1.x * v2.x + v1.y * v2.y
 */
export function dotVector2Homogeneous(v1: Vector3, v2: Vector3): number {
  return v1.x * v2.x + v1.y * v2.y;
}

/**
 * Create a new Vector3 from x, y coordinates (z defaults to 0)
 * Convenience function for 2D operations
 */
export function vec3(x: number, y: number, z: number = 0): Vector3 {
  return new Vector3(x, y, z);
}

/**
 * Create a new Vector4 from x, y, z, w coordinates
 * Convenience function for homogeneous 3D operations
 */
export function vec4(x: number, y: number, z: number, w: number = 1): Vector4 {
  return new Vector4(x, y, z, w);
}

/**
 * Matrix4x3 - 4x3 matrix for transformations between 2D and 3D coordinates
 * Stored in column-major order as a flat array of 12 elements
 * 
 * Matrix layout:
 * [ m11 m12 m13 ]
 * [ m21 m22 m23 ]
 * [ m31 m32 m33 ]
 * [ m41 m42 m43 ]
 */
export class Matrix4x3 {
  elements: number[];

  constructor() {
    // Initialize to identity-like matrix (4x3)
    this.elements = [
      1, 0, 0,
      0, 1, 0,
      0, 0, 1,
      0, 0, 0
    ];
  }

  /**
   * Set matrix elements (row-major order for convenience)
   */
  set(
    m11: number, m12: number, m13: number,
    m21: number, m22: number, m23: number,
    m31: number, m32: number, m33: number,
    m41: number, m42: number, m43: number
  ): Matrix4x3 {
    const e = this.elements;
    e[0] = m11; e[1] = m12; e[2] = m13;
    e[3] = m21; e[4] = m22; e[5] = m23;
    e[6] = m31; e[7] = m32; e[8] = m33;
    e[9] = m41; e[10] = m42; e[11] = m43;
    return this;
  }

  /**
   * Clone this matrix
   */
  clone(): Matrix4x3 {
    const m = new Matrix4x3();
    m.elements = [...this.elements];
    return m;
  }

  /**
   * Convert matrix to array (for serialization)
   */
  toArray(): number[] {
    return [...this.elements];
  }

  /**
   * Set matrix from array (for deserialization)
   */
  fromArray(array: number[]): Matrix4x3 {
    if (array.length !== 12) {
      throw new Error('Matrix4x3.fromArray: array must have 12 elements');
    }
    this.elements = [...array];
    return this;
  }
}

/**
 * Create a 4x3 matrix from elements (row-major order)
 */
export function mat4x3(
  m11: number, m12: number, m13: number,
  m21: number, m22: number, m23: number,
  m31: number, m32: number, m33: number,
  m41: number, m42: number, m43: number
): Matrix4x3 {
  return new Matrix4x3().set(m11, m12, m13, m21, m22, m23, m31, m32, m33, m41, m42, m43);
}

/**
 * Apply a 4x3 matrix transformation to a Vector3, resulting in a Vector4
 * Used for 2D → 3D coordinate transformations
 * 
 * @param vector Input 3D vector (typically homogeneous 2D: u, v, 1)
 * @param matrix 4x3 transformation matrix
 * @returns New 4D vector (homogeneous 3D: x, y, z, w) in DOMAIN coordinates
 */
export function applyMatrix4x3(vector: Vector3, matrix: Matrix4x3): Vector4 {
  const e = matrix.elements;
  const x = vector.x;
  const y = vector.y;
  const z = vector.z;

  return new Vector4(
    e[0] * x + e[1] * y + e[2] * z,
    e[3] * x + e[4] * y + e[5] * z,
    e[6] * x + e[7] * y + e[8] * z,
    e[9] * x + e[10] * y + e[11] * z
  );
}

/**
 * Convert domain coordinates to Three.js rendering coordinates
 * 
 * The domain model uses a LEFT-HANDED coordinate system (Monge projection)
 * where the viewer is at (0, -∞, 0) looking along +Y toward the origin.
 * 
 * Three.js uses a RIGHT-HANDED coordinate system.
 * 
 * Conversion: threeY = -domainY (invert Y-axis)
 * 
 * @param domainPosition Position in domain coordinates (Vector4 with homogeneous w)
 * @returns Position in Three.js coordinates (Vector3)
 */
export function domainToThreeJS(domainPosition: Vector4): Vector3 {
  return new Vector3(
    domainPosition.x,
    -domainPosition.y,  // Invert Y-axis for right-handed system
    domainPosition.z
  );
}

/**
 * Convert domain direction vector to Three.js rendering coordinates
 * 
 * Same as domainToThreeJS but for direction vectors (no homogeneous coordinate)
 * 
 * @param domainDirection Direction in domain coordinates (Vector3)
 * @returns Direction in Three.js coordinates (Vector3)
 */
export function domainDirectionToThreeJS(domainDirection: Vector3): Vector3 {
  return new Vector3(
    domainDirection.x,
    -domainDirection.y,  // Invert Y-axis for right-handed system
    domainDirection.z
  );
}

/**
 * Matrix3x4 - 3x4 matrix for transformations between 3D and 2D coordinates
 * Stored in column-major order as a flat array of 12 elements
 * 
 * Matrix layout:
 * [ m11 m12 m13 m14 ]
 * [ m21 m22 m23 m24 ]
 * [ m31 m32 m33 m34 ]
 */
export class Matrix3x4 {
  elements: number[];

  constructor() {
    // Initialize to identity-like matrix (3x4)
    this.elements = [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0
    ];
  }

  /**
   * Set matrix elements (row-major order for convenience)
   */
  set(
    m11: number, m12: number, m13: number, m14: number,
    m21: number, m22: number, m23: number, m24: number,
    m31: number, m32: number, m33: number, m34: number
  ): Matrix3x4 {
    const e = this.elements;
    e[0] = m11; e[1] = m12; e[2] = m13; e[3] = m14;
    e[4] = m21; e[5] = m22; e[6] = m23; e[7] = m24;
    e[8] = m31; e[9] = m32; e[10] = m33; e[11] = m34;
    return this;
  }

  /**
   * Clone this matrix
   */
  clone(): Matrix3x4 {
    const m = new Matrix3x4();
    m.elements = [...this.elements];
    return m;
  }

  /**
   * Convert matrix to array (for serialization)
   */
  toArray(): number[] {
    return [...this.elements];
  }

  /**
   * Set matrix from array (for deserialization)
   */
  fromArray(array: number[]): Matrix3x4 {
    if (array.length !== 12) {
      throw new Error('Matrix3x4.fromArray: array must have 12 elements');
    }
    this.elements = [...array];
    return this;
  }
}

/**
 * Create a 3x4 matrix from elements (row-major order)
 */
export function mat3x4(
  m11: number, m12: number, m13: number, m14: number,
  m21: number, m22: number, m23: number, m24: number,
  m31: number, m32: number, m33: number, m34: number
): Matrix3x4 {
  return new Matrix3x4().set(m11, m12, m13, m14, m21, m22, m23, m24, m31, m32, m33, m34);
}

/**
 * Apply a 3x4 matrix transformation to a Vector4, resulting in a Vector3
 * Used for 3D → 2D coordinate transformations (projection)
 * 
 * @param vector Input 4D vector (homogeneous 3D: x, y, z, w)
 * @param matrix 3x4 transformation matrix
 * @returns New 3D vector (homogeneous 2D: u, v, 1)
 */
export function applyMatrix3x4(vector: Vector4, matrix: Matrix3x4): Vector3 {
  const e = matrix.elements;
  const x = vector.x;
  const y = vector.y;
  const z = vector.z;
  const w = vector.w;

  return new Vector3(
    e[0] * x + e[1] * y + e[2] * z + e[3] * w,
    e[4] * x + e[5] * y + e[6] * z + e[7] * w,
    e[8] * x + e[9] * y + e[10] * z + e[11] * w
  );
}

/**
 * Result of reconstructing a 3D point from two 2D projections
 */
export interface ReconstructionResult {
  point: Vector4;        // Reconstructed 3D point (x, y, z, 1)
  feasible: boolean;     // Whether reconstruction is consistent
  error: number;         // Consistency error (4th equation residual)
}

/**
 * Reconstruct a 3D point from two 2D projections on different planes.
 * 
 * Uses the same mathematical formulation as Point3DFromProjections:
 * - Each plane's threeDToPlane matrix provides 2 equations (u and v rows)
 * - Together: 4 equations with 3 unknowns (overdetermined)
 * - Picks the 3-equation subset with largest |det| for numerical stability
 * - Solves via Cramer's rule
 * - Checks consistency with unused 4th equation
 * 
 * @param pos2D_plane1 2D position on plane1 (u₁, v₁, 1)
 * @param pos2D_plane2 2D position on plane2 (u₂, v₂, 1)
 * @param threeDToPlane1 Projection matrix for plane1 (3x4)
 * @param threeDToPlane2 Projection matrix for plane2 (3x4)
 * @param tolerance Consistency check tolerance (default 1e-6)
 * @returns ReconstructionResult with point, feasibility, and error
 */
export function reconstruct3DPointFromProjections(
  pos2D_plane1: Vector3,
  pos2D_plane2: Vector3,
  threeDToPlane1: Matrix3x4,
  threeDToPlane2: Matrix3x4,
  tolerance: number = 1e-6
): ReconstructionResult {
  const M1 = threeDToPlane1.elements;
  const M2 = threeDToPlane2.elements;

  // Extract coefficients from threeDToPlane matrices (row-major)
  // Row 1 (u equation): elements[0..3] → u = M[0]*x + M[1]*y + M[2]*z + M[3]
  // Row 2 (v equation): elements[4..7] → v = M[4]*x + M[5]*y + M[6]*z + M[7]
  const a11 = M1[0], a12 = M1[1], a13 = M1[2], a14 = M1[3];
  const a21 = M1[4], a22 = M1[5], a23 = M1[6], a24 = M1[7];
  const b11 = M2[0], b12 = M2[1], b13 = M2[2], b14 = M2[3];
  const b21 = M2[4], b22 = M2[5], b23 = M2[6], b24 = M2[7];

  // Compute determinants for both possible 3-equation subsets
  const det3 = computeDet3x3(
    a11, a12, a13,
    a21, a22, a23,
    b11, b12, b13
  );
  const det4 = computeDet3x3(
    a11, a12, a13,
    a21, a22, a23,
    b21, b22, b23
  );

  const useEq3 = Math.abs(det3) > Math.abs(det4);
  const det = useEq3 ? det3 : det4;

  if (Math.abs(det) < 1e-10) {
    return { point: new Vector4(0, 0, 0, 1), feasible: false, error: Infinity };
  }

  // Build coefficient matrix and RHS vector for chosen equation set
  const A = useEq3
    ? [a11, a12, a13, a21, a22, a23, b11, b12, b13]
    : [a11, a12, a13, a21, a22, a23, b21, b22, b23];

  const b = useEq3
    ? [pos2D_plane1.x - a14, pos2D_plane1.y - a24, pos2D_plane2.x - b14]
    : [pos2D_plane1.x - a14, pos2D_plane1.y - a24, pos2D_plane2.y - b24];

  // Solve using Cramer's rule
  const detX = computeDet3x3(b[0], A[1], A[2], b[1], A[4], A[5], b[2], A[7], A[8]);
  const detY = computeDet3x3(A[0], b[0], A[2], A[3], b[1], A[5], A[6], b[2], A[8]);
  const detZ = computeDet3x3(A[0], A[1], b[0], A[3], A[4], b[1], A[6], A[7], b[2]);

  const x = detX / det;
  const y = detY / det;
  const z = detZ / det;

  // Verify consistency with unused equation
  const checkCoeffs = useEq3 ? [b21, b22, b23, b24] : [b11, b12, b13, b14];
  const checkValue_actual = useEq3 ? pos2D_plane2.y : pos2D_plane2.x;
  const checkValue_computed = checkCoeffs[0] * x + checkCoeffs[1] * y + checkCoeffs[2] * z + checkCoeffs[3];
  const error = Math.abs(checkValue_computed - checkValue_actual);

  return {
    point: new Vector4(x, y, z, 1),
    feasible: error <= tolerance,
    error
  };
}

/**
 * Compute determinant of a 3x3 matrix given elements in row-major order
 */
function computeDet3x3(
  a: number, b: number, c: number,
  d: number, e: number, f: number,
  g: number, h: number, i: number
): number {
  return a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
}

/**
 * Intersect a 3D line (point + direction) with a 3D plane (point + normal).
 * 
 * Uses parametric form: intersection = linePoint + t * lineDir
 * where t = dot(planePoint - linePoint, planeNormal) / dot(lineDir, planeNormal)
 * 
 * @returns The intersection point as Vector4 (w=1), or null if line is parallel to plane
 */
export function intersectLinePlane3D(
  linePoint: Vector4, lineDir: { x: number; y: number; z: number },
  planePoint: Vector4, planeNormal: { x: number; y: number; z: number }
): Vector4 | null {
  const denom = lineDir.x * planeNormal.x + lineDir.y * planeNormal.y + lineDir.z * planeNormal.z;

  if (Math.abs(denom) < 1e-10) {
    return null; // Line is parallel to plane (or lies in plane)
  }

  const dx = planePoint.x - linePoint.x;
  const dy = planePoint.y - linePoint.y;
  const dz = planePoint.z - linePoint.z;
  const t = (dx * planeNormal.x + dy * planeNormal.y + dz * planeNormal.z) / denom;

  return new Vector4(
    linePoint.x + t * lineDir.x,
    linePoint.y + t * lineDir.y,
    linePoint.z + t * lineDir.z,
    1
  );
}

/**
 * Intersect a 3D segment (two endpoints) with a 3D plane (point + normal).
 * Same as line-plane intersection but restricts parameter t to [0, 1].
 * 
 * @returns The intersection point as Vector4 (w=1), or null if segment doesn't cross plane
 */
export function intersectSegmentPlane3D(
  segStart: Vector4, segEnd: Vector4,
  planePoint: Vector4, planeNormal: { x: number; y: number; z: number }
): Vector4 | null {
  const dirX = segEnd.x - segStart.x;
  const dirY = segEnd.y - segStart.y;
  const dirZ = segEnd.z - segStart.z;

  const denom = dirX * planeNormal.x + dirY * planeNormal.y + dirZ * planeNormal.z;

  if (Math.abs(denom) < 1e-10) {
    return null; // Segment is parallel to plane
  }

  const dx = planePoint.x - segStart.x;
  const dy = planePoint.y - segStart.y;
  const dz = planePoint.z - segStart.z;
  const t = (dx * planeNormal.x + dy * planeNormal.y + dz * planeNormal.z) / denom;

  if (t < -1e-10 || t > 1 + 1e-10) {
    return null; // Intersection outside segment bounds
  }

  return new Vector4(
    segStart.x + t * dirX,
    segStart.y + t * dirY,
    segStart.z + t * dirZ,
    1
  );
}

/**
 * Check if a 3D point lies on a 3D plane within tolerance.
 * Tests: |dot(point - planePoint, planeNormal)| < tolerance
 */
export function isPointOnPlane3D(
  point: Vector4,
  planePoint: Vector4,
  planeNormal: { x: number; y: number; z: number },
  tolerance: number = 0.5
): boolean {
  const dx = point.x - planePoint.x;
  const dy = point.y - planePoint.y;
  const dz = point.z - planePoint.z;
  const dist = Math.abs(dx * planeNormal.x + dy * planeNormal.y + dz * planeNormal.z);
  return dist < tolerance;
}

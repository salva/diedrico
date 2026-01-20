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
 * Invert a matrix (non-destructive)
 * Returns a new matrix that is the inverse of the input
 */
export function invert(matrix: Matrix3): Matrix3 {
  return matrix.clone().invert();
}

/**
 * Normalize a vector (non-destructive)
 * Returns a new vector with length 1 in the same direction
 */
export function normalize(vector: Vector3): Vector3 {
  return vector.clone().normalize();
}

/**
 * Add two vectors (non-destructive)
 * Returns a new vector that is the sum of the inputs
 */
export function add(v1: Vector3, v2: Vector3): Vector3 {
  return v1.clone().add(v2);
}

/**
 * Subtract two vectors (non-destructive)
 * Returns a new vector v1 - v2
 */
export function sub(v1: Vector3, v2: Vector3): Vector3 {
  return v1.clone().sub(v2);
}

/**
 * Multiply vector by scalar (non-destructive)
 * Returns a new vector scaled by the scalar
 */
export function multiplyScalar(vector: Vector3, scalar: number): Vector3 {
  return vector.clone().multiplyScalar(scalar);
}

/**
 * Compute dot product of two vectors
 * This operation is already non-destructive in Three.js
 */
export function dot(v1: Vector3, v2: Vector3): number {
  return v1.dot(v2);
}

/**
 * Compute cross product of two vectors (non-destructive)
 * Returns a new vector perpendicular to both inputs
 */
export function cross(v1: Vector3, v2: Vector3): Vector3 {
  return v1.clone().cross(v2);
}

/**
 * Get vector length
 * This operation is already non-destructive in Three.js
 */
export function length(vector: Vector3): number {
  return vector.length();
}

/**
 * Multiply two matrices (non-destructive)
 * Returns a new matrix that is m1 * m2
 */
export function multiply(m1: Matrix3, m2: Matrix3): Matrix3 {
  return m1.clone().multiply(m2);
}

/**
 * Create a new Vector3 from x, y coordinates (z defaults to 0)
 * Convenience function for 2D operations
 */
export function vec3(x: number, y: number, z: number = 0): Vector3 {
  return new Vector3(x, y, z);
}

/**
 * Create a new Matrix3 from array elements in row-major order
 * Matrix3.set() takes parameters in ROW-MAJOR order: set(n11, n12, n13, n21, n22, n23, n31, n32, n33)
 * Input:  m11 m12 m13   (row 1)
 *         m21 m22 m23   (row 2)  
 *         m31 m32 m33   (row 3)
 * This helper just passes through to set() since it already expects row-major.
 */
export function mat3(
  m11: number, m12: number, m13: number,
  m21: number, m22: number, m23: number,
  m31: number, m32: number, m33: number
): Matrix3 {
  return new Matrix3().set(m11, m12, m13, m21, m22, m23, m31, m32, m33);
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
 * @see specs/001-dihedral-learning-mvp/data-model.md §Coordinate System Note
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

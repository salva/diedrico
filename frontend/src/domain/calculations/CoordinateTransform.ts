/**
 * CoordinateTransform - Transformation utilities for coordinate systems
 * 
 * Handles transformations between three coordinate spaces:
 * 1. Plane3D intrinsic <u,v> - stored coordinates
 * 2. Canvas (x_canvas, y_canvas) - 2D rendering
 * 3. 3D world (x,y,z) - 3D visualization
 * 
 * ALL transformations MUST use homogeneous coordinates [x, y, 1]
 * per Constitution Principle V.
 * 
 * Transformation flow:
 * Plane3D intrinsic <u,v> ↔ Canvas (x,y) ↔ Viewport
 * Plane3D intrinsic <u,v> → 3D world (x,y,z)
 * 
 * @see specs/001-dihedral-learning-mvp/data-model.md#coordinate-systems-and-transformations
 */

import type { Plane3DCoordinateSystem } from '../world/Plane';

/**
 * 3x3 matrix for 2D homogeneous transformations
 * Format: [a, c, e]  // First row
 *         [b, d, f]  // Second row
 *         [0, 0, 1]  // Third row (implicit)
 */
export type Matrix3 = [
  number, number, number,  // Row 1: a, c, e
  number, number, number   // Row 2: b, d, f
];

/**
 * 4D homogeneous coordinates [x, y, z, w]
 * Used for 3D world space transformations
 */
export type Vector3D = [number, number, number, number];

/**
 * Transform plane intrinsic coordinates <u,v> to canvas coordinates
 * 
 * Uses the plane's planeToPaper2D transformation matrix which encodes
 * the geometric relationship between plane coordinates and canvas.
 * This makes the transformation independent of plane labels/names.
 * 
 * For backward compatibility with tests, also accepts string plane names.
 * 
 * @param u Plane3D intrinsic u coordinate
 * @param v Plane3D intrinsic v coordinate
 * @param planeToPaper2DOrName The plane's transformation matrix OR plane name (for tests only!)
 * @param canvasOriginX Canvas origin X (default 400)
 * @param canvasOriginY Canvas origin Y (default 400)
 * @returns [x_canvas, y_canvas]
 */
export function planeToCanvas(
  u: number,
  v: number,
  planeToPaper2DOrName: { elements: number[] } | Float32Array | number[] | string,
  canvasOriginX: number = 400,
  canvasOriginY: number = 400
): [number, number] {
  // Backward compat: if string, use old logic (FOR TESTS ONLY!)
  if (typeof planeToPaper2DOrName === 'string') {
    // WARNING: Using plane name for logic - only for test compatibility
    // Production code should pass transformation matrix
    if (planeToPaper2DOrName === 'P_H') {
      return [canvasOriginX + u, canvasOriginY + v];
    } else {
      return [canvasOriginX + u, canvasOriginY - v];
    }
  }
  
  // Extract matrix elements
  const m = Array.isArray(planeToPaper2DOrName) ? planeToPaper2DOrName : 
           'elements' in planeToPaper2DOrName ? planeToPaper2DOrName.elements : 
           Array.from(planeToPaper2DOrName as Float32Array);
  
  // Apply 2D homogeneous transformation: [x, y, 1] = M × [u, v, 1]
  // Matrix layout: [m0, m3, m6]
  //                [m1, m4, m7]
  //                [m2, m5, m8]
  // NOTE: The matrix already includes canvas origin translation,
  // so we do NOT add canvasOriginX/Y here
  const x = m[0] * u + m[3] * v + m[6];
  const y = m[1] * u + m[4] * v + m[7];
  
  return [x, y];
}

/**
 * Transform canvas coordinates to plane intrinsic coordinates <u,v>
 * 
 * Uses the plane's paperToPlane2D transformation matrix (inverse of planeToPaper2D)
 * which encodes the geometric relationship. Independent of plane labels.
 * 
 * For backward compatibility with tests, also accepts string plane names.
 * 
 * @param x Canvas X coordinate
 * @param y Canvas Y coordinate
 * @param paperToPlane2DOrName The plane's inverse transformation matrix OR plane name (for tests only!)
 * @param canvasOriginX Canvas origin X (default 400)
 * @param canvasOriginY Canvas origin Y (default 400)
 * @returns [u, v] in plane intrinsic coordinates
 */
export function canvasToPlane(
  x: number,
  y: number,
  paperToPlane2DOrName: { elements: number[] } | Float32Array | number[] | string,
  canvasOriginX: number = 400,
  canvasOriginY: number = 400
): [number, number] {
  // Backward compat: if string, use old logic (FOR TESTS ONLY!)
  if (typeof paperToPlane2DOrName === 'string') {
    // WARNING: Using plane name for logic - only for test compatibility
    // Production code should pass transformation matrix
    if (paperToPlane2DOrName === 'P_H') {
      return [x - canvasOriginX, y - canvasOriginY];
    } else {
      return [x - canvasOriginX, -(y - canvasOriginY)];
    }
  }
  
  // Extract matrix elements
  const m = Array.isArray(paperToPlane2DOrName) ? paperToPlane2DOrName : 
           'elements' in paperToPlane2DOrName ? paperToPlane2DOrName.elements : 
           Array.from(paperToPlane2DOrName as Float32Array);
  
  // Apply 2D homogeneous transformation: [u, v, 1] = M × [x, y, 1]
  const u = m[0] * x + m[3] * y + m[6];
  const v = m[1] * x + m[4] * y + m[7];
  
  return [u, v];
}

/**
 * Transform plane intrinsic coordinates to 3D world coordinates
 * 
 * Uses the plane's coordinate system to compute 3D position:
 * P_3D = origin + u * uAxis + v * vAxis
 * 
 * @param u Plane3D intrinsic u coordinate
 * @param v Plane3D intrinsic v coordinate
 * @param coordinateSystem Plane3D's coordinate system
 * @returns 3D world coordinates [x, y, z, 1]
 */
export function planeTo3D(
  u: number,
  v: number,
  coordinateSystem: Plane3DCoordinateSystem
): Vector3D {
  const { origin, uAxis, vAxis } = coordinateSystem;
  
  // Handle both Vector4 objects and array-like structures
  const getCoord = (v: any, axis: 'x' | 'y' | 'z'): number => {
    if (typeof v === 'object' && v !== null) {
      // Check for Vector4-like object
      if (axis in v) return v[axis];
      // Check for array-like [x, y, z, w]
      const idx = axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
      if (typeof v[idx] === 'number') return v[idx];
    }
    return 0;
  };
  
  return [
    getCoord(origin, 'x') + u * getCoord(uAxis, 'x') + v * getCoord(vAxis, 'x'),
    getCoord(origin, 'y') + u * getCoord(uAxis, 'y') + v * getCoord(vAxis, 'y'),
    getCoord(origin, 'z') + u * getCoord(uAxis, 'z') + v * getCoord(vAxis, 'z'),
    1
  ];
}

/**
 * Create a 2D translation matrix
 * Homogeneous transformation: translate by (tx, ty)
 */
export function createTranslationMatrix(tx: number, ty: number): Matrix3 {
  return [
    1, 0, tx,
    0, 1, ty
  ];
}

/**
 * Create a 2D scaling matrix
 * Homogeneous transformation: scale by (sx, sy)
 */
export function createScaleMatrix(sx: number, sy: number): Matrix3 {
  return [
    sx, 0, 0,
    0, sy, 0
  ];
}

/**
 * Create a combined pan/zoom transformation matrix
 * Used for viewport transformations in Phase 6
 */
export function createViewportMatrix(
  panX: number,
  panY: number,
  zoom: number
): Matrix3 {
  return [
    zoom, 0, panX,
    0, zoom, panY
  ];
}

/**
 * Multiply two 3x3 matrices
 * Used to compose transformations
 */
export function multiplyMatrices(a: Matrix3, b: Matrix3): Matrix3 {
  // Matrix multiplication for homogeneous 2D transforms
  // Result = A * B
  return [
    a[0] * b[0] + a[1] * b[3],           // r00
    a[0] * b[1] + a[1] * b[4],           // r01
    a[0] * b[2] + a[1] * b[5] + a[2],    // r02
    a[3] * b[0] + a[4] * b[3],           // r10
    a[3] * b[1] + a[4] * b[4],           // r11
    a[3] * b[2] + a[4] * b[5] + a[5]     // r12
  ];
}

/**
 * Apply a transformation matrix to a point
 * Point must be in homogeneous coordinates [x, y, 1]
 */
export function applyMatrix(
  matrix: Matrix3,
  x: number,
  y: number
): [number, number] {
  return [
    matrix[0] * x + matrix[1] * y + matrix[2],  // x'
    matrix[3] * x + matrix[4] * y + matrix[5]   // y'
  ];
}

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
 * For P_H: u → x_canvas, v → y_canvas
 * For P_V: u → x_canvas, v → -y_canvas (flip because Z is up, canvas Y is down)
 * 
 * @param u Plane3D intrinsic u coordinate
 * @param v Plane3D intrinsic v coordinate
 * @param planeId Which plane ('plane_H' or 'plane_V')
 * @param canvasOriginX Canvas origin X (default 400)
 * @param canvasOriginY Canvas origin Y (default 400)
 * @returns [x_canvas, y_canvas]
 */
export function planeToCanvas(
  u: number,
  v: number,
  planeId: string,
  canvasOriginX: number = 400,
  canvasOriginY: number = 400
): [number, number] {
  // Normalize plane ID (handle both plane_H and proj_plane_H)
  const normalizedId = planeId.replace('proj_', '');
  
  if (normalizedId === 'plane_H') {
    // P_H: horizontal plane, straightforward mapping
    // u → x, v → y (no flip, Y is already aligned)
    return [
      canvasOriginX + u,
      canvasOriginY + v
    ];
  } else if (normalizedId === 'plane_V') {
    // P_V: vertical plane, u → x, v → z (which maps to -y_canvas because Z is up)
    return [
      canvasOriginX + u,
      canvasOriginY - v  // Flip because Z is up, canvas Y is down
    ];
  }
  
  // For other planes, use vertical plane mapping for now
  return [
    canvasOriginX + u,
    canvasOriginY - v
  ];
}

/**
 * Transform canvas coordinates to plane intrinsic coordinates <u,v>
 * 
 * Inverse of planeToCanvas
 * 
 * @param x Canvas X coordinate
 * @param y Canvas Y coordinate
 * @param planeId Which plane ('plane_H' or 'plane_V')
 * @param canvasOriginX Canvas origin X (default 400)
 * @param canvasOriginY Canvas origin Y (default 400)
 * @returns [u, v] in plane intrinsic coordinates
 */
export function canvasToPlane(
  x: number,
  y: number,
  planeId: string,
  canvasOriginX: number = 400,
  canvasOriginY: number = 400
): [number, number] {
  // Normalize plane ID (handle both plane_H and proj_plane_H)
  const normalizedId = planeId.replace('proj_', '');
  
  if (normalizedId === 'plane_H') {
    return [
      x - canvasOriginX,
      y - canvasOriginY
    ];
  } else if (normalizedId === 'plane_V') {
    return [
      x - canvasOriginX,
      -(y - canvasOriginY)  // Flip back
    ];
  }
  
  // For other planes
  return [
    x - canvasOriginX,
    -(y - canvasOriginY)
  ];
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

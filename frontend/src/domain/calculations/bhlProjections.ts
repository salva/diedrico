/**
 * BHL (Broken Hinge Line) Projection Calculations
 * 
 * Computes the projections of broken hinge lines (intersections of arbitrary 3D planes)
 * onto the projection planes (P_H and P_V).
 */

import { Point2D, Line2D, Plane3D } from '@/types/ElementTypes';

/**
 * Line representation in 2D space (for calculations)
 */
export interface Line2DGeometry {
  point1: { x: number; y: number };
  point2: { x: number; y: number };
}

/**
 * 3D plane equation: ax + by + cz = d
 */
export interface Plane3DEquation {
  a: number;
  b: number;
  c: number;
  d: number;
}

/**
 * 3D line parametric representation: P(t) = origin + t * direction
 */
export interface Line3DParametric {
  origin: { x: number; y: number; z: number };
  direction: { x: number; y: number; z: number };
}

/**
 * Compute the intersection line of two 3D planes in parametric form
 * 
 * @param plane1 First 3D plane equation
 * @param plane2 Second 3D plane equation
 * @returns Parametric line representation of intersection, or null if planes are parallel
 */
export function intersectPlanes3D(
  plane1: Plane3DEquation,
  plane2: Plane3DEquation
): Line3DParametric | null {
  // Direction vector of intersection line is perpendicular to both plane normals
  // direction = normal1 × normal2
  const n1 = { x: plane1.a, y: plane1.b, z: plane1.c };
  const n2 = { x: plane2.a, y: plane2.b, z: plane2.c };
  
  const direction = {
    x: n1.y * n2.z - n1.z * n2.y,
    y: n1.z * n2.x - n1.x * n2.z,
    z: n1.x * n2.y - n1.y * n2.x
  };
  
  // Check if planes are parallel (cross product is zero)
  const dirMagnitude = Math.sqrt(
    direction.x * direction.x +
    direction.y * direction.y +
    direction.z * direction.z
  );
  
  if (dirMagnitude < 1e-10) {
    return null; // Planes are parallel
  }
  
  // Normalize direction vector
  direction.x /= dirMagnitude;
  direction.y /= dirMagnitude;
  direction.z /= dirMagnitude;
  
  // Find a point on the intersection line
  // Choose the coordinate plane where we'll solve for a point
  let origin: { x: number; y: number; z: number };
  
  // Try to find a point by setting one coordinate to 0
  if (Math.abs(direction.x) > 1e-6 && Math.abs(direction.y) > 1e-6) {
    // Solve for z=0
    // plane1: a1*x + b1*y = d1
    // plane2: a2*x + b2*y = d2
    const det = plane1.a * plane2.b - plane2.a * plane1.b;
    if (Math.abs(det) > 1e-10) {
      const x = (plane1.d * plane2.b - plane2.d * plane1.b) / det;
      const y = (plane1.a * plane2.d - plane2.a * plane1.d) / det;
      origin = { x, y, z: 0 };
    } else {
      origin = { x: 0, y: 0, z: 0 };
    }
  } else if (Math.abs(direction.x) > 1e-6 && Math.abs(direction.z) > 1e-6) {
    // Solve for y=0
    const det = plane1.a * plane2.c - plane2.a * plane1.c;
    if (Math.abs(det) > 1e-10) {
      const x = (plane1.d * plane2.c - plane2.d * plane1.c) / det;
      const z = (plane1.a * plane2.d - plane2.a * plane1.d) / det;
      origin = { x, y: 0, z };
    } else {
      origin = { x: 0, y: 0, z: 0 };
    }
  } else {
    // Solve for x=0
    const det = plane1.b * plane2.c - plane2.b * plane1.c;
    if (Math.abs(det) > 1e-10) {
      const y = (plane1.d * plane2.c - plane2.d * plane1.c) / det;
      const z = (plane1.b * plane2.d - plane2.b * plane1.d) / det;
      origin = { x: 0, y, z };
    } else {
      origin = { x: 0, y: 0, z: 0 };
    }
  }
  
  return { origin, direction };
}

/**
 * Project a 3D line onto the horizontal projection plane (z = 0)
 * 
 * @param line3D Parametric 3D line
 * @returns Two points defining the projected line in 2D (x, y coordinates)
 */
export function projectLineOntoHorizontalPlane(line3D: Line3DParametric): Line2DGeometry {
  // For horizontal plane (z = 0), projection is straightforward:
  // Just take x and y coordinates at two different t values
  const point1 = {
    x: line3D.origin.x,
    y: line3D.origin.y
  };
  
  const point2 = {
    x: line3D.origin.x + line3D.direction.x * 100, // Arbitrary scale for line
    y: line3D.origin.y + line3D.direction.y * 100
  };
  
  return { point1, point2 };
}

/**
 * Project a 3D line onto the vertical projection plane (y = 0 in standard setup)
 * 
 * @param line3D Parametric 3D line
 * @returns Two points defining the projected line in 2D (x, z coordinates)
 */
export function projectLineOntoVerticalPlane(line3D: Line3DParametric): Line2DGeometry {
  // For vertical plane (y = 0), we use x and z coordinates
  const point1 = {
    x: line3D.origin.x,
    y: line3D.origin.z  // In 2D view, we represent z as y
  };
  
  const point2 = {
    x: line3D.origin.x + line3D.direction.x * 100, // Arbitrary scale
    y: line3D.origin.z + line3D.direction.z * 100
  };
  
  return { point1, point2 };
}

/**
 * Convert 2D trace lines (horizontal and vertical traces) to a 3D plane equation
 * 
 * @param traceH Horizontal trace (line on z=0 plane)
 * @param traceV Vertical trace (line on y=0 plane)
 * @returns 3D plane equation, or null if traces don't define a valid plane
 */
export function tracesToPlane3D(
  traceH: Line2DGeometry,
  traceV: Line2DGeometry
): Plane3DEquation | null {
  // The horizontal trace gives us two 3D points on the plane (z = 0)
  const p1 = { x: traceH.point1.x, y: traceH.point1.y, z: 0 };
  const p2 = { x: traceH.point2.x, y: traceH.point2.y, z: 0 };
  
  // The vertical trace gives us a 3D point on the plane (y = 0, z is represented as y in 2D)
  const p3 = { x: traceV.point1.x, y: 0, z: traceV.point1.y };
  
  // We need a different point for p3 if it's the same as p1
  // Try using point2 from vertical trace
  const p3alt = { x: traceV.point2.x, y: 0, z: traceV.point2.y };
  
  // Use p3alt if p3 is too close to p1
  const dist3 = Math.sqrt((p3.x - p1.x) ** 2 + (p3.y - p1.y) ** 2 + (p3.z - p1.z) ** 2);
  const dist3alt = Math.sqrt((p3alt.x - p1.x) ** 2 + (p3alt.y - p1.y) ** 2 + (p3alt.z - p1.z) ** 2);
  const p3final = dist3alt > dist3 ? p3alt : p3;
  
  // Compute two vectors in the plane
  const v1 = { x: p2.x - p1.x, y: p2.y - p1.y, z: p2.z - p1.z };
  const v2 = { x: p3final.x - p1.x, y: p3final.y - p1.y, z: p3final.z - p1.z };
  
  // Normal vector = v1 × v2
  const normal = {
    x: v1.y * v2.z - v1.z * v2.y,
    y: v1.z * v2.x - v1.x * v2.z,
    z: v1.x * v2.y - v1.y * v2.x
  };
  
  // Check if vectors are parallel (degenerate plane)
  const normalMagnitude = Math.sqrt(
    normal.x * normal.x +
    normal.y * normal.y +
    normal.z * normal.z
  );
  
  if (normalMagnitude < 1e-10) {
    return null; // Traces are parallel or degenerate
  }
  
  // Plane equation: ax + by + cz = d
  // where (a, b, c) is the normal and d = normal · p1
  const d = normal.x * p1.x + normal.y * p1.y + normal.z * p1.z;
  
  return {
    a: normal.x,
    b: normal.y,
    c: normal.z,
    d
  };
}

/**
 * Compute BHL projections for two 3D planes
 * 
 * @param plane1 First 3D plane equation
 * @param plane2 Second 3D plane equation
 * @returns Object containing horizontal and vertical projections, or null if planes are parallel
 */
export function computeBHLProjections(
  plane1: Plane3DEquation,
  plane2: Plane3DEquation
): {
  horizontalProjection: Line2DGeometry;
  verticalProjection: Line2DGeometry;
} | null {
  // Compute 3D intersection line
  const intersectionLine = intersectPlanes3D(plane1, plane2);
  
  if (!intersectionLine) {
    return null; // Planes are parallel
  }
  
  // Project onto both projection planes
  const horizontalProjection = projectLineOntoHorizontalPlane(intersectionLine);
  const verticalProjection = projectLineOntoVerticalPlane(intersectionLine);
  
  return {
    horizontalProjection,
    verticalProjection
  };
}

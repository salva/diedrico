/**
 * 3D Geometry Utilities
 * 
 * This module provides functions to extract geometric data from Element2D and Element3D
 * for rendering in 3D space. This acts as the transformation layer between the domain
 * model (world state) and the rendering layer (Three.js).
 * 
 * Uses projection plane geometry (normal vectors, origin points) for general transformations
 * instead of hardcoded assumptions about horizontal/vertical planes.
 */

import type { Element2D, Element3D, Point3D, Line3D, Segment3D, Plane3D } from '@/types/ElementTypes';

/**
 * 3D coordinates
 */
export interface Coordinates3D {
  x: number;
  y: number;
  z: number;
}

/**
 * Convert domain coordinates (left-handed) to Three.js coordinates (right-handed)
 * The domain uses a left-handed coordinate system where viewer is at (0, -∞, 0).
 * Three.js uses a right-handed system, so we invert the Y-axis.
 */
export function toThreeJSCoordinates(coords: Coordinates3D): Coordinates3D {
  return {
    x: coords.x,
    y: -coords.y,
    z: coords.z
  };
}

/**
 * 2D coordinates
 */
export interface Coordinates2D {
  x: number;
  y: number;
}

/**
 * Line segment endpoints in 3D
 */
export interface LineSegment3D {
  start: Coordinates3D;
  end: Coordinates3D;
}

/**
 * Projection plane geometry (derived from Plane3D)
 */
export interface ProjectionPlaneGeometry {
  origin: Coordinates3D;
  normal: Coordinates3D;
  uAxis: Coordinates3D;  // Right axis (first 2D axis)
  vAxis: Coordinates3D;  // Up axis (second 2D axis)
}

/**
 * Get projection plane geometry from a Plane3D element
 * This computes the coordinate system for transforming 2D coordinates to 3D
 */
export function getPlaneGeometry(
  plane: Plane3D,
  elements3D: Map<string, Element3D>
): ProjectionPlaneGeometry | null {
  if (plane.kind !== 'Plane3DByPointAndNormal') return null;

  // Get origin point
  const originPoint = elements3D.get(plane.originPointId) as Point3D | undefined;
  if (!originPoint || originPoint.kind !== 'Point3DByCoordinates') return null;

  const origin: Coordinates3D = {
    x: originPoint.x,
    y: originPoint.y,
    z: originPoint.z
  };

  // Normal vector from plane definition
  const normal: Coordinates3D = { ...plane.normalVector };

  // Normalize the normal vector
  const normalLength = Math.sqrt(
    normal.x * normal.x + normal.y * normal.y + normal.z * normal.z
  );
  if (normalLength === 0) return null;

  normal.x /= normalLength;
  normal.y /= normalLength;
  normal.z /= normalLength;

  // Compute orthonormal basis for the plane
  // Choose uAxis as a vector perpendicular to normal
  // If normal is not vertical, use cross product with Z-axis
  // If normal is vertical, use cross product with X-axis
  let uAxis: Coordinates3D;
  
  if (Math.abs(normal.z) < 0.9) {
    // Normal is not aligned with Z-axis, use Z-up cross normal
    uAxis = {
      x: -normal.y,
      y: normal.x,
      z: 0
    };
  } else {
    // Normal is nearly vertical, use X-axis cross normal
    uAxis = {
      x: 0,
      y: -normal.z,
      z: normal.y
    };
  }

  // Normalize uAxis
  const uLength = Math.sqrt(uAxis.x * uAxis.x + uAxis.y * uAxis.y + uAxis.z * uAxis.z);
  if (uLength === 0) return null;
  
  uAxis.x /= uLength;
  uAxis.y /= uLength;
  uAxis.z /= uLength;

  // Compute vAxis as normal × uAxis (right-hand rule)
  const vAxis: Coordinates3D = {
    x: normal.y * uAxis.z - normal.z * uAxis.y,
    y: normal.z * uAxis.x - normal.x * uAxis.z,
    z: normal.x * uAxis.y - normal.y * uAxis.x
  };

  // vAxis should already be normalized since normal and uAxis are orthonormal
  // But normalize anyway for numerical stability
  const vLength = Math.sqrt(vAxis.x * vAxis.x + vAxis.y * vAxis.y + vAxis.z * vAxis.z);
  if (vLength === 0) return null;
  
  vAxis.x /= vLength;
  vAxis.y /= vLength;
  vAxis.z /= vLength;

  return { origin, normal, uAxis, vAxis };
}

/**
 * Transform 2D coordinates to 3D space using projection plane geometry
 * @param coords2D - The 2D coordinates (u, v) in the plane's local coordinate system
 * @param planeGeometry - The projection plane's geometry
 */
export function transform2DTo3D(
  coords2D: Coordinates2D,
  planeGeometry: ProjectionPlaneGeometry | ProjectionPlaneCoordinateSystem
): Coordinates3D {
  // Handle both ProjectionPlaneGeometry and ProjectionPlaneCoordinateSystem
  const uAxis = 'uAxis' in planeGeometry ? planeGeometry.uAxis : planeGeometry.u_axis;
  const vAxis = 'vAxis' in planeGeometry ? planeGeometry.vAxis : planeGeometry.v_axis;
  
  // 3D point = origin + u * uAxis + v * vAxis
  return {
    x: planeGeometry.origin.x + coords2D.x * uAxis.x + coords2D.y * vAxis.x,
    y: planeGeometry.origin.y + coords2D.x * uAxis.y + coords2D.y * vAxis.y,
    z: planeGeometry.origin.z + coords2D.x * uAxis.z + coords2D.y * vAxis.z
  };
}

/**
 * Projection plane coordinate system (stored in ProjectionPlane)
 */
export interface ProjectionPlaneCoordinateSystem {
  origin: Coordinates3D;
  u_axis: Coordinates3D;
  v_axis: Coordinates3D;
}

/**
 * Extract 2D coordinates from a Point2D element
 * Handles Point2DFree and Point2DDerived which have explicit x,y
 * Returns null for computed types (intersection points, etc.)
 */
export function get2DCoordinates(element: Element2D): Coordinates2D | null {
  if (element.kind === 'Point2DFree' || element.kind === 'Point2DDerived') {
    return { x: element.x, y: element.y };
  }
  // For Point2DFromIntersection, coordinates need to be computed
  // This would require access to worldStore - handled by caller
  return null;
}

/**
 * Extract 3D coordinates from a Point3D element
 * Uses projection plane coordinate systems for proper reconstruction
 */
export function get3DCoordinates(
  point: Point3D,
  elements2D: Map<string, Element2D>,
  projectionPlaneH?: ProjectionPlaneCoordinateSystem,
  projectionPlaneV?: ProjectionPlaneCoordinateSystem
): Coordinates3D | null {
  if (point.kind === 'Point3DByCoordinates') {
    return { x: point.x, y: point.y, z: point.z };
  }

  if (point.kind === 'Point3DFromProjections') {
    // Get 2D projections
    const projH = elements2D.get(point.projectionHId);
    const projV = elements2D.get(point.projectionVId);

    if (!projH || !projV) return null;

    // Extract coordinates from projections
    const hCoords = get2DCoordinates(projH);
    const vCoords = get2DCoordinates(projV);

    if (!hCoords || !vCoords) return null;

    // If coordinate systems provided, use them for reconstruction
    if (projectionPlaneH && projectionPlaneV) {
      // Transform 2D points to 3D using their respective coordinate systems
      const point3D_from_H = transform2DTo3D(hCoords, projectionPlaneH);
      const point3D_from_V = transform2DTo3D(vCoords, projectionPlaneV);
      
      // In correct dihedral projection, both transformations should give same 3D point
      // Use X from either (should match), Y from V projection, Z from H projection
      return {
        x: point3D_from_H.x,     // X coordinate (should match in both)
        y: point3D_from_V.y,     // Y from vertical plane
        z: point3D_from_H.z      // Z from horizontal plane
      };
    }

    // Fallback: hardcoded reconstruction (deprecated, for backward compatibility)
    // Assumes P_H shows (X, Y) and P_V shows (X, Z)
    return {
      x: hCoords.x,        // X from horizontal projection
      y: hCoords.y,        // Y from horizontal projection  
      z: vCoords.y         // Z from vertical projection's Y
    };
  }

  return null;
}

/**
 * Get line segment endpoints in 3D for a Line3D
 * Lines are infinite, so we return a segment extended far in both directions
 */
export function getLine3DSegment(
  line: Line3D,
  elements2D: Map<string, Element2D>,
  extend: number = 400
): LineSegment3D | null {
  if (line.kind === 'Line3DFromProjections') {
    // Get projection lines
    const projH = elements2D.get(line.projectionHId);
    const projV = elements2D.get(line.projectionVId);

    if (!projH || !projV) return null;
    if (projH.kind !== 'Line2DByTwoPoints' || projV.kind !== 'Line2DByTwoPoints') return null;

    // Get points from horizontal projection
    const hP1 = elements2D.get(projH.point1Id);
    const hP2 = elements2D.get(projH.point2Id);
    
    if (!hP1 || !hP2) return null;
    
    const hCoords1 = get2DCoordinates(hP1);
    const hCoords2 = get2DCoordinates(hP2);
    
    if (!hCoords1 || !hCoords2) return null;

    // Calculate direction from horizontal projection
    const dx = hCoords2.x - hCoords1.x;
    const dz = hCoords2.y - hCoords1.y;
    const length = Math.sqrt(dx * dx + dz * dz);
    
    if (length === 0) return null;
    
    const dirX = dx / length;
    const dirZ = dz / length;

    // For now, use y=0 for simplicity (full reconstruction requires both projections)
    // This is a simplified version - proper implementation would derive y from V projection
    const midX = (hCoords1.x + hCoords2.x) / 2;
    const midZ = (hCoords1.y + hCoords2.y) / 2;

    return {
      start: {
        x: midX - dirX * extend,
        y: 0,
        z: midZ - dirZ * extend
      },
      end: {
        x: midX + dirX * extend,
        y: 0,
        z: midZ + dirZ * extend
      }
    };
  }

  return null;
}

/**
 * Get segment endpoints in 3D for a Segment3D
 */
export function getSegment3DEndpoints(
  segment: Segment3D,
  elements3D: Map<string, Element3D>,
  elements2D: Map<string, Element2D>
): LineSegment3D | null {
  if (segment.kind !== 'Segment3DByPoints') return null;

  // Get endpoints
  const point1 = elements3D.get(segment.point1Id) as Point3D | undefined;
  const point2 = elements3D.get(segment.point2Id) as Point3D | undefined;

  if (!point1 || !point2) return null;

  const coords1 = get3DCoordinates(point1, elements2D);
  const coords2 = get3DCoordinates(point2, elements2D);

  if (!coords1 || !coords2) return null;

  return {
    start: coords1,
    end: coords2
  };
}

/**
 * Check if a plane is horizontal (P_H) based on common naming conventions
 * This is a fallback for when plane geometry is not available
 * @deprecated Use getPlaneGeometry instead for proper geometric calculations
 */
export function isHorizontalPlane(planeId: string): boolean {
  return planeId === 'P_H' || planeId.toLowerCase().includes('horizontal');
}

/**
 * Check if a plane is vertical (P_V) based on common naming conventions
 * This is a fallback for when plane geometry is not available
 * @deprecated Use getPlaneGeometry instead for proper geometric calculations
 */
export function isVerticalPlane(planeId: string): boolean {
  return planeId === 'P_V' || planeId.toLowerCase().includes('vertical');
}

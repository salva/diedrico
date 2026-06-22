/**
 * Rectangle Grid Utilities
 * 
 * Handles grid generation clipped to a rectangle in 2D space.
 * The rectangle may be arbitrarily oriented (not axis-aligned).
 */

import { Vector4 } from 'three';
import { Matrix3x4, applyMatrix3x4 } from './threeUtils';

/**
 * A point in 2D space (u, v)
 */
interface Point2D {
  u: number;
  v: number;
}

/**
 * A line segment in 2D space
 */
export interface Segment2D {
  start: Point2D;
  end: Point2D;
}

/**
 * A rectangle defined by 4 corners in 2D space (u, v)
 * Corners should be in order (e.g., clockwise or counter-clockwise)
 */
export interface Rectangle2D {
  corners: [Point2D, Point2D, Point2D, Point2D];
}

/**
 * Convert 3D plane rectangle corners to projection plane (u,v) coordinates
 * 
 * @param planeCorners3D - Four corners of the 3D plane in domain coordinates (Vector4 with w=1)
 * @param threeDToPlane - Transformation matrix from 3D domain to 2D plane coordinates
 * @returns Rectangle in (u,v) coordinates
 */
export function convertPlaneRectangleTo2D(
  planeCorners3D: [Vector4, Vector4, Vector4, Vector4],
  threeDToPlane: Matrix3x4
): Rectangle2D {
  const corners: [Point2D, Point2D, Point2D, Point2D] = [
    { u: 0, v: 0 },
    { u: 0, v: 0 },
    { u: 0, v: 0 },
    { u: 0, v: 0 }
  ];
  
  for (let i = 0; i < 4; i++) {
    const corner3D = planeCorners3D[i];
    const corner2D = applyMatrix3x4(corner3D, threeDToPlane);
    corners[i] = { u: corner2D.x, v: corner2D.y };
  }
  
  // Ensure counter-clockwise winding for proper normal calculations
  // Compute signed area using shoelace formula
  let signedArea = 0;
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    signedArea += corners[i].u * corners[j].v - corners[j].u * corners[i].v;
  }
  
  // If negative (clockwise), reverse the order
  if (signedArea < 0) {
    // Manually reverse to ensure tuple type compatibility
    const temp: [Point2D, Point2D, Point2D, Point2D] = [corners[3], corners[2], corners[1], corners[0]];
    return { corners: temp };
  }
  
  return { corners };
}

/**
 * Compute axis-aligned bounding box of a rectangle
 */
export function computeBounds(rect: Rectangle2D): { minU: number; maxU: number; minV: number; maxV: number } {
  let minU = Infinity, maxU = -Infinity;
  let minV = Infinity, maxV = -Infinity;
  
  for (const corner of rect.corners) {
    minU = Math.min(minU, corner.u);
    maxU = Math.max(maxU, corner.u);
    minV = Math.min(minV, corner.v);
    maxV = Math.max(maxV, corner.v);
  }
  
  return { minU, maxU, minV, maxV };
}

/**
 * Clip a line segment against a rectangle
 * 
 * Uses Liang-Barsky or Sutherland-Cohen algorithm adapted for arbitrary rectangles.
 * For non-axis-aligned rectangles, we clip against each edge.
 * 
 * @param segment - Line segment to clip
 * @param rect - Rectangle to clip against
 * @returns Clipped segment, or null if entirely outside
 */
export function clipSegmentToRectangle(segment: Segment2D, rect: Rectangle2D): Segment2D | null {
  let tMin = 0;
  let tMax = 1;
  
  const dx = segment.end.u - segment.start.u;
  const dy = segment.end.v - segment.start.v;
  
  // Clip against each edge of the rectangle
  for (let i = 0; i < 4; i++) {
    const corner1 = rect.corners[i];
    const corner2 = rect.corners[(i + 1) % 4];
    
    // Edge vector
    const edgeU = corner2.u - corner1.u;
    const edgeV = corner2.v - corner1.v;
    
    // Inward normal (perpendicular to edge, pointing inside)
    // For counter-clockwise winding, rotate edge 90° CW
    const normalU = -edgeV;   // Rotate 90° CW
    const normalV = edgeU;
    
    // Distance of segment start from edge
    const dist1 = normalU * (segment.start.u - corner1.u) + normalV * (segment.start.v - corner1.v);
    
    // Check if segment crosses this edge
    const denominator = normalU * dx + normalV * dy;
    
    if (Math.abs(denominator) < 1e-10) {
      // Segment parallel to edge
      if (dist1 < -1e-10) {
        // Segment outside this edge - mark as impossible range
        tMax = -1; // Force tMin > tMax
      }
      continue;
    }
    
    const t = -dist1 / denominator;
    
    if (denominator < 0) {
      // Leaving half-space (moving away from inside)
      const newTMax = Math.min(tMax, t);
      tMax = newTMax;
    } else {
      // Entering half-space (moving toward inside)
      const newTMin = Math.max(tMin, t);
      tMin = newTMin;
    }
    
    if (tMin > tMax) {
      // Segment entirely outside
      return null;
    }
  }
  
  // Compute clipped segment
  return {
    start: {
      u: segment.start.u + tMin * dx,
      v: segment.start.v + tMin * dy
    },
    end: {
      u: segment.start.u + tMax * dx,
      v: segment.start.v + tMax * dy
    }
  };
}

/**
 * Generate grid lines clipped to a rectangle
 * 
 * @param rect - Rectangle to clip grid to (in u,v coordinates)
 * @param divisions - Number of divisions (grid lines = divisions + 1)
 * @returns Array of line segments in 2D (u,v) space
 */
export function generateClippedGrid(rect: Rectangle2D, divisions: number = 20): Segment2D[] {
  const bounds = computeBounds(rect);
  const segments: Segment2D[] = [];
  
  // Extend bounds slightly to ensure coverage
  const margin = 0.1;
  const minU = bounds.minU - margin;
  const maxU = bounds.maxU + margin;
  const minV = bounds.minV - margin;
  const maxV = bounds.maxV + margin;
  
  // Calculate step size to get approximately the desired number of divisions
  const rangeU = maxU - minU;
  const rangeV = maxV - minV;
  const stepU = rangeU / divisions;
  const stepV = rangeV / divisions;
  
  // Round steps to nice numbers and snap to origin
  // Grid lines should pass through (0,0) in the intrinsic coordinate system
  
  // Lines parallel to U-axis (constant v, vertical grid lines)
  // Start from origin and extend in both directions
  for (let i = 0; ; i++) {
    const v = i * stepV;
    if (v > maxV) break;
    
    const segment: Segment2D = {
      start: { u: minU, v },
      end: { u: maxU, v }
    };
    
    const clipped = clipSegmentToRectangle(segment, rect);
    if (clipped) {
      segments.push(clipped);
    }
  }
  
  // Negative direction from origin
  for (let i = -1; ; i--) {
    const v = i * stepV;
    if (v < minV) break;
    
    const segment: Segment2D = {
      start: { u: minU, v },
      end: { u: maxU, v }
    };
    
    const clipped = clipSegmentToRectangle(segment, rect);
    if (clipped) {
      segments.push(clipped);
    }
  }
  
  // Lines parallel to V-axis (constant u, horizontal grid lines)
  // Start from origin and extend in both directions
  for (let i = 0; ; i++) {
    const u = i * stepU;
    if (u > maxU) break;
    
    const segment: Segment2D = {
      start: { u, v: minV },
      end: { u, v: maxV }
    };
    
    const clipped = clipSegmentToRectangle(segment, rect);
    if (clipped) {
      segments.push(clipped);
    }
  }
  
  // Negative direction from origin
  for (let i = -1; ; i--) {
    const u = i * stepU;
    if (u < minU) break;
    
    const segment: Segment2D = {
      start: { u, v: minV },
      end: { u, v: maxV }
    };
    
    const clipped = clipSegmentToRectangle(segment, rect);
    if (clipped) {
      segments.push(clipped);
    }
  }
  
  return segments;
}

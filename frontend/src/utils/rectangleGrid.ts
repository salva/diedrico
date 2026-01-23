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
export interface Point2D {
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
    const normalU = edgeV;   // Rotate 90° CCW
    const normalV = -edgeU;
    
    // Distance of segment start from edge
    const dist1 = normalU * (segment.start.u - corner1.u) + normalV * (segment.start.v - corner1.v);
    
    // Check if segment crosses this edge
    const denominator = normalU * dx + normalV * dy;
    
    if (Math.abs(denominator) < 1e-10) {
      // Segment parallel to edge
      if (dist1 < -1e-10) {
        // Segment outside this edge
        return null;
      }
      continue;
    }
    
    const t = -dist1 / denominator;
    
    if (denominator < 0) {
      // Entering half-space
      tMin = Math.max(tMin, t);
    } else {
      // Leaving half-space
      tMax = Math.min(tMax, t);
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
  
  const stepU = (maxU - minU) / divisions;
  const stepV = (maxV - minV) / divisions;
  
  // Lines parallel to U-axis (constant v)
  for (let i = 0; i <= divisions; i++) {
    const v = minV + i * stepV;
    const segment: Segment2D = {
      start: { u: minU, v },
      end: { u: maxU, v }
    };
    
    const clipped = clipSegmentToRectangle(segment, rect);
    if (clipped) {
      segments.push(clipped);
    }
  }
  
  // Lines parallel to V-axis (constant u)
  for (let i = 0; i <= divisions; i++) {
    const u = minU + i * stepU;
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

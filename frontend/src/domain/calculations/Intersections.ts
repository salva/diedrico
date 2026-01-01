/**
 * Intersections - Geometric intersection calculations using homogeneous coordinates
 * 
 * This module provides functions for calculating intersections between geometric
 * primitives using homogeneous coordinate representation.
 * 
 * All calculations follow constitution.md Principle V:
 * - Use homogeneous coordinates throughout
 * - Convert parametric forms to implicit forms when needed
 * - Use cross products for line-line intersections
 * - Handle edge cases (parallel, coincident) explicitly
 * 
 * Line representation:
 * - Parametric form: P(t) = point + t * direction (storage format)
 * - Implicit form: ax + by + c = 0 (computation format for intersections)
 * 
 * Reference:
 * - specs/001-dihedral-learning-mvp/data-model.md#intersection-calculations
 * - .specify/memory/constitution.md#v-homogeneous-coordinate-system
 */

import { Vector3 } from 'three';
import type { Line2DRealization } from '../world/Line';

/**
 * Result of a line-line intersection calculation
 */
export interface LineLineIntersectionResult {
  /**
   * Intersection point in homogeneous coordinates (x, y, 1)
   * Null if lines are parallel or coincident
   */
  point: Vector3 | null;
  
  /**
   * Type of intersection result
   * - 'point': Single intersection point (normal case)
   * - 'parallel': Lines are parallel (no intersection)
   * - 'coincident': Lines are coincident (infinite intersections)
   */
  type: 'point' | 'parallel' | 'coincident';
  
  /**
   * Human-readable message describing the result
   */
  message?: string;
}

/**
 * Convert line from parametric form to implicit form using homogeneous coordinates
 * 
 * Parametric form: P(t) = P0 + t * d where P0 = (x0, y0, 1), d = (dx, dy, 0)
 * Implicit form: ax + by + c = 0
 * 
 * The implicit form can be derived from the parametric form:
 * - A line passing through P0 = (x0, y0) with direction d = (dx, dy)
 * - The perpendicular direction to d is (-dy, dx)
 * - Points on the line satisfy: (P - P0) · perpendicular = 0
 * - This gives: -dy(x - x0) + dx(y - y0) = 0
 * - Expanding: -dy*x + dx*y + (dy*x0 - dx*y0) = 0
 * - So: a = -dy, b = dx, c = dy*x0 - dx*y0
 * 
 * @param line Line in parametric form
 * @returns Line in implicit form [a, b, c] where ax + by + c = 0
 */
function lineToImplicitForm(line: Line2DRealization): Vector3 {
  const { point, direction } = line;
  const x0 = point.x;
  const y0 = point.y;
  const dx = direction.x;
  const dy = direction.y;
  
  // Implicit form: a*x + b*y + c = 0
  // a = -dy, b = dx, c = dy*x0 - dx*y0
  const a = -dy;
  const b = dx;
  const c = dy * x0 - dx * y0;
  
  // Return as Vector3 for convenience (not really a point, just 3 numbers)
  return new Vector3(a, b, c);
}

/**
 * Calculate intersection point of two lines using homogeneous coordinates
 * 
 * Algorithm (from projective geometry):
 * 1. Convert lines from parametric to implicit form
 * 2. Represent lines as homogeneous vectors L1 = [a1, b1, c1], L2 = [a2, b2, c2]
 * 3. Intersection point is given by cross product: P = L1 × L2
 * 4. Result is in homogeneous coordinates [x, y, w]
 * 5. If w ≈ 0, lines are parallel (point at infinity)
 * 6. Otherwise, convert to Cartesian: (x/w, y/w, 1)
 * 
 * Edge cases:
 * - Parallel lines: Cross product yields [0, 0, 0] or [*, *, 0] (w = 0)
 * - Coincident lines: Same as parallel (treated as no intersection)
 * 
 * @param line1 First line in parametric form
 * @param line2 Second line in parametric form
 * @returns Intersection result with point (if exists) and type
 */
export function intersectLineLine(
  line1: Line2DRealization,
  line2: Line2DRealization
): LineLineIntersectionResult {
  // Convert to implicit form
  const L1 = lineToImplicitForm(line1);
  const L2 = lineToImplicitForm(line2);
  
  // Cross product in homogeneous coordinates
  // L1 × L2 gives the intersection point in homogeneous form
  // 
  // Given L1 = (a1, b1, c1) and L2 = (a2, b2, c2):
  // L1 × L2 = | i    j    k  |
  //           | a1   b1   c1 |
  //           | a2   b2   c2 |
  //
  // = i(b1*c2 - c1*b2) - j(a1*c2 - c1*a2) + k(a1*b2 - b1*a2)
  // = (b1*c2 - c1*b2, c1*a2 - a1*c2, a1*b2 - b1*a2)
  //
  // This represents the point [x, y, w] in homogeneous coordinates
  // where x/w and y/w are the Cartesian coordinates (if w ≠ 0)
  
  const a1 = L1.x, b1 = L1.y, c1 = L1.z;
  const a2 = L2.x, b2 = L2.y, c2 = L2.z;
  
  // Cross product components
  const px = b1 * c2 - c1 * b2;  // x-component (homogeneous)
  const py = c1 * a2 - a1 * c2;  // y-component (homogeneous)
  const w = a1 * b2 - b1 * a2;   // w-component (homogeneous scale)
  
  // Check for parallel lines (w ≈ 0)
  const epsilon = 1e-10;
  if (Math.abs(w) < epsilon) {
    // Lines are parallel or coincident
    // Check if they're coincident by testing if one point from line1 satisfies line2
    const testPoint = line1.point;
    const dist = Math.abs(a2 * testPoint.x + b2 * testPoint.y + c2);
    
    if (dist < epsilon) {
      return {
        point: null,
        type: 'coincident',
        message: 'Lines are coincident (overlap completely)'
      };
    } else {
      return {
        point: null,
        type: 'parallel',
        message: 'Lines are parallel (no intersection)'
      };
    }
  }
  
  // Convert from homogeneous to Cartesian coordinates
  // Divide by w to get actual (x, y) coordinates
  const x = px / w;
  const y = py / w;
  
  // Return as point in homogeneous form (x, y, 1)
  return {
    point: new Vector3(x, y, 1),
    type: 'point',
    message: `Intersection at (${x.toFixed(2)}, ${y.toFixed(2)})`
  };
}

/**
 * Check if two lines are parallel (without computing intersection)
 * 
 * Two lines are parallel if their directions are parallel (or anti-parallel).
 * In 2D, this means the cross product of direction vectors is zero.
 * 
 * @param line1 First line
 * @param line2 Second line
 * @returns True if lines are parallel
 */
export function areLinesParallel(
  line1: Line2DRealization,
  line2: Line2DRealization
): boolean {
  const d1 = line1.direction;
  const d2 = line2.direction;
  
  // Cross product in 2D: d1.x * d2.y - d1.y * d2.x
  // If zero, directions are parallel
  const cross = d1.x * d2.y - d1.y * d2.x;
  
  return Math.abs(cross) < 1e-10;
}

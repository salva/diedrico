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
import type { Line2DRealization2D } from '../world/Line';
import type { Circle2DRealization2D } from '../world/Circle';

/**
 * Sort intersection points by angle relative to circle's radius vector
 * 
 * Per data-model.md: When multiple points intersect a circle, they must be indexed
 * by their angular position relative to the circle's radius vector (angle zero).
 * 
 * Algorithm:
 * 1. For each point P: compute angle θ = atan2(P.y - C.y, P.x - C.x)
 * 2. Compute reference angle θ₀ = atan2(R.y, R.x) from radius vector
 * 3. Compute relative angle Δθ = θ - θ₀, normalized to [0, 2π)
 * 4. Sort by Δθ ascending (index 0 = smallest Δθ = closest to radius vector)
 * 
 * @param points Intersection points to sort
 * @param circle Circle realization containing center and radiusVector
 * @returns Points sorted by angle relative to radius vector
 */
function sortPointsByAngleFromRadiusVector(
  points: Vector3[],
  circle: Circle2DRealization2D
): Vector3[] {
  if (points.length <= 1) {
    return points; // No sorting needed
  }

  const center = circle.center;
  const radiusVector = circle.radiusVector;
  
  // Compute reference angle from radius vector
  const theta0 = Math.atan2(radiusVector.y, radiusVector.x);
  
  // Compute relative angle for each point
  const pointsWithAngles = points.map(point => {
    const theta = Math.atan2(point.y - center.y, point.x - center.x);
    let deltaTheta = theta - theta0;
    
    // Normalize to [0, 2π) range
    while (deltaTheta < 0) {
      deltaTheta += 2 * Math.PI;
    }
    while (deltaTheta >= 2 * Math.PI) {
      deltaTheta -= 2 * Math.PI;
    }
    
    return { point, deltaTheta };
  });
  
  // Sort by deltaTheta ascending
  pointsWithAngles.sort((a, b) => a.deltaTheta - b.deltaTheta);
  
  // Return sorted points
  return pointsWithAngles.map(item => item.point);
}

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
function lineToImplicitForm(line: Line2DRealization2D): Vector3 {
  const point = line.point1;
  const direction = line.getDirection();
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
  line1: Line2DRealization2D,
  line2: Line2DRealization2D
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
    const testPoint = line1.point1;
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
  line1: Line2DRealization2D,
  line2: Line2DRealization2D
): boolean {
  const d1 = line1.getDirection();
  const d2 = line2.getDirection();
  
  // Cross product in 2D: d1.x * d2.y - d1.y * d2.x
  // If zero, directions are parallel
  const cross = d1.x * d2.y - d1.y * d2.x;
  
  return Math.abs(cross) < 1e-10;
}

/**
 * Result of a line-circle intersection calculation
 */
export interface LineCircleIntersectionResult {
  /**
   * Intersection points in homogeneous coordinates (x, y, 1)
   * Empty array if no intersections, 1 element if tangent, 2 elements if secant
   */
  points: Vector3[];
  
  /**
   * Type of intersection result
   * - 'none': No intersection (line misses circle)
   * - 'tangent': One intersection point (line is tangent to circle)
   * - 'secant': Two intersection points (line cuts through circle)
   */
  type: 'none' | 'tangent' | 'secant';
  
  /**
   * Human-readable message describing the result
   */
  message?: string;
}

/**
 * Calculate intersection points of a line and a circle using homogeneous coordinates
 * 
 * Algorithm:
 * 1. Line in parametric form: P(t) = P0 + t*d where P0 is point, d is direction
 * 2. Circle: (x - cx)² + (y - cy)² = r²
 * 3. Substitute line equation into circle equation
 * 4. Results in quadratic: at² + bt + c = 0
 * 5. Solve quadratic to find t values
 * 6. Substitute t back into line equation to get intersection points
 * 
 * Edge cases:
 * - No intersection: discriminant < 0
 * - Tangent: discriminant = 0 (one point)
 * - Secant: discriminant > 0 (two points)
 * 
 * @param line Line in parametric form
 * @param circle Circle with center and radius
 * @returns Intersection result with 0, 1, or 2 points
 */
export function intersectLineCircle(
  line: Line2DRealization2D,
  circle: Circle2DRealization2D
): LineCircleIntersectionResult {
  const P0 = line.point1;
  const d = line.getDirection();
  const C = circle.center;
  const r = circle.getRadius();
  
  // Line: P(t) = P0 + t*d = (P0.x + t*d.x, P0.y + t*d.y)
  // Circle: (x - C.x)² + (y - C.y)² = r²
  //
  // Substitute line into circle:
  // (P0.x + t*d.x - C.x)² + (P0.y + t*d.y - C.y)² = r²
  //
  // Let dx = P0.x - C.x, dy = P0.y - C.y
  // (dx + t*d.x)² + (dy + t*d.y)² = r²
  //
  // Expand:
  // dx² + 2*dx*t*d.x + t²*d.x² + dy² + 2*dy*t*d.y + t²*d.y² = r²
  //
  // Group by powers of t:
  // (d.x² + d.y²)*t² + 2*(dx*d.x + dy*d.y)*t + (dx² + dy² - r²) = 0
  //
  // This is quadratic: a*t² + b*t + c = 0
  
  const dx = P0.x - C.x;
  const dy = P0.y - C.y;
  
  const a = d.x * d.x + d.y * d.y;  // Should be 1 if direction is normalized
  const b = 2 * (dx * d.x + dy * d.y);
  const c = dx * dx + dy * dy - r * r;
  
  // Calculate discriminant
  const discriminant = b * b - 4 * a * c;
  const epsilon = 1e-10;
  
  if (discriminant < -epsilon) {
    // No intersection
    return {
      points: [],
      type: 'none',
      message: 'Line does not intersect circle'
    };
  } else if (Math.abs(discriminant) < epsilon) {
    // Tangent - one intersection point
    const t = -b / (2 * a);
    const x = P0.x + t * d.x;
    const y = P0.y + t * d.y;
    
    return {
      points: [new Vector3(x, y, 1)],
      type: 'tangent',
      message: `Line is tangent to circle at (${x.toFixed(2)}, ${y.toFixed(2)})`
    };
  } else {
    // Secant - two intersection points
    const sqrtDisc = Math.sqrt(discriminant);
    const t1 = (-b - sqrtDisc) / (2 * a);
    const t2 = (-b + sqrtDisc) / (2 * a);
    
    const x1 = P0.x + t1 * d.x;
    const y1 = P0.y + t1 * d.y;
    const x2 = P0.x + t2 * d.x;
    const y2 = P0.y + t2 * d.y;
    
    // Sort points by angle relative to circle's radius vector
    const unsortedPoints = [
      new Vector3(x1, y1, 1),
      new Vector3(x2, y2, 1)
    ];
    const sortedPoints = sortPointsByAngleFromRadiusVector(unsortedPoints, circle);
    
    return {
      points: sortedPoints,
      type: 'secant',
      message: `Line intersects circle at 2 points (sorted by angle from radius vector)`
    };
  }
}

/**
 * Result of a circle-circle intersection calculation
 */
export interface CircleCircleIntersectionResult {
  /**
   * Intersection points in homogeneous coordinates (x, y, 1)
   * Empty array if no intersections, 1 element if tangent, 2 elements if intersecting
   */
  points: Vector3[];
  
  /**
   * Type of intersection result
   * - 'none': No intersection (circles don't touch)
   * - 'tangent': One intersection point (circles touch at one point)
   * - 'secant': Two intersection points (circles overlap)
   * - 'coincident': Circles are the same (infinite intersections)
   */
  type: 'none' | 'tangent' | 'secant' | 'coincident';
  
  /**
   * Human-readable message describing the result
   */
  message?: string;
}

/**
 * Calculate intersection points of two circles using homogeneous coordinates
 * 
 * Algorithm:
 * 1. Circle 1: (x - c1x)² + (y - c1y)² = r1²
 * 2. Circle 2: (x - c2x)² + (y - c2y)² = r2²
 * 3. Subtract equations to get a line (radical axis)
 * 4. Solve line-circle intersection for either circle
 * 
 * Edge cases:
 * - No intersection: |c1 - c2| > r1 + r2 (circles too far apart)
 * - No intersection: |c1 - c2| < |r1 - r2| (one circle inside the other)
 * - Tangent: |c1 - c2| = r1 + r2 or |c1 - c2| = |r1 - r2|
 * - Secant: otherwise (two points)
 * - Coincident: same center and same radius
 * 
 * @param circle1 First circle
 * @param circle2 Second circle
 * @returns Intersection result with 0, 1, or 2 points
 */
export function intersectCircleCircle(
  circle1: Circle2DRealization2D,
  circle2: Circle2DRealization2D
): CircleCircleIntersectionResult {
  const c1 = circle1.center;
  const r1 = circle1.getRadius();
  const c2 = circle2.center;
  const r2 = circle2.getRadius();
  
  // Distance between centers
  const dx = c2.x - c1.x;
  const dy = c2.y - c1.y;
  const d = Math.sqrt(dx * dx + dy * dy);
  
  const epsilon = 1e-10;
  
  // Check if circles are coincident (same center and same radius)
  if (d < epsilon && Math.abs(r1 - r2) < epsilon) {
    return {
      points: [],
      type: 'coincident',
      message: 'Circles are coincident (same circle)'
    };
  }
  
  // Check if circles are too far apart
  if (d > r1 + r2 + epsilon) {
    return {
      points: [],
      type: 'none',
      message: 'Circles are too far apart (no intersection)'
    };
  }
  
  // Check if one circle is inside the other
  if (d < Math.abs(r1 - r2) - epsilon) {
    return {
      points: [],
      type: 'none',
      message: 'One circle is inside the other (no intersection)'
    };
  }
  
  // Check if circles are externally tangent
  if (Math.abs(d - (r1 + r2)) < epsilon) {
    // One point at c1 + (r1/d) * (c2 - c1)
    const t = r1 / d;
    const x = c1.x + t * dx;
    const y = c1.y + t * dy;
    
    return {
      points: [new Vector3(x, y, 1)],
      type: 'tangent',
      message: `Circles are externally tangent at (${x.toFixed(2)}, ${y.toFixed(2)})`
    };
  }
  
  // Check if circles are internally tangent
  if (Math.abs(d - Math.abs(r1 - r2)) < epsilon) {
    // One point at c1 + (r1/d) * (c2 - c1) or c1 - (r1/d) * (c2 - c1)
    const t = r1 / d * (r1 > r2 ? 1 : -1);
    const x = c1.x + t * dx;
    const y = c1.y + t * dy;
    
    return {
      points: [new Vector3(x, y, 1)],
      type: 'tangent',
      message: `Circles are internally tangent at (${x.toFixed(2)}, ${y.toFixed(2)})`
    };
  }
  
  // Two intersection points (secant case)
  // Use the formula from computational geometry:
  // a = (r1² - r2² + d²) / (2*d)
  // h = sqrt(r1² - a²)
  // 
  // Point P2 = c1 + (a/d) * (c2 - c1) is on the line between centers
  // The two intersection points are perpendicular to this line at distance h
  
  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
  const h = Math.sqrt(r1 * r1 - a * a);
  
  // Point on line between centers
  const p2x = c1.x + (a / d) * dx;
  const p2y = c1.y + (a / d) * dy;
  
  // Perpendicular direction (rotate (dx, dy) by 90 degrees)
  const perp_x = -dy / d;
  const perp_y = dx / d;
  
  // Two intersection points
  const x1 = p2x + h * perp_x;
  const y1 = p2y + h * perp_y;
  const x2 = p2x - h * perp_x;
  const y2 = p2y - h * perp_y;
  
  // Sort points by angle relative to first circle's radius vector
  const unsortedPoints = [
    new Vector3(x1, y1, 1),
    new Vector3(x2, y2, 1)
  ];
  const sortedPoints = sortPointsByAngleFromRadiusVector(unsortedPoints, circle1);
  
  return {
    points: sortedPoints,
    type: 'secant',
    message: `Circles intersect at 2 points (sorted by angle from circle1's radius vector)`
  };
}

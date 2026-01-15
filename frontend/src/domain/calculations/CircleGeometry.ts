/**
 * CircleGeometry - Geometric algorithms for circle-circle constructions
 * 
 * Provides algorithms for computing tangent lines and other geometric constructions
 * between two circles, used by polymorphic Line and Segment tools.
 * 
 * References:
 * - specs/001-dihedral-learning-mvp/data-model.md#phase-73-polymorphic-line-tool
 * - FR-055 (Polymorphic Line Tool)
 */

import { Vector3 } from 'three';
import type { Circle2DRealization2D } from '../world/Circle';

const EPSILON = 1e-10;

/**
 * Geometric solution for line between two circles
 * Used for mouse-based disambiguation when multiple solutions exist
 */
export interface CircleCircleLineSolution {
  /** Feature points for distance-based disambiguation (touch points on circles) */
  touchPoint1: Vector3;
  touchPoint2: Vector3;
  
  /** Line direction vector (unit length) */
  direction: Vector3;
  
  /** Point on the line (typically touchPoint1) */
  pointOnLine: Vector3;
  
  /** Human-readable label for UI feedback */
  label: string;
  
  /** Solution type identifier */
  type: 'external-tangent' | 'internal-tangent' | 'perpendicular' | 'through-centers';
  
  /** Index for tangent solutions (0 or 1) */
  index?: 0 | 1;
}

/**
 * Compute both external tangent lines to two circles
 * 
 * External tangents touch both circles on the same side relative to the center line.
 * 
 * Algorithm:
 * 1. Compute center line direction: centerDir = C2 - C1
 * 2. Compute perpendicular: perp = rotate90(centerDir) normalized
 * 3. For index 0 ("above"): offset circles in +perp direction
 * 4. For index 1 ("below"): offset circles in -perp direction
 * 5. Tangent line passes through touch points
 * 
 * @param c1 First circle realization
 * @param c2 Second circle realization
 * @returns Array of 0-2 tangent solutions (empty if circles overlap)
 */
export function computeExternalTangents(
  c1: Circle2DRealization2D,
  c2: Circle2DRealization2D
): CircleCircleLineSolution[] {
  const solutions: CircleCircleLineSolution[] = [];
  
  const r1 = c1.getRadius();
  const r2 = c2.getRadius();
  const centerDist = c1.center.distanceTo(c2.center);
  
  // Check feasibility: external tangents exist if circles don't overlap significantly
  // For external tangents, we need: d >= |r1 - r2|
  if (centerDist < Math.abs(r1 - r2) - EPSILON) {
    return []; // One circle inside the other - no external tangents
  }
  
  // Degenerate case: circles at same location
  if (centerDist < EPSILON) {
    return [];
  }
  
  // Center line direction
  const centerLine = new Vector3()
    .subVectors(c2.center, c1.center)
    .normalize();
  
  // Perpendicular direction (rotate 90° CCW)
  const perp = new Vector3(-centerLine.y, centerLine.x, 0);
  
  // Compute both external tangents (index 0 = "above", index 1 = "below")
  for (let index = 0; index < 2; index++) {
    const sign = index === 0 ? 1 : -1;
    
    // Offset circles in perpendicular direction
    const offset1 = perp.clone().multiplyScalar(sign * r1);
    const offset2 = perp.clone().multiplyScalar(sign * r2);
    
    const touchPoint1 = c1.center.clone().add(offset1);
    const touchPoint2 = c2.center.clone().add(offset2);
    
    // Tangent direction is from touch point 1 to touch point 2
    const direction = new Vector3()
      .subVectors(touchPoint2, touchPoint1)
      .normalize();
    
    solutions.push({
      touchPoint1,
      touchPoint2,
      direction,
      pointOnLine: touchPoint1.clone(),
      label: index === 0 ? 'External tangent (above)' : 'External tangent (below)',
      type: 'external-tangent',
      index: index as 0 | 1
    });
  }
  
  return solutions;
}

/**
 * Compute both internal (crossing) tangent lines to two circles
 * 
 * Internal tangents cross between the circles, touching them on opposite sides
 * relative to the center line.
 * 
 * Algorithm (using homothety center):
 * 1. Find external homothety center H: C1 + (r1/(r1+r2)) * (C2-C1)
 * 2. Compute distance from H to tangent touch points on C1
 * 3. Tangent angles: ±asin(r1 / d_H_C1)
 * 4. Compute touch points and line directions
 * 
 * @param c1 First circle realization
 * @param c2 Second circle realization
 * @returns Array of 0-2 tangent solutions (empty if circles overlap or too separated)
 */
export function computeInternalTangents(
  c1: Circle2DRealization2D,
  c2: Circle2DRealization2D
): CircleCircleLineSolution[] {
  const solutions: CircleCircleLineSolution[] = [];
  
  const r1 = c1.getRadius();
  const r2 = c2.getRadius();
  const centerDist = c1.center.distanceTo(c2.center);
  const radiusSum = r1 + r2;
  
  // Check feasibility: internal tangents exist if circles are separated
  // For internal tangents, we need: d > r1 + r2
  if (centerDist < radiusSum - EPSILON) {
    return []; // Circles overlap - no internal tangents
  }
  
  // Degenerate case: circles at same location
  if (centerDist < EPSILON) {
    return [];
  }
  
  // Find external homothety center
  const ratio = r1 / radiusSum;
  const homothetyCenter = new Vector3()
    .subVectors(c2.center, c1.center)
    .multiplyScalar(ratio)
    .add(c1.center);
  
  // Distance from homothety center to circle 1 center
  const distHC1 = homothetyCenter.distanceTo(c1.center);
  
  // Check if tangent is possible (need d_H_C1 >= r1)
  if (distHC1 < r1 - EPSILON) {
    return []; // Degenerate case
  }
  
  // Tangent angle from homothety center
  const sinAlpha = r1 / distHC1;
  const alpha = Math.asin(Math.min(1, Math.max(-1, sinAlpha))); // Clamp to [-1, 1]
  
  // Direction from H to C1
  const hToC1 = new Vector3()
    .subVectors(c1.center, homothetyCenter)
    .normalize();
  
  // Compute both internal tangents (index 0 and 1)
  for (let index = 0; index < 2; index++) {
    const sign = index === 0 ? 1 : -1;
    const angle = sign * alpha;
    
    // Rotate hToC1 by ±alpha to get direction to touch point on C1
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const dirToTouch1 = new Vector3(
      cos * hToC1.x - sin * hToC1.y,
      sin * hToC1.x + cos * hToC1.y,
      0
    );
    
    const touchPoint1 = c1.center.clone().add(
      dirToTouch1.clone().multiplyScalar(r1)
    );
    
    // Touch point on C2 is in opposite direction (crossing tangent)
    const dirToTouch2 = dirToTouch1.clone().negate();
    const touchPoint2 = c2.center.clone().add(
      dirToTouch2.clone().multiplyScalar(r2)
    );
    
    // Tangent direction
    const direction = new Vector3()
      .subVectors(touchPoint2, touchPoint1)
      .normalize();
    
    solutions.push({
      touchPoint1,
      touchPoint2,
      direction,
      pointOnLine: touchPoint1.clone(),
      label: index === 0 
        ? 'Internal tangent (crossing upper-left)' 
        : 'Internal tangent (crossing lower-right)',
      type: 'internal-tangent',
      index: index as 0 | 1
    });
  }
  
  return solutions;
}

/**
 * Compute line perpendicular to the line connecting circle centers
 * 
 * This line is always well-defined for two distinct circles.
 * It passes through the midpoint of the centers.
 * 
 * @param c1 First circle realization
 * @param c2 Second circle realization
 * @returns Perpendicular line solution (always exists unless circles coincide)
 */
export function computePerpendicularLine(
  c1: Circle2DRealization2D,
  c2: Circle2DRealization2D
): CircleCircleLineSolution | null {
  const r1 = c1.getRadius();
  const r2 = c2.getRadius();
  const centerDist = c1.center.distanceTo(c2.center);
  
  // Check for coincident centers (degenerate case)
  if (centerDist < EPSILON) {
    return null;
  }
  
  // Center line direction
  const centerLine = new Vector3()
    .subVectors(c2.center, c1.center)
    .normalize();
  
  // Perpendicular direction (rotate 90° CCW)
  const perpDirection = new Vector3(-centerLine.y, centerLine.x, 0);
  
  // Midpoint of centers
  const midpoint = new Vector3()
    .addVectors(c1.center, c2.center)
    .multiplyScalar(0.5);
  
  // Touch points are where perpendicular intersects circles
  // (for feature point disambiguation)
  const touchPoint1 = c1.center.clone().add(
    new Vector3()
      .subVectors(midpoint, c1.center)
      .normalize()
      .multiplyScalar(r1)
  );
  
  const touchPoint2 = c2.center.clone().add(
    new Vector3()
      .subVectors(midpoint, c2.center)
      .normalize()
      .multiplyScalar(r2)
  );
  
  return {
    touchPoint1,
    touchPoint2,
    direction: perpDirection,
    pointOnLine: midpoint,
    label: 'Perpendicular to center line',
    type: 'perpendicular'
  };
}

/**
 * Compute line passing through both circle centers
 * 
 * This line is always well-defined for two distinct circles.
 * 
 * @param c1 First circle realization
 * @param c2 Second circle realization
 * @returns Through-centers line solution (null if circles coincide)
 */
export function computeThroughCentersLine(
  c1: Circle2DRealization2D,
  c2: Circle2DRealization2D
): CircleCircleLineSolution | null {
  const r1 = c1.getRadius();
  const r2 = c2.getRadius();
  const centerDist = c1.center.distanceTo(c2.center);
  
  // Check for coincident centers (degenerate case)
  if (centerDist < EPSILON) {
    return null;
  }
  
  // Direction from C1 to C2
  const direction = new Vector3()
    .subVectors(c2.center, c1.center)
    .normalize();
  
  // Touch points are where line intersects circles
  // (on the center line itself)
  const touchPoint1 = c1.center.clone().add(
    direction.clone().multiplyScalar(r1)
  );
  
  const touchPoint2 = c2.center.clone().sub(
    direction.clone().multiplyScalar(r2)
  );
  
  return {
    touchPoint1,
    touchPoint2,
    direction,
    pointOnLine: c1.center.clone(),
    label: 'Through circle centers',
    type: 'through-centers'
  };
}

/**
 * Select geometric solution closest to user's mouse click positions
 * 
 * Algorithm:
 * 1. For each solution, extract feature points (touch points, etc.)
 * 2. For each solution, compute sum of squared distances from click positions to feature points
 * 3. Return solution with minimum total distance
 * 
 * @param solutions Array of all possible geometric solutions
 * @param clickPositions Array of plane coordinates where user clicked elements
 * @returns Solution with minimum total distance to click positions
 */
export function selectClosestSolution(
  solutions: CircleCircleLineSolution[],
  clickPositions: Vector3[]
): CircleCircleLineSolution | null {
  if (solutions.length === 0) {
    return null;
  }
  
  if (solutions.length === 1) {
    return solutions[0];
  }
  
  let minDistance = Infinity;
  let bestSolution: CircleCircleLineSolution | null = null;
  
  for (const solution of solutions) {
    // Feature points for this solution (touch points on both circles)
    const featurePoints = [solution.touchPoint1, solution.touchPoint2];
    
    // Compute total squared distance from clicks to features
    let totalDist = 0;
    
    // Pair up click positions with feature points
    // If more clicks than features, use closest feature
    // If more features than clicks, use all features with closest clicks
    const numPairs = Math.min(clickPositions.length, featurePoints.length);
    
    for (let i = 0; i < numPairs; i++) {
      const click = clickPositions[i];
      const feature = featurePoints[i];
      totalDist += click.distanceToSquared(feature);
    }
    
    if (totalDist < minDistance) {
      minDistance = totalDist;
      bestSolution = solution;
    }
  }
  
  return bestSolution;
}

/**
 * Compute all possible line constructions between two circles
 * 
 * Returns up to 6 solutions:
 * - 2 external tangents (if circles don't overlap significantly)
 * - 2 internal tangents (if circles are separated)
 * - 1 perpendicular to center line (always exists)
 * - 1 through circle centers (always exists)
 * 
 * @param c1 First circle realization
 * @param c2 Second circle realization
 * @returns Array of all feasible solutions (0-6 solutions)
 */
export function computeAllCircleCircleLines(
  c1: Circle2DRealization2D,
  c2: Circle2DRealization2D
): CircleCircleLineSolution[] {
  const solutions: CircleCircleLineSolution[] = [];
  
  // External tangents (0-2 solutions)
  solutions.push(...computeExternalTangents(c1, c2));
  
  // Internal tangents (0-2 solutions)
  solutions.push(...computeInternalTangents(c1, c2));
  
  // Perpendicular to center line (1 solution if circles distinct)
  const perpLine = computePerpendicularLine(c1, c2);
  if (perpLine) {
    solutions.push(perpLine);
  }
  
  // Through centers (1 solution if circles distinct)
  const throughLine = computeThroughCentersLine(c1, c2);
  if (throughLine) {
    solutions.push(throughLine);
  }
  
  return solutions;
}

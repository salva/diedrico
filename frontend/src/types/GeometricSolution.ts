/**
 * GeometricSolution.ts - Interfaces for polymorphic tool geometric solution disambiguation
 * 
 * Phase 73: Mouse-Position-Based Geometric Solution Disambiguation
 * 
 * When polymorphic tools have multiple geometric solutions (e.g., 2 tangent lines to a circle,
 * 6 possible lines between two circles), the user's mouse click positions are used to
 * disambiguate which solution they intended.
 * 
 * This file defines the common interfaces for:
 * - Geometric solutions (candidates from which to choose)
 * - Feature points (key points on solutions used for distance measurement)
 * - Solution selection algorithms
 * 
 * References:
 * - FR-058: Mouse-Position-Based Geometric Solution Disambiguation
 * - specs/001-dihedral-learning-mvp/data-model.md#phase-73-polymorphic-line-tool
 * - specs/001-dihedral-learning-mvp/ui-spec.md#polymorphic-tool-behavior
 */

import type { Vector3 } from 'three';

/**
 * Base interface for geometric solutions that can be disambiguated by mouse position
 * 
 * Used by polymorphic tools when multiple construction methods exist for the same
 * element type (e.g., Line between two circles can be constructed 6 different ways).
 * 
 * Implementation pattern:
 * 1. Tool computes all possible solutions
 * 2. Each solution provides feature points for distance measurement
 * 3. selectClosestSolution() measures distances from click positions to feature points
 * 4. Solution with minimum total distance is selected
 * 
 * Example implementations:
 * - CircleCircleLineSolution (6 construction methods for lines between circles)
 * - CircleCircleCircleSolution (future: Phase 75)
 */
export interface GeometricSolution {
  /**
   * Feature points for distance-based disambiguation
   * 
   * These are key geometric features that characterize the solution:
   * - For tangent lines: touch points on circles
   * - For intersection points: the intersection positions
   * - For circles: center and points on circumference
   * 
   * Framework compares distances from user's click positions to these feature points.
   * Solution with minimum total distance is selected.
   */
  getFeaturePoints(): Vector3[];
  
  /**
   * Human-readable label for UI feedback
   * 
   * Displayed in status messages and tool overlays to help user understand
   * which construction method was selected.
   * 
   * Examples:
   * - "External tangent (above)"
   * - "Internal tangent (crossing upper-left)"
   * - "Perpendicular to center line"
   * - "Through circle centers"
   */
  getLabel(): string;
  
  /**
   * Solution type identifier
   * 
   * Used for categorizing solutions and filtering/sorting in UI.
   * Corresponds to element variation types (e.g., Line2DType values).
   * 
   * Examples:
   * - 'external-tangent'
   * - 'internal-tangent'
   * - 'perpendicular'
   * - 'through-centers'
   */
  getType(): string;
}

/**
 * Result of geometric solution disambiguation
 * 
 * Contains the selected solution and optional metadata about the selection process.
 */
export interface SolutionSelectionResult<T extends GeometricSolution> {
  /**
   * The selected solution
   * Null if no solutions were available or selection failed
   */
  solution: T | null;
  
  /**
   * Total distance score for selected solution
   * Lower is better (closer to user's click positions)
   * Useful for debugging and UI feedback
   */
  distance?: number;
  
  /**
   * Number of candidate solutions considered
   * Useful for debugging and understanding disambiguation complexity
   */
  candidateCount?: number;
}

/**
 * Generic distance-based solution selector
 * 
 * Implements FR-058 algorithm:
 * 1. For each solution, extract feature points
 * 2. For each solution, compute sum of squared distances from click positions to features
 * 3. Return solution with minimum total distance
 * 
 * @param solutions - Array of candidate geometric solutions
 * @param clickPositions - User's mouse click positions in plane coordinates
 * @returns Selected solution with minimum distance, or null if no solutions
 */
export function selectClosestGeometricSolution<T extends GeometricSolution>(
  solutions: T[],
  clickPositions: Vector3[]
): SolutionSelectionResult<T> {
  if (solutions.length === 0) {
    return { solution: null, candidateCount: 0 };
  }
  
  if (solutions.length === 1) {
    return { 
      solution: solutions[0], 
      distance: 0,
      candidateCount: 1 
    };
  }
  
  let minDistance = Infinity;
  let bestSolution: T | null = null;
  
  for (const solution of solutions) {
    const featurePoints = solution.getFeaturePoints();
    
    // Compute total squared distance from clicks to features
    let totalDist = 0;
    
    // Pair up click positions with feature points
    // Use minimum distance from each click to any feature
    for (const click of clickPositions) {
      let minFeatureDist = Infinity;
      
      for (const feature of featurePoints) {
        const dist = click.distanceToSquared(feature);
        if (dist < minFeatureDist) {
          minFeatureDist = dist;
        }
      }
      
      totalDist += minFeatureDist;
    }
    
    if (totalDist < minDistance) {
      minDistance = totalDist;
      bestSolution = solution;
    }
  }
  
  return { 
    solution: bestSolution, 
    distance: Math.sqrt(minDistance),
    candidateCount: solutions.length 
  };
}

/**
 * Adapter to convert CircleCircleLineSolution to GeometricSolution interface
 * 
 * This allows CircleGeometry solutions to work with the generic selectClosestGeometricSolution()
 * function without modifying the CircleGeometry module (separation of concerns).
 */
export class CircleCircleLineSolutionAdapter implements GeometricSolution {
  constructor(
    private readonly solution: {
      touchPoint1: Vector3;
      touchPoint2: Vector3;
      direction: Vector3;
      pointOnLine: Vector3;
      label: string;
      type: string;
    }
  ) {}
  
  getFeaturePoints(): Vector3[] {
    return [this.solution.touchPoint1, this.solution.touchPoint2];
  }
  
  getLabel(): string {
    return this.solution.label;
  }
  
  getType(): string {
    return this.solution.type;
  }
  
  /**
   * Get the underlying CircleCircleLineSolution
   * Useful for accessing solution-specific properties
   */
  getSolution() {
    return this.solution;
  }
}

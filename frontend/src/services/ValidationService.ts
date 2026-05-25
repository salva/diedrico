import type { Result } from '../types/ResultTypes';
import { Ok, Err, InfeasibilityReason } from '../types/ResultTypes';
import type { Element2D, Element3D } from '../types/ElementTypes';
import { isWithinDistance } from '../domain/calculations/distances';

/**
 * Service for validation and infeasibility checks
 */
export class ValidationService {
  private static readonly COINCIDENCE_THRESHOLD = 1e-6;
  private static readonly COLLINEARITY_THRESHOLD = 1e-10;

  /**
   * Validate an element for infeasibility
   */
  static validateElement(element: Element2D | Element3D): Result<void, InfeasibilityReason> {
    // This is a placeholder - actual validation depends on element type
    // and would need access to world state to check related elements
    
    if (element.infeasible) {
      return Err(InfeasibilityReason.MissingDependency);
    }
    
    return Ok(undefined);
  }

  /**
   * Check if two points are coincident
   */
  static checkCoincidentPoints(
    point1: { x: number; y: number },
    point2: { x: number; y: number }
  ): Result<void, InfeasibilityReason> {
    if (isWithinDistance(point1, point2, this.COINCIDENCE_THRESHOLD)) {
      return Err(InfeasibilityReason.CoincidentPoints);
    }
    return Ok(undefined);
  }

  /**
   * Check if three points are collinear
   */
  static checkCollinearity(
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    p3: { x: number; y: number }
  ): Result<void, InfeasibilityReason> {
    // Calculate cross product to check collinearity
    // (p2 - p1) × (p3 - p1) = 0 for collinear points
    const crossProduct = 
      (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x);
    
    if (Math.abs(crossProduct) < this.COLLINEARITY_THRESHOLD) {
      return Err(InfeasibilityReason.CollinearPoints);
    }
    
    return Ok(undefined);
  }

  /**
   * Check if two lines are parallel
   */
  static checkParallelLines(
    line1: { x1: number; y1: number; x2: number; y2: number },
    line2: { x1: number; y1: number; x2: number; y2: number }
  ): Result<void, InfeasibilityReason> {
    const dx1 = line1.x2 - line1.x1;
    const dy1 = line1.y2 - line1.y1;
    const dx2 = line2.x2 - line2.x1;
    const dy2 = line2.y2 - line2.y1;
    
    // Check if cross product is near zero (parallel lines)
    const crossProduct = dx1 * dy2 - dy1 * dx2;
    
    if (Math.abs(crossProduct) < this.COLLINEARITY_THRESHOLD) {
      return Err(InfeasibilityReason.ParallelLines);
    }
    
    return Ok(undefined);
  }

  /**
   * Check if a circle has zero radius
   */
  static checkZeroRadius(radius: number): Result<void, InfeasibilityReason> {
    if (radius < this.COINCIDENCE_THRESHOLD) {
      return Err(InfeasibilityReason.InvalidRadius);
    }
    return Ok(undefined);
  }

  /**
   * Check if a line has zero length
   */
  static checkZeroLength(
    line: { x1: number; y1: number; x2: number; y2: number }
  ): Result<void, InfeasibilityReason> {
    const dx = line.x2 - line.x1;
    const dy = line.y2 - line.y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    if (length < this.COINCIDENCE_THRESHOLD) {
      return Err(InfeasibilityReason.InvalidRadius); // Using InvalidRadius for zero-length lines
    }
    
    return Ok(undefined);
  }

  /**
   * Check if an intersection exists
   */
  static checkIntersectionExists(
    intersectionResult: { x: number; y: number } | null
  ): Result<void, InfeasibilityReason> {
    if (intersectionResult === null) {
      return Err(InfeasibilityReason.NoIntersection);
    }
    return Ok(undefined);
  }

  /**
   * Check if a point is outside valid bounds
   */
  static checkOutOfBounds(
    point: { x: number; y: number },
    bounds: { minX: number; maxX: number; minY: number; maxY: number }
  ): Result<void, InfeasibilityReason> {
    if (
      point.x < bounds.minX ||
      point.x > bounds.maxX ||
      point.y < bounds.minY ||
      point.y > bounds.maxY
    ) {
      return Err(InfeasibilityReason.MissingDependency); // Using MissingDependency as closest match
    }
    return Ok(undefined);
  }

  /**
   * Check if a numerical value is invalid (NaN or Infinity)
   */
  static checkInvalidNumber(value: number): Result<void, InfeasibilityReason> {
    if (!isFinite(value)) {
      return Err(InfeasibilityReason.InvalidRadius); // Using InvalidRadius for invalid numbers
    }
    return Ok(undefined);
  }
}

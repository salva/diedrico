import type { Result } from '../types/ResultTypes';
import { Ok, Err, isOk } from '../types/ResultTypes';
import {
  perpendicularThroughPoint,
  perpendicularFoot,
  arePerpendicular
} from '../domain/calculations/perpendiculars';
import {
  pointPointDistance,
  pointLineDistance,
  pointSegmentDistance,
  closestPointOnLine,
  closestPointOnSegment,
  isWithinDistance
} from '../domain/calculations/distances';

/**
 * Geometry service that wraps calculation functions with validation and Result types
 */
export class GeometryService {
  /**
   * Calculate line-line intersection
   */
  static calculateLineLineIntersection(
    line1: { x1: number; y1: number; x2: number; y2: number },
    line2: { x1: number; y1: number; x2: number; y2: number }
  ): Result<{ x: number; y: number } | null, string> {
    try {
      const denominator =
        (line1.x1 - line1.x2) * (line2.y1 - line2.y2) -
        (line1.y1 - line1.y2) * (line2.x1 - line2.x2);

      if (Math.abs(denominator) < 1e-10) {
        return Ok(null);
      }

      const line1Determinant = line1.x1 * line1.y2 - line1.y1 * line1.x2;
      const line2Determinant = line2.x1 * line2.y2 - line2.y1 * line2.x2;

      return Ok({
        x: (line1Determinant * (line2.x1 - line2.x2) - (line1.x1 - line1.x2) * line2Determinant) / denominator,
        y: (line1Determinant * (line2.y1 - line2.y2) - (line1.y1 - line1.y2) * line2Determinant) / denominator
      });
    } catch (error) {
      return Err(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Calculate perpendicular line through point
   */
  static calculatePerpendicularThroughPoint(
    line: { x1: number; y1: number; x2: number; y2: number },
    point: { x: number; y: number }
  ): Result<{ x1: number; y1: number; x2: number; y2: number }, string> {
    const result = perpendicularThroughPoint(line, point);
    if (isOk(result)) {
      return Ok(result.value);
    } else {
      return Err(result.error);
    }
  }

  /**
   * Calculate perpendicular foot from point to line
   */
  static calculatePerpendicularFoot(
    line: { x1: number; y1: number; x2: number; y2: number },
    point: { x: number; y: number }
  ): Result<{ x: number; y: number }, string> {
    const result = perpendicularFoot(line, point);
    if (isOk(result)) {
      return Ok(result.value);
    } else {
      return Err(result.error);
    }
  }

  /**
   * Check if two lines are perpendicular
   */
  static checkPerpendicular(
    line1: { x1: number; y1: number; x2: number; y2: number },
    line2: { x1: number; y1: number; x2: number; y2: number }
  ): boolean {
    return arePerpendicular(line1, line2);
  }

  /**
   * Measure distance between two points
   */
  static measurePointPointDistance(
    point1: { x: number; y: number },
    point2: { x: number; y: number }
  ): number {
    return pointPointDistance(point1, point2);
  }

  /**
   * Measure distance from point to line
   */
  static measurePointLineDistance(
    point: { x: number; y: number },
    line: { x1: number; y1: number; x2: number; y2: number }
  ): Result<number, string> {
    const result = pointLineDistance(point, line);
    if (isOk(result)) {
      return Ok(result.value);
    } else {
      return Err(result.error);
    }
  }

  /**
   * Measure distance from point to segment
   */
  static measurePointSegmentDistance(
    point: { x: number; y: number },
    segment: { x1: number; y1: number; x2: number; y2: number }
  ): Result<number, string> {
    const result = pointSegmentDistance(point, segment);
    if (isOk(result)) {
      return Ok(result.value);
    } else {
      return Err(result.error);
    }
  }

  /**
   * Find closest point on line
   */
  static findClosestPointOnLine(
    point: { x: number; y: number },
    line: { x1: number; y1: number; x2: number; y2: number }
  ): Result<{ x: number; y: number }, string> {
    const result = closestPointOnLine(point, line);
    if (isOk(result)) {
      return Ok(result.value);
    } else {
      return Err(result.error);
    }
  }

  /**
   * Find closest point on segment
   */
  static findClosestPointOnSegment(
    point: { x: number; y: number },
    segment: { x1: number; y1: number; x2: number; y2: number }
  ): Result<{ x: number; y: number }, string> {
    const result = closestPointOnSegment(point, segment);
    if (isOk(result)) {
      return Ok(result.value);
    } else {
      return Err(result.error);
    }
  }

  /**
   * Check if points are within distance threshold
   */
  static arePointsWithinDistance(
    point1: { x: number; y: number },
    point2: { x: number; y: number },
    threshold: number
  ): boolean {
    return isWithinDistance(point1, point2, threshold);
  }
}

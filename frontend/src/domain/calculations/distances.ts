/**
 * Distance calculation functions
 */

import type { Result } from '../../types/ResultTypes';
import { Ok } from '../../types/ResultTypes';

export interface Point2D {
  x: number;
  y: number;
}

export interface Line2D {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/**
 * Calculate distance between two points
 */
export function pointPointDistance(p1: Point2D, p2: Point2D): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate distance from a point to a line
 */
export function pointLineDistance(point: Point2D, line: Line2D): Result<number> {
  const dx = line.x2 - line.x1;
  const dy = line.y2 - line.y1;
  
  const lengthSquared = dx * dx + dy * dy;
  
  if (lengthSquared < 1e-10) {
    // Line is actually a point, return distance to that point
    return Ok(pointPointDistance(point, { x: line.x1, y: line.y1 }));
  }

  // Use cross product formula for distance
  const numerator = Math.abs(
    (line.y2 - line.y1) * point.x -
    (line.x2 - line.x1) * point.y +
    line.x2 * line.y1 -
    line.y2 * line.x1
  );

  const distance = numerator / Math.sqrt(lengthSquared);

  return Ok(distance);
}

/**
 * Calculate distance from a point to a segment (not infinite line)
 */
export function pointSegmentDistance(point: Point2D, segment: Line2D): Result<number> {
  const dx = segment.x2 - segment.x1;
  const dy = segment.y2 - segment.y1;

  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared < 1e-10) {
    // Segment is actually a point
    return Ok(pointPointDistance(point, { x: segment.x1, y: segment.y1 }));
  }

  // Calculate parameter t for projection onto segment
  const t = Math.max(0, Math.min(1,
    ((point.x - segment.x1) * dx + (point.y - segment.y1) * dy) / lengthSquared
  ));

  const projX = segment.x1 + t * dx;
  const projY = segment.y1 + t * dy;

  return Ok(pointPointDistance(point, { x: projX, y: projY }));
}

/**
 * Check if a point is within a given distance of another point
 */
export function isWithinDistance(
  p1: Point2D,
  p2: Point2D,
  maxDistance: number
): boolean {
  return pointPointDistance(p1, p2) <= maxDistance;
}

/**
 * Find the closest point on a line to a given point
 */
export function closestPointOnLine(point: Point2D, line: Line2D): Result<Point2D> {
  const dx = line.x2 - line.x1;
  const dy = line.y2 - line.y1;

  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared < 1e-10) {
    return Ok({ x: line.x1, y: line.y1 });
  }

  const t = ((point.x - line.x1) * dx + (point.y - line.y1) * dy) / lengthSquared;

  return Ok({
    x: line.x1 + t * dx,
    y: line.y1 + t * dy
  });
}

/**
 * Find the closest point on a segment to a given point
 */
export function closestPointOnSegment(point: Point2D, segment: Line2D): Result<Point2D> {
  const dx = segment.x2 - segment.x1;
  const dy = segment.y2 - segment.y1;

  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared < 1e-10) {
    return Ok({ x: segment.x1, y: segment.y1 });
  }

  const t = Math.max(0, Math.min(1,
    ((point.x - segment.x1) * dx + (point.y - segment.y1) * dy) / lengthSquared
  ));

  return Ok({
    x: segment.x1 + t * dx,
    y: segment.y1 + t * dy
  });
}

/**
 * Perpendicular construction calculations
 */

import type { Result } from '../../types/ResultTypes';
import { Ok, Err } from '../../types/ResultTypes';

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
 * Construct a line perpendicular to a given line through a point
 */
export function perpendicularThroughPoint(
  line: Line2D,
  point: Point2D
): Result<Line2D> {
  const dx = line.x2 - line.x1;
  const dy = line.y2 - line.y1;

  const length = Math.sqrt(dx * dx + dy * dy);

  if (length < 1e-10) {
    return Err('Invalid line (zero length)');
  }

  // Perpendicular direction: rotate 90 degrees
  const perpDx = -dy;
  const perpDy = dx;

  // Normalize and scale to reasonable length
  const scale = 100 / length;

  return Ok({
    x1: point.x - perpDx * scale,
    y1: point.y - perpDy * scale,
    x2: point.x + perpDx * scale,
    y2: point.y + perpDy * scale
  });
}

/**
 * Find the foot of perpendicular from a point to a line
 */
export function perpendicularFoot(
  line: Line2D,
  point: Point2D
): Result<Point2D> {
  const dx = line.x2 - line.x1;
  const dy = line.y2 - line.y1;

  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared < 1e-10) {
    return Err('Invalid line (zero length)');
  }

  // Project point onto line
  const t = ((point.x - line.x1) * dx + (point.y - line.y1) * dy) / lengthSquared;

  return Ok({
    x: line.x1 + t * dx,
    y: line.y1 + t * dy
  });
}

/**
 * Check if a line is perpendicular to another line
 */
export function arePerpendicular(line1: Line2D, line2: Line2D): boolean {
  const dx1 = line1.x2 - line1.x1;
  const dy1 = line1.y2 - line1.y1;
  const dx2 = line2.x2 - line2.x1;
  const dy2 = line2.y2 - line2.y1;

  // Dot product should be zero for perpendicular lines
  const dotProduct = dx1 * dx2 + dy1 * dy2;

  return Math.abs(dotProduct) < 1e-10;
}

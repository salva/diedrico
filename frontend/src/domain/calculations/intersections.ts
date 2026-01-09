/**
 * Intersection calculations for 2D geometric elements
 */

import type { Result } from '../../types/ResultTypes';
import { Ok, Err } from '../../types/ResultTypes';

export interface Point2D {
  x: number;
  y: number;
}

export interface Line2D {
  // Line defined by two points or point + direction
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface Circle2D {
  cx: number;
  cy: number;
  r: number;
}

/**
 * Calculate intersection between two lines
 * Returns Ok with point if they intersect, Err if parallel/coincident
 */
export function lineLineIntersection(
  line1: Line2D,
  line2: Line2D
): Result<Point2D> {
  const x1 = line1.x1, y1 = line1.y1, x2 = line1.x2, y2 = line1.y2;
  const x3 = line2.x1, y3 = line2.y1, x4 = line2.x2, y4 = line2.y2;

  const denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

  if (Math.abs(denominator) < 1e-10) {
    return Err('Lines are parallel or coincident');
  }

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denominator;

  return Ok({
    x: x1 + t * (x2 - x1),
    y: y1 + t * (y2 - y1)
  });
}

/**
 * Calculate intersection between a line and a circle
 * Returns Ok with 0, 1, or 2 intersection points
 */
export function lineCircleIntersection(
  line: Line2D,
  circle: Circle2D
): Result<Point2D[]> {
  const dx = line.x2 - line.x1;
  const dy = line.y2 - line.y1;
  const fx = line.x1 - circle.cx;
  const fy = line.y1 - circle.cy;

  const a = dx * dx + dy * dy;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - circle.r * circle.r;

  const discriminant = b * b - 4 * a * c;

  if (discriminant < -1e-10) {
    return Ok([]); // No intersection
  }

  if (Math.abs(discriminant) < 1e-10) {
    // One intersection (tangent)
    const t = -b / (2 * a);
    return Ok([{
      x: line.x1 + t * dx,
      y: line.y1 + t * dy
    }]);
  }

  // Two intersections
  const t1 = (-b + Math.sqrt(discriminant)) / (2 * a);
  const t2 = (-b - Math.sqrt(discriminant)) / (2 * a);

  return Ok([
    { x: line.x1 + t1 * dx, y: line.y1 + t1 * dy },
    { x: line.x1 + t2 * dx, y: line.y1 + t2 * dy }
  ]);
}

/**
 * Calculate intersection between two circles
 * Returns Ok with 0, 1, or 2 intersection points
 */
export function circleCircleIntersection(
  circle1: Circle2D,
  circle2: Circle2D
): Result<Point2D[]> {
  const dx = circle2.cx - circle1.cx;
  const dy = circle2.cy - circle1.cy;
  const d = Math.sqrt(dx * dx + dy * dy);

  // Check if circles are too far apart or one contains the other
  if (d > circle1.r + circle2.r + 1e-10) {
    return Ok([]); // Too far apart
  }

  if (d < Math.abs(circle1.r - circle2.r) - 1e-10) {
    return Ok([]); // One circle contains the other
  }

  if (Math.abs(d) < 1e-10) {
    return Err('Circles are coincident');
  }

  // Calculate intersection points
  const a = (circle1.r * circle1.r - circle2.r * circle2.r + d * d) / (2 * d);
  const h = Math.sqrt(circle1.r * circle1.r - a * a);

  const x2 = circle1.cx + (a * dx) / d;
  const y2 = circle1.cy + (a * dy) / d;

  if (Math.abs(h) < 1e-10) {
    // One intersection (circles are tangent)
    return Ok([{ x: x2, y: y2 }]);
  }

  // Two intersections
  const rx = -dy * (h / d);
  const ry = dx * (h / d);

  return Ok([
    { x: x2 + rx, y: y2 + ry },
    { x: x2 - rx, y: y2 - ry }
  ]);
}

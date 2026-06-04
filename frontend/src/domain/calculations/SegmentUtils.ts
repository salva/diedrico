import type { Vector3 } from 'three';
import type { Line2DRealization2D } from '../world/Line';

/**
 * Check if a point lies on a bounded segment realization.
 * Infinite line realizations are treated as unbounded and always accepted.
 */
export function isPointOnSegment(point: Vector3, segment: Line2DRealization2D): boolean {
  // For a segment, point2.z should be 1 (not a direction vector)
  if (segment.point2.z !== 1) {
    return true; // Not a segment, it's an infinite line
  }

  // Get the direction from point1 to point2
  const segmentVector = segment.point2.clone().sub(segment.point1);
  const pointVector = point.clone().sub(segment.point1);

  // Project pointVector onto segmentVector
  const segmentLengthSq = segmentVector.lengthSq();
  if (segmentLengthSq === 0) {
    // Degenerate segment (point1 == point2)
    return point.distanceTo(segment.point1) < 0.0001;
  }

  const t = pointVector.dot(segmentVector) / segmentLengthSq;

  // t should be between 0 and 1 for the point to be on the segment
  // Use small epsilon for numerical tolerance
  const epsilon = 0.0001;
  return t >= -epsilon && t <= 1 + epsilon;
}

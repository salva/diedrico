/**
 * Transport.ts - Geometric calculations for transporting points and distances between planes
 * 
 * Point transport is a fundamental operation in dihedral projection where a point
 * on one projection plane is transported to the corresponding location on another
 * plane using a guide line that is perpendicular to the hinge line.
 * 
 * Geometric Principle:
 * - A guide is perpendicular to a hinge line (HL) and passes through a point
 * - The guide exists on BOTH planes associated with the HL
 * - To transport point P from plane1 to plane2:
 *   1. The guide must pass through or near point P on plane1
 *   2. The transported point lies on the same guide in plane2
 *   3. The distance from the HL is preserved (perpendicular distance)
 * 
 * Constitution Compliance:
 * - Principle IV: Uses general geometric algorithms, no hardcoded plane cases
 * - Principle V: ALL calculations use Three.js Vector3/Vector4 homogeneous coordinates
 * 
 * @see specs/001-dihedral-learning-mvp/spec.md#transport-point-via-guide
 * @see specs/001-dihedral-learning-mvp/data-model.md#guide
 */

import { Vector3 } from 'three';
import type { Line2DRealization2D } from '../world/Line';
import type { Guide2DRealization2D } from '../world/Guide';
import { dot, normalize, sub, add, multiplyScalar } from '../../utils/threeUtils';

/**
 * Result of a point transport operation
 */
export interface TransportResult {
  success: boolean;
  transportedPosition?: Vector3;  // Position on target plane (homogeneous)
  error?: string;
}

/**
 * Transport a point from one plane to another along a guide
 * 
 * Algorithm:
 * 1. Verify guide is perpendicular to hinge line (validation)
 * 2. Find the projection of the source point onto the guide
 * 3. Calculate the perpendicular distance from HL to the point along the guide
 * 4. Apply the same distance on the target plane along the same guide
 * 
 * @param sourcePoint Position of point to transport (on source plane, homogeneous)
 * @param guide Guide realization (exists on both planes)
 * @param hingeLine Hinge line realization (boundary between planes)
 * @param targetPlaneId ID of target plane (for validation)
 * @returns TransportResult with transported position or error
 */
export function transportPointViaGuide(
  sourcePoint: Vector3,
  guide: Guide2DRealization2D,
  hingeLine: Line2DRealization2D,
  targetPlaneId: string
): TransportResult {
  // Validate inputs
  if (!sourcePoint || sourcePoint.z === 0) {
    return {
      success: false,
      error: 'Invalid source point: must be a point (w=1), not a direction vector'
    };
  }

  // Normalize homogeneous coordinate (ensure z=1 for points)
  const normalizedSource = new Vector3(
    sourcePoint.x / sourcePoint.z,
    sourcePoint.y / sourcePoint.z,
    1
  );

  // Step 1: Verify guide is perpendicular to hinge line
  // Guide direction and HL direction should be perpendicular (dot product ≈ 0)
  const guideDirNorm = normalize(guide.direction);
  const hlDirNorm = normalize(hingeLine.direction);
  
  const dotProduct = dot(guideDirNorm, hlDirNorm);
  const epsilon = 1e-6;
  
  if (Math.abs(dotProduct) > epsilon) {
    return {
      success: false,
      error: `Guide is not perpendicular to hinge line (dot product: ${dotProduct.toFixed(6)})`
    };
  }

  // Step 2: Find intersection of guide with hinge line
  // This gives us the reference point on the HL
  const hlIntersection = findLineIntersection(guide, hingeLine);
  
  if (!hlIntersection) {
    return {
      success: false,
      error: 'Guide does not intersect hinge line (parallel lines)'
    };
  }

  // Step 3: Calculate signed distance from HL intersection to source point along guide
  // Project source point onto guide to get the parameter t
  // Guide parametric form: P(t) = point + t * direction
  // We want to find t such that P(t) is closest to sourcePoint
  
  const toSource = sub(normalizedSource, guide.point);
  const t = dot(toSource, guide.direction) / dot(guide.direction, guide.direction);
  
  // The projected point on the guide
  const projectedPoint = add(guide.point, multiplyScalar(guide.direction, t));
  
  // Calculate distance from HL intersection to projected point
  const distanceVector = sub(projectedPoint, hlIntersection);
  const signedDistance = dot(distanceVector, guideDirNorm);

  // Step 4: Transport to target plane
  // On the target plane, the guide passes through the same HL intersection
  // We create a point at the same signed distance along the guide
  const transportedPosition = add(
    hlIntersection,
    multiplyScalar(guideDirNorm, signedDistance)
  );

  // Ensure homogeneous coordinate z=1
  transportedPosition.z = 1;

  return {
    success: true,
    transportedPosition
  };
}

/**
 * Find intersection point of two lines in 2D homogeneous coordinates
 * 
 * Uses the cross product method for line intersection:
 * - Lines are represented as (point, direction) in parametric form
 * - Convert to implicit form: ax + by + c = 0
 * - Intersection is the cross product of the two line equations
 * 
 * @param line1 First line realization
 * @param line2 Second line realization
 * @returns Intersection point (homogeneous) or null if parallel
 */
function findLineIntersection(
  line1: Line2DRealization2D,
  line2: Line2DRealization2D
): Vector3 | null {
  // Convert parametric form to implicit form: ax + by + c = 0
  // For line through point P with direction D, the implicit form is:
  // (y - py) * dx - (x - px) * dy = 0
  // => -dy * x + dx * y + (dy * px - dx * py) = 0
  // => a = -dy, b = dx, c = (dy * px - dx * py)
  
  const a1 = -line1.direction.y;
  const b1 = line1.direction.x;
  const c1 = line1.direction.y * line1.point.x - line1.direction.x * line1.point.y;
  
  const a2 = -line2.direction.y;
  const b2 = line2.direction.x;
  const c2 = line2.direction.y * line2.point.x - line2.direction.x * line2.point.y;
  
  // Cross product of line equations: L1 × L2
  // Result is the homogeneous point [b1*c2 - b2*c1, c1*a2 - c2*a1, a1*b2 - a2*b1]
  const denominator = a1 * b2 - a2 * b1;
  
  // Check if lines are parallel (denominator ≈ 0)
  const epsilon = 1e-10;
  if (Math.abs(denominator) < epsilon) {
    return null;  // Lines are parallel
  }
  
  // Calculate intersection point in homogeneous coordinates
  const x = (b1 * c2 - b2 * c1) / denominator;
  const y = (c1 * a2 - c2 * a1) / denominator;
  
  return new Vector3(x, y, 1);
}

/**
 * Validate that a guide is perpendicular to a hinge line
 * 
 * @param guide Guide realization
 * @param hingeLine Hinge line realization
 * @param tolerance Angular tolerance in radians (default: ~0.001 rad ≈ 0.057°)
 * @returns true if perpendicular within tolerance
 */
export function isGuidePerpendicular(
  guide: Guide2DRealization2D,
  hingeLine: Line2DRealization2D,
  tolerance: number = 1e-3
): boolean {
  const guideDirNorm = normalize(guide.direction);
  const hlDirNorm = normalize(hingeLine.direction);
  
  const dotProduct = Math.abs(dot(guideDirNorm, hlDirNorm));
  
  return dotProduct < tolerance;
}

/**
 * Validate that source point and target plane are compatible for transport
 * 
 * Checks:
 * - Source point exists on a valid plane
 * - Target plane is different from source plane
 * - Guide connects the two planes via their shared hinge line
 * 
 * @param sourcePlaneId ID of source plane
 * @param targetPlaneId ID of target plane
 * @param guidePlaneIds Array of plane IDs that the guide belongs to (should be 2)
 * @returns Validation result
 */
export function validateTransportCompatibility(
  sourcePlaneId: string,
  targetPlaneId: string,
  guidePlaneIds: string[]
): { valid: boolean; error?: string } {
  // Target must be different from source
  if (sourcePlaneId === targetPlaneId) {
    return {
      valid: false,
      error: 'Source and target planes must be different'
    };
  }

  // Guide must belong to exactly 2 planes
  if (guidePlaneIds.length !== 2) {
    return {
      valid: false,
      error: `Guide must belong to exactly 2 planes (found ${guidePlaneIds.length})`
    };
  }

  // Guide must connect source and target planes
  const hasSource = guidePlaneIds.includes(sourcePlaneId);
  const hasTarget = guidePlaneIds.includes(targetPlaneId);
  
  if (!hasSource || !hasTarget) {
    return {
      valid: false,
      error: 'Guide must connect source and target planes'
    };
  }

  return { valid: true };
}

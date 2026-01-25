/**
 * Projection Plane Utilities - Phase 82
 * 
 * Utility functions for computing transformation matrices and layout for projection planes.
 * These functions implement the geometric algorithms for creating auxiliary projection planes
 * by unfolding 3D planes onto paper using trace lines.
 * 
 * Key Functions:
 * - computeProjectionPlaneMatrices: Compute planeToPaper, planeTo3D, threeDToPlane from T1, T2, T2'
 * - computeExpectedT2Prime: Compute expected T2' position for validation warning
 * - computeAuxiliaryPlaneLayout: Determine paper-space position for new auxiliary plane
 * 
 * Reference: specs/001-dihedral-learning-mvp/data-model.md §Phase 82
 */

import { Matrix3, Vector3, Vector4 } from 'three';
import type { World } from '@/domain/world/World';
import { Matrix4x3, Matrix3x4, applyMatrix4x3, applyMatrix3x4, crossVector3Homogeneous, dotVector3Homogeneous, dotVector2Homogeneous } from './threeUtils';
import { Line2DRealization2D } from '@/domain/world/Line';

/**
 * Compute intersection point of two 2D lines in homogeneous coordinates
 * 
 * Lines in parametric form:
 * - L1: P1 + s * d1
 * - L2: P2 + t * d2
 * 
 * @param point1 - Point on first line (Vector3 with z=1)
 * @param dir1 - Direction of first line (Vector3 with z=0)
 * @param point2 - Point on second line (Vector3 with z=1)
 * @param dir2 - Direction of second line (Vector3 with z=0)
 * @returns Intersection point (Vector3 with z=1), or null if lines are parallel
 */
export function computeLineLineIntersection2D(
  point1: Vector3,
  dir1: Vector3,
  point2: Vector3,
  dir2: Vector3
): Vector3 | null {
  // Normalize directions for numerical stability
  const d1 = dir1.clone().normalize();
  const d2 = dir2.clone().normalize();
  
  // Compute intersection using parametric form
  // Line 1: P1 + s * d1
  // Line 2: P2 + t * d2
  // Solve: P1 + s * d1 = P2 + t * d2
  const w = new Vector3().subVectors(point1, point2);
  const d1_d1 = d1.dot(d1);
  const d1_d2 = d1.dot(d2);
  const d2_d2 = d2.dot(d2);
  const d1_w = d1.dot(w);
  const d2_w = d2.dot(w);
  
  const denom = d1_d1 * d2_d2 - d1_d2 * d1_d2;
  
  // Check for parallel lines (linearly dependent directions)
  if (Math.abs(denom) < 1e-10) {
    return null; // Lines are parallel - no unique intersection
  }
  
  const s = (d1_d2 * d2_w - d2_d2 * d1_w) / denom;
  const intersection = point1.clone().addScaledVector(d1, s);
  
  return intersection;
}

/**
 * Compute intersection point of two 3D lines
 * 
 * Lines in parametric form:
 * - L1: P1 + s * d1
 * - L2: P2 + t * d2
 * 
 * For projection plane traces, the lines MUST intersect (they are traces of the same 3D plane).
 * If lines don't intersect within tolerance, throws an error indicating invalid trace selection.
 * 
 * @param point1 - Point on first line (Vector4 with w=1)
 * @param dir1 - Direction of first line (Vector4 with w=0)
 * @param point2 - Point on second line (Vector4 with w=1)
 * @param dir2 - Direction of second line (Vector4 with w=0)
 * @returns Intersection point
 * @throws Error if lines are parallel or skew (don't intersect within numerical tolerance)
 */
export function computeLineLineIntersection3D(
  point1: Vector4,
  dir1: Vector4,
  point2: Vector4,
  dir2: Vector4
): Vector3 {
  // Extract Vector3 components from homogeneous Vector4
  const p1 = new Vector3(point1.x, point1.y, point1.z);
  const d1 = new Vector3(dir1.x, dir1.y, dir1.z).normalize();
  const p2 = new Vector3(point2.x, point2.y, point2.z);
  const d2 = new Vector3(dir2.x, dir2.y, dir2.z).normalize();
  
  // Vector from p1 to p2
  const w = new Vector3().subVectors(p1, p2);
  
  // Solve using dot products
  const a = d1.dot(d1);  // Always 1 if normalized
  const b = d1.dot(d2);
  const c = d2.dot(d2);  // Always 1 if normalized
  const d = d1.dot(w);
  const e = d2.dot(w);
  
  const denom = a * c - b * b;  // = 1 - b² for normalized vectors
  
  // Check for parallel lines
  if (Math.abs(denom) < 1e-10) {
    throw new Error('Traces are parallel - they do not define a valid 3D plane');
  }
  
  // Compute parameters for closest points on both lines
  const s = (b * e - c * d) / denom;
  const t = (a * e - b * d) / denom;
  
  // Compute closest points
  const closestPoint1 = p1.clone().addScaledVector(d1, s);
  const closestPoint2 = p2.clone().addScaledVector(d2, t);
  
  // Verify lines actually intersect (not skew)
  const distance = closestPoint1.distanceTo(closestPoint2);
  if (distance > 1e-6) {
    throw new Error(
      `Traces are skew (don't intersect) - distance: ${distance.toFixed(6)}. ` +
      `They do not define a valid 3D plane.`
    );
  }
  
  // Return intersection point (average of closest points for numerical stability)
  return new Vector3(
    (closestPoint1.x + closestPoint2.x) / 2,
    (closestPoint1.y + closestPoint2.y) / 2,
    (closestPoint1.z + closestPoint2.z) / 2
  );
}

/**
 * Transformation matrices for projection plane
 */
export interface ProjectionPlaneMatrices {
  /** Transforms plane (u,v) coordinates to paper (x',y') coordinates */
  planeToPaper: Matrix3;
  
  /** Transforms plane (u,v) coordinates to 3D (x,y,z) coordinates */
  planeTo3D: Matrix4x3;
  
  /** Transforms 3D (x,y,z) coordinates to plane (u,v) coordinates */
  threeDToPlane: Matrix3x4;
}

/**
 * Compute transformation matrices for new projection plane from three trace lines
 * 
 * Algorithm (Phase 82.1 - Complete geometric specification):
 * 
 * **Part 1: planeToPaper (Paper Layout)**
 * - Origin: T1-T2' intersection on paper
 * - U-axis: Direction along T1 on paper
 * - V-axis: Perpendicular to T1 on paper, oriented via T2 side test
 * 
 * **Part 2: planeTo3D and threeDToPlane (3D Geometry)**
 * - Origin: T1-T2 intersection in 3D space
 * - U-axis: Direction along T1 in 3D
 * - V-axis: Double cross product t1 × (t1 × t2) - perpendicular to U, in-plane
 * - V orientation: Consistent with paper V direction
 * 
 * All transformations use homogeneous coordinates:
 * - 2D: Vector3(x, y, 1) for points, (x, y, 0) for directions
 * - 3D: Vector4(x, y, z, 1) for points, (x, y, z, 0) for directions
 * 
 * Reference: data-model.md §Phase 82.1
 * 
 * @param t1HingeTraceId - Line ID for hinge trace T1 on plane P1
 * @param t2OtherTraceId - Line ID for other trace T2 on plane P2 (different from P1)
 * @param t2PrimeLineId - Line ID for position line T2' on plane P1 (orientation selector)
 * @param world - World instance for element lookup and geometry computation
 * @returns Transformation matrices for new projection plane, or null if traces are invalid
 */
export function computeProjectionPlaneMatrices(
  t1HingeTraceId: string,
  t2OtherTraceId: string,
  t2PrimeLineId: string,
  world: World
): ProjectionPlaneMatrices | null {
  // Get lines and their containing planes
  const t1Line = world.getLine2D(t1HingeTraceId)!;
  const t2Line = world.getLine2D(t2OtherTraceId)!;
  const t2PrimeLine = world.getLine2D(t2PrimeLineId)!;
    
  const planeP1 = world.getProjectionPlaneById(t1Line.planeId!)!;
  const planeP2 = world.getProjectionPlaneById(t2Line.planeId!)!;
  
  // Realize lines in 2D
  const t1Realization = t1Line.realize2D(world)!;
  const t2Realization = t2Line.realize2D(world)!;
  const t2PrimeRealization = t2PrimeLine.realize2D(world)!;
  
  // Get 3D realizations of projection planes
  const planeP1Realization3D = world.getProjectionPlane3DRealization(planeP1.id!)!;
  const planeP2Realization3D = world.getProjectionPlane3DRealization(planeP2.id!)!;
  
  const planeP1Realization2D = planeP1.realize2D(world);

  if (!t1Realization.feasible || !t2Realization.feasible || !t2PrimeRealization.feasible ||
        !planeP1Realization3D.feasible || !planeP2Realization3D.feasible || !planeP1Realization2D.feasible) {
    return null; // Geometry not feasible
  }
  
  // ===== PART 1: planeToPaper (Paper Layout) =====
  // Origin: T1-T2' intersection on paper
  // U-axis: Along T1 on paper
  // V-axis: Perpendicular to T1 on paper, oriented via T2 side test
  
  // 1.1: Compute T1-T2' intersection on paper (both on plane P1)
  // Lines in 2D: ax + by + c = 0
  // T1: passes through t1Point1, direction t1Dir
  // T2': passes through t2PrimePoint1, direction t2PrimeDir
  
  // Line2DRealization2D represents infinite lines as:
  // - point1: a point on the line (z=1)
  // - point2: direction vector (z=0)
  // So we should use point2 directly as the direction, not compute point2 - point1
  
  const t1PointInP1 = t1Realization.point1;
  const t1DirInP1 = t1Realization.point2.clone().normalize();
  
  const t2PrimePointInP1 = t2PrimeRealization.point1;
  const t2PrimeDirInP1 = t2PrimeRealization.point2.clone().normalize();
  
  // Compute T1-T2' intersection using helper function
  const auxOriginInP1 = computeLineLineIntersection2D(
    t1PointInP1,
    t1DirInP1,
    t2PrimePointInP1,
    t2PrimeDirInP1
  );
  
  if (!auxOriginInP1) {
    // T1 and T2' are parallel - cannot determine origin
    return null;
  }
  
  // Transform intersection from P1's plane coords to P1's paper coords
  const auxOriginInPaper = auxOriginInP1.clone().applyMatrix3(planeP1Realization2D.planeToPaper2D);
  
  // 1.2: U-axis = direction of T1 transformed to paper coordinates
  const auxUDirInPaper = t1DirInP1.clone().applyMatrix3(planeP1Realization2D.planeToPaper2D);
  
  // Note: V-axis will be computed in Part 2 after we have 3D directions for proper orientation
  
  // 1.5: Build planeToPaper matrix (homogeneous 2D transform)
  // The origin_paper is T1-T2' intersection in P1's PAPER coordinates
  // This becomes the displacement/translation for the auxiliary plane's coordinate system
  // Note: planeToPaper matrix will be constructed in Part 2 after v_paper is computed
  
  
  // ===== PART 2: planeTo3D and threeDToPlane (3D Geometry) =====
  // Origin: T1-T2 intersection in 3D
  // U-axis: Along T1 in 3D
  // V-axis: Double cross product t1 × (t1 × t2) - perpendicular to U, in-plane
  
  // 2.1: Get T1 and T2 direction vectors in 3D (homogeneous coordinates)
  // Line2DRealization2D.point2 is already the direction vector (z=0)
  // Work with homogeneous Vector4 throughout
  const t1DirIn3D = applyMatrix4x3(t1Realization.point2, planeP1Realization3D.planeTo3D).normalize();
  const t2DirIn3D = applyMatrix4x3(t2Realization.point2, planeP2Realization3D.planeTo3D).normalize();
  
  // 2.2: Compute auxVDirInPaper with corrected T2' direction
  // Check if T2' direction needs to be flipped by comparing angles in 3D and 2D
  // If dot products have different signs, flip t2' direction
  const dot_t1_t2_In3D = dotVector3Homogeneous(t1DirIn3D, t2DirIn3D);
  const dot_t1_t2Prime_InP1 = dotVector2Homogeneous(t1DirInP1, t2PrimeDirInP1);
  
  const needsFlip = (dot_t1_t2_In3D * dot_t1_t2Prime_InP1) < 0;
  if (needsFlip) {
    t2PrimeDirInP1.multiplyScalar(-1);
  }
  
  console.log('[computeProjectionPlaneMatrices] dot_t1_t2_In3D:', dot_t1_t2_In3D);
  console.log('[computeProjectionPlaneMatrices] dot_t1_t2Prime_InP1:', dot_t1_t2Prime_InP1);
  console.log('[computeProjectionPlaneMatrices] needsFlip:', needsFlip);
  
  // V-axis using double cross product with corrected T2' direction
  // For 2D vectors, t1 × (t1 × t2') simplifies to:
  // z = t1x*t2'y - t1y*t2'x (2D cross product scalar)
  // v = (t1y*z, -t1x*z)
  const z = t1DirInP1.x * t2PrimeDirInP1.y - t1DirInP1.y * t2PrimeDirInP1.x;
  const auxVDirInP1 = new Vector3(t1DirInP1.y * z, -t1DirInP1.x * z, 0).normalize();
  
  console.log('[computeProjectionPlaneMatrices] auxVDirInP1 (after correction):', auxVDirInP1);
  
  // Transform V-axis from P1 plane coords to paper coords
  const auxVDirInPaper = auxVDirInP1.clone().applyMatrix3(planeP1Realization2D.planeToPaper2D);
  
  // 1.5: Build planeToPaper matrix (homogeneous 2D transform)
  // Now that we have auxUDirInPaper and auxVDirInPaper, we can construct the matrix
  console.log('[computeProjectionPlaneMatrices] auxUDirInPaper:', auxUDirInPaper);
  console.log('[computeProjectionPlaneMatrices] auxVDirInPaper:', auxVDirInPaper);
  console.log('[computeProjectionPlaneMatrices] auxOriginInPaper (in P1 paper coords):', auxOriginInPaper);
  
  const planeToPaper = new Matrix3();
  planeToPaper.set(
    auxUDirInPaper.x, auxVDirInPaper.x, auxOriginInPaper.x,  // Column 0, 1, 2 (row 0)
    auxUDirInPaper.y, auxVDirInPaper.y, auxOriginInPaper.y,  // Row 1
    0,                0,                1                      // Row 2 (homogeneous)
  );
  
  // 2.3: U-axis = direction of T1 in 3D (homogeneous)
  const auxUDirIn3D = t1DirIn3D.clone();
  
  // 2.4: V-axis = double cross product (stable, in-plane, perpendicular to U)
  // Using homogeneous vector operations
  const t1CrossT2In3D = crossVector3Homogeneous(t1DirIn3D, t2DirIn3D);
  // t1 × t2 = normal to plane containing both traces
  
  const auxVDirIn3D = crossVector3Homogeneous(t1DirIn3D, t1CrossT2In3D).normalize();
  // t1 × (t1 × t2) = perpendicular to t1, lying in plane Q
  // Orientation is already correct due to T2' direction correction (needsFlip)
  
  // 2.6: Origin = intersection of T1 and T2 in 3D
  const t1PointIn3D = applyMatrix4x3(t1Realization.point1, planeP1Realization3D.planeTo3D);
  const t2PointIn3D = applyMatrix4x3(t2Realization.point1, planeP2Realization3D.planeTo3D);
  
  const auxOriginIn3D = computeLineLineIntersection3D(
    t1PointIn3D,
    t1DirIn3D,
    t2PointIn3D,
    t2DirIn3D
  );
  
  console.log('[computeProjectionPlaneMatrices] auxUDirIn3D:', auxUDirIn3D);
  console.log('[computeProjectionPlaneMatrices] auxVDirIn3D:', auxVDirIn3D);
  console.log('[computeProjectionPlaneMatrices] auxOriginIn3D:', auxOriginIn3D);
  
  // Verify: compute normal as u × v (extract Vector3 for Three.js operation)
  const auxNormalIn3D = new Vector3().crossVectors(
    new Vector3(auxUDirIn3D.x, auxUDirIn3D.y, auxUDirIn3D.z),
    new Vector3(auxVDirIn3D.x, auxVDirIn3D.y, auxVDirIn3D.z)
  );
  console.log('[computeProjectionPlaneMatrices] Auxiliary plane normal (u×v):', auxNormalIn3D);
  console.log('[computeProjectionPlaneMatrices] Normal should match Plane3DFromTraces normal: (0.408, 0.816, 0.408)');
  
  // 2.7: Build planeTo3D matrix (homogeneous 2D → 3D)
  // Transformation: (u, v, 0) → (x, y, z, 0) for directions
  //                 (u, v, 1) → (x, y, z, 1) for points (via origin + u*auxUDirIn3D + v*auxVDirIn3D)
  // Formula: point_3d = auxOriginIn3D + u * auxUDirIn3D + v * auxVDirIn3D
  const planeTo3D = new Matrix4x3();
  planeTo3D.set(
    auxUDirIn3D.x, auxVDirIn3D.x, auxOriginIn3D.x,  // Row 0: x = u*auxUDirIn3D.x + v*auxVDirIn3D.x + auxOriginIn3D.x
    auxUDirIn3D.y, auxVDirIn3D.y, auxOriginIn3D.y,  // Row 1: y = ...
    auxUDirIn3D.z, auxVDirIn3D.z, auxOriginIn3D.z,  // Row 2: z = ...
    0,             0,             1                  // Row 3: w = 1 (homogeneous)
  );
  
  // 2.8: Build threeDToPlane matrix (homogeneous 3D → 2D)
  // Inverse transformation: (x, y, z, 1) → (u, v, 0)
  // Solve: (x, y, z) = auxOriginIn3D + u * auxUDirIn3D + v * auxVDirIn3D
  // u = (point_3d - auxOriginIn3D) · auxUDirIn3D  (since auxUDirIn3D is normalized and orthogonal to auxVDirIn3D)
  // v = (point_3d - auxOriginIn3D) · auxVDirIn3D
  const threeDToPlane = new Matrix3x4();
  threeDToPlane.set(
    auxUDirIn3D.x, auxUDirIn3D.y, auxUDirIn3D.z, -dotVector3Homogeneous(auxUDirIn3D, new Vector4(auxOriginIn3D.x, auxOriginIn3D.y, auxOriginIn3D.z, 1)),  // Row 0: u = ...
    auxVDirIn3D.x, auxVDirIn3D.y, auxVDirIn3D.z, -dotVector3Homogeneous(auxVDirIn3D, new Vector4(auxOriginIn3D.x, auxOriginIn3D.y, auxOriginIn3D.z, 1)),  // Row 1: v = ...
    0,             0,             0,             0                       // Row 2: w = 0 (direction)
  );
  
  return {
    planeToPaper,
    planeTo3D,
    threeDToPlane
  };
}

/**
 * Compute expected T2' position from T1 and T2
 * 
 * Used for validation warning in CreateProjectionPlaneTool.
 * Computes where T2 should appear on P1 after unfolding plane Q around T1.
 * 
 * Algorithm:
 * 1. Get T1, T2 in 3D
 * 2. Unfold plane Q onto P1 around T1 as hinge
 * 3. Where does T2 land after unfolding? That's expected T2'
 * 
 * @param t1HingeTraceId - Line ID for hinge trace T1 on plane P1
 * @param t2OtherTraceId - Line ID for other trace T2 on plane P2
 * @param world - World instance for element lookup
 * @returns 2D line realization representing expected T2' position on P1
 */
export function computeExpectedT2Prime(
  t1HingeTraceId: string,
  t2OtherTraceId: string,
  world: World
): Line2DRealization2D | null {
  // Algorithm:
  // 1. Get T1, T2 in 3D
  // 2. Unfold plane Q onto P1 around T1 as hinge
  // 3. Where does T2 land after unfolding? That's expected T2'
  
  try {
    const t1Line = world.getLine2D(t1HingeTraceId);
    const t2Line = world.getLine2D(t2OtherTraceId);
    
    if (!t1Line || !t2Line) {
      return null;
    }
    
    const planeP1 = world.getProjectionPlaneById(t1Line.planeId!);
    const planeP2 = world.getProjectionPlaneById(t2Line.planeId!);
    
    if (!planeP1 || !planeP2) {
      return null;
    }
    
    // Get 2D realizations
    const t1Realization = t1Line.realize2D(world);
    const t2Realization = t2Line.realize2D(world);
    
    if (!t1Realization?.feasible || !t2Realization?.feasible) {
      return null;
    }
    
    // Get 3D realizations of projection planes
    const planeP1Realization3D = world.getProjectionPlane3DRealization(planeP1.id!);
    const planeP2Realization3D = world.getProjectionPlane3DRealization(planeP2.id!);
    
    if (!planeP1Realization3D || !planeP2Realization3D) {
      return null;
    }
    
    // Transform T1 and T2 to 3D
    const t1Point1_3D = applyMatrix4x3(t1Realization.point1, planeP1Realization3D.planeTo3D);
    const t1Direction_2D = new Vector3(
      t1Realization.point1.x + t1Realization.point2.x,
      t1Realization.point1.y + t1Realization.point2.y,
      1
    );
    const t1Point2_3D = applyMatrix4x3(t1Direction_2D, planeP1Realization3D.planeTo3D);
    
    const t2Point1_3D = applyMatrix4x3(t2Realization.point1, planeP2Realization3D.planeTo3D);
    const t2Direction_2D = new Vector3(
      t2Realization.point1.x + t2Realization.point2.x,
      t2Realization.point1.y + t2Realization.point2.y,
      1
    );
    const t2Point2_3D = applyMatrix4x3(t2Direction_2D, planeP2Realization3D.planeTo3D);
    
    // T1 direction (hinge axis)
    const t1Dir = new Vector3(
      t1Point2_3D.x - t1Point1_3D.x,
      t1Point2_3D.y - t1Point1_3D.y,
      t1Point2_3D.z - t1Point1_3D.z
    );
    t1Dir.normalize();
    
    // T2 direction
    const t2Dir = new Vector3(
      t2Point2_3D.x - t2Point1_3D.x,
      t2Point2_3D.y - t2Point1_3D.y,
      t2Point2_3D.z - t2Point1_3D.z
    );
    t2Dir.normalize();
    
    // Reflect T2 onto P1 by rotating 180° around T1 (hinge axis)
    // Rodrigues' rotation formula: v' = v cos(θ) + (k × v) sin(θ) + k(k · v)(1 - cos(θ))
    // For θ=180°: cos(180°)=-1, sin(180°)=0
    // v' = -v + 2k(k · v)
    
    const k = t1Dir; // Hinge axis (normalized)
    const dotProduct = k.dot(t2Dir);
    
    // Rotate T2 direction 180° around hinge
    const t2DirReflected = new Vector3(
      -t2Dir.x + 2 * k.x * dotProduct,
      -t2Dir.y + 2 * k.y * dotProduct,
      -t2Dir.z + 2 * k.z * dotProduct
    );
    
    // Also need to rotate a point on T2 to get position
    // Find closest point on T1 to T2Point1
    const t1ToT2 = new Vector3(
      t2Point1_3D.x - t1Point1_3D.x,
      t2Point1_3D.y - t1Point1_3D.y,
      t2Point1_3D.z - t1Point1_3D.z
    );
    const projection = k.dot(t1ToT2);
    const closestPointOnT1 = new Vector3(
      t1Point1_3D.x + k.x * projection,
      t1Point1_3D.y + k.y * projection,
      t1Point1_3D.z + k.z * projection
    );
    
    // Vector from hinge to T2Point1
    const hingeToT2 = new Vector3(
      t2Point1_3D.x - closestPointOnT1.x,
      t2Point1_3D.y - closestPointOnT1.y,
      t2Point1_3D.z - closestPointOnT1.z
    );
    
    // Reflect this vector 180° around hinge
    const hingeToT2Dot = k.dot(hingeToT2);
    const hingeToT2Reflected = new Vector3(
      -hingeToT2.x + 2 * k.x * hingeToT2Dot,
      -hingeToT2.y + 2 * k.y * hingeToT2Dot,
      -hingeToT2.z + 2 * k.z * hingeToT2Dot
    );
    
    // Expected T2' position in 3D
    const t2PrimePoint1_3D = new Vector3(
      closestPointOnT1.x + hingeToT2Reflected.x,
      closestPointOnT1.y + hingeToT2Reflected.y,
      closestPointOnT1.z + hingeToT2Reflected.z
    );
    
    const t2PrimePoint2_3D = new Vector3(
      t2PrimePoint1_3D.x + t2DirReflected.x,
      t2PrimePoint1_3D.y + t2DirReflected.y,
      t2PrimePoint1_3D.z + t2DirReflected.z
    );
    
    // Transform back to P1's 2D coordinates
    const t2PrimePoint1_2D_4 = applyMatrix3x4(
      new Vector4(t2PrimePoint1_3D.x, t2PrimePoint1_3D.y, t2PrimePoint1_3D.z, 1),
      planeP1Realization3D.threeDToPlane
    );
    
    const t2PrimePoint2_2D_4 = applyMatrix3x4(
      new Vector4(t2PrimePoint2_3D.x, t2PrimePoint2_3D.y, t2PrimePoint2_3D.z, 1),
      planeP1Realization3D.threeDToPlane
    );
    
    // Convert to homogeneous 2D coordinates
    const t2PrimePoint1_2D = new Vector3(
      t2PrimePoint1_2D_4.x / t2PrimePoint1_2D_4.z,
      t2PrimePoint1_2D_4.y / t2PrimePoint1_2D_4.z,
      1
    );
    
    const t2PrimePoint2_2D = new Vector3(
      t2PrimePoint2_2D_4.x / t2PrimePoint2_2D_4.z,
      t2PrimePoint2_2D_4.y / t2PrimePoint2_2D_4.z,
      1
    );
    
    // Direction vector
    const t2PrimeDir_2D = new Vector3(
      t2PrimePoint2_2D.x - t2PrimePoint1_2D.x,
      t2PrimePoint2_2D.y - t2PrimePoint1_2D.y,
      0  // Direction vector has z=0
    );
    
    // Return as Line2DRealization2D
    return new Line2DRealization2D(
      t2PrimePoint1_2D,
      t2PrimeDir_2D,
      true
    );
    
  } catch (error) {
    console.warn('[computeExpectedT2Prime] Failed to compute expected T2\' position:', error);
    return null;
  }
}

/**
 * Compute layout position for auxiliary projection plane on paper
 * 
 * Strategy: Stack auxiliary planes vertically below P_V with spacing.
 * 
 * @param world - World instance to query existing planes
 * @returns Paper-space offset {x, y} for new auxiliary plane
 */
export function computeAuxiliaryPlaneLayout(world: World): { x: number; y: number } {
  // Count existing auxiliary planes (exclude P_H and P_V)
  const allPlanes = world.getAllProjectionPlanes();
  const auxiliaryPlanes = allPlanes.filter(plane => 
    plane.id !== 'proj_plane_1' && plane.id !== 'proj_plane_2'
  );
  
  const numAuxiliaryPlanes = auxiliaryPlanes.length;
  
  // Layout constants
  const PLANE_HEIGHT = 300;  // Standard projection plane height in paper units
  const VERTICAL_SPACING = 50;  // Gap between planes
  
  // Stack below P_V (which is at y=0 to y=PLANE_HEIGHT)
  const yOffset = (PLANE_HEIGHT * 2) + (VERTICAL_SPACING * (numAuxiliaryPlanes + 1)) + (PLANE_HEIGHT * numAuxiliaryPlanes);
  
  return {
    x: 0,  // Align with P_H/P_V x-position
    y: yOffset
  };
}

/**
 * Compute distance between two 2D lines
 * 
 * Used for T2' position validation warning.
 * Returns approximate distance in canvas/paper coordinates.
 * 
 * @param line1 - First line realization
 * @param line2 - Second line realization
 * @returns Distance between lines (approximate, in paper units)
 */
export function computeLineDistance(line1: Line2DRealization2D, line2: Line2DRealization2D): number {
  // Compute minimum distance between two lines in 2D
  // For parallel lines: distance between them
  // For intersecting lines: 0
  // For skew lines (shouldn't happen in 2D): closest approach
  
  const p1 = line1.point1; // Point on line 1
  const d1 = line1.point2; // Direction of line 1 (unnormalized)
  const p2 = line2.point1; // Point on line 2
  const d2 = line2.point2; // Direction of line 2 (unnormalized)
  
  // Normalize directions
  const d1Length = Math.sqrt(d1.x * d1.x + d1.y * d1.y);
  const d2Length = Math.sqrt(d2.x * d2.x + d2.y * d2.y);
  
  if (d1Length < 1e-10 || d2Length < 1e-10) {
    // Degenerate line (point)
    return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
  }
  
  const d1Norm = { x: d1.x / d1Length, y: d1.y / d1Length };
  const d2Norm = { x: d2.x / d2Length, y: d2.y / d2Length };
  
  // Check if lines are parallel
  const cross = d1Norm.x * d2Norm.y - d1Norm.y * d2Norm.x;
  
  if (Math.abs(cross) < 1e-6) {
    // Lines are parallel - compute distance between them
    // Distance = |(p2 - p1) × d1| / |d1|
    const diffX = p2.x - p1.x;
    const diffY = p2.y - p1.y;
    
    // 2D cross product magnitude: |(diffX, diffY) × (d1Norm.x, d1Norm.y)|
    const crossMag = Math.abs(diffX * d1Norm.y - diffY * d1Norm.x);
    
    return crossMag; // Already normalized since d1Norm is unit length
  }
  
  // Lines intersect - return 0 (they're at the same position at intersection)
  // Or more precisely, compute average distance if we want to measure "how close they are overall"
  // For validation warning purposes, we want to know if the lines are approximately the same
  // So we'll compute distance from midpoint of line2 to line1
  
  // Point on line 2 (use p2)
  // Distance from p2 to line 1: |(p2 - p1) × d1| / |d1|
  const diffX = p2.x - p1.x;
  const diffY = p2.y - p1.y;
  const crossMag = Math.abs(diffX * d1Norm.y - diffY * d1Norm.x);
  
  return crossMag;
}

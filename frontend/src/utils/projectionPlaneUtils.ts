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
import { Matrix4x3, Matrix3x4, applyMatrix4x3, applyMatrix3x4 } from './threeUtils';
import { Line2DRealization2D } from '@/domain/world/Line';

/**
 * 3D line representation for geometric computations
 */
interface Line3D {
  point: Vector3;      // Any point on the line
  direction: Vector3;  // Direction vector (should be normalized)
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
 * @param line1 - First line { point: Vector3, direction: Vector3 }
 * @param line2 - Second line { point: Vector3, direction: Vector3 }
 * @returns Intersection point
 * @throws Error if lines are parallel or skew (don't intersect within numerical tolerance)
 */
export function computeLineLineIntersection3D(line1: Line3D, line2: Line3D): Vector3 {
  const p1 = line1.point;
  const d1 = line1.direction.clone().normalize();
  const p2 = line2.point;
  const d2 = line2.direction.clone().normalize();
  
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
  const point1 = p1.clone().addScaledVector(d1, s);
  const point2 = p2.clone().addScaledVector(d2, t);
  
  // Verify lines actually intersect (not skew)
  const distance = point1.distanceTo(point2);
  if (distance > 1e-6) {
    throw new Error(
      `Traces are skew (don't intersect) - distance: ${distance.toFixed(6)}. ` +
      `They do not define a valid 3D plane.`
    );
  }
  
  // Return intersection point (average of closest points for numerical stability)
  return new Vector3(
    (point1.x + point2.x) / 2,
    (point1.y + point2.y) / 2,
    (point1.z + point2.z) / 2
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
 * @returns Transformation matrices for new projection plane
 * @throws Error if traces are invalid (parallel, not feasible, etc.)
 */
export function computeProjectionPlaneMatrices(
  t1HingeTraceId: string,
  t2OtherTraceId: string,
  t2PrimeLineId: string,
  world: World
): ProjectionPlaneMatrices {
  // Get lines and their containing planes
  const t1Line = world.getLine2D(t1HingeTraceId);
  const t2Line = world.getLine2D(t2OtherTraceId);
  const t2PrimeLine = world.getLine2D(t2PrimeLineId);
  
  if (!t1Line || !t2Line || !t2PrimeLine) {
    throw new Error('Cannot find trace lines');
  }
  
  const planeP1 = world.getProjectionPlaneById(t1Line.planeId!);
  const planeP2 = world.getProjectionPlaneById(t2Line.planeId!);
  
  if (!planeP1 || !planeP2) {
    throw new Error('Cannot find projection planes for traces');
  }
  
  // Realize lines in 2D
  const t1Realization = t1Line.realize2D(world);
  const t2Realization = t2Line.realize2D(world);
  const t2PrimeRealization = t2PrimeLine.realize2D(world);
  
  if (!t1Realization?.feasible || !t2Realization?.feasible || !t2PrimeRealization?.feasible) {
    throw new Error('Trace lines are not feasible');
  }
  
  // Get 3D realizations of projection planes
  const planeP1Realization3D = world.getProjectionPlane3DRealization(planeP1.id!);
  const planeP2Realization3D = world.getProjectionPlane3DRealization(planeP2.id!);
  
  if (!planeP1Realization3D || !planeP2Realization3D) {
    throw new Error('Cannot get 3D realizations for projection planes');
  }
  
  // ===== PART 1: planeToPaper (Paper Layout) =====
  // Origin: T1-T2' intersection on paper
  // U-axis: Along T1 on paper
  // V-axis: Perpendicular to T1 on paper, oriented via T2 side test
  
  // 1.1: Compute T1-T2' intersection on paper (both on plane P1)
  // Lines in 2D: ax + by + c = 0
  // T1: passes through t1Point1, direction t1Dir
  // T2': passes through t2PrimePoint1, direction t2PrimeDir
  
  const t1Point1 = t1Realization.point1;
  const t1Dir_raw = new Vector3(
    t1Realization.point2.x - t1Realization.point1.x,
    t1Realization.point2.y - t1Realization.point1.y,
    0
  );
  const t1Dir_2d = t1Dir_raw.clone().normalize();
  
  const t2PrimePoint1 = t2PrimeRealization.point1;
  const t2PrimeDir_raw = new Vector3(
    t2PrimeRealization.point2.x - t2PrimeRealization.point1.x,
    t2PrimeRealization.point2.y - t2PrimeRealization.point1.y,
    0
  );
  const t2PrimeDir_2d = t2PrimeDir_raw.clone().normalize();
  
  // Compute intersection using parametric form
  // Line 1: P1 + s * d1
  // Line 2: P2 + t * d2
  // Solve: P1 + s * d1 = P2 + t * d2
  const w_2d = new Vector3().subVectors(t1Point1, t2PrimePoint1);
  const d1_d1 = t1Dir_2d.dot(t1Dir_2d);
  const d1_d2 = t1Dir_2d.dot(t2PrimeDir_2d);
  const d2_d2 = t2PrimeDir_2d.dot(t2PrimeDir_2d);
  const d1_w = t1Dir_2d.dot(w_2d);
  const d2_w = t2PrimeDir_2d.dot(w_2d);
  
  const denom_2d = d1_d1 * d2_d2 - d1_d2 * d1_d2;
  
  if (Math.abs(denom_2d) < 1e-10) {
    throw new Error('T1 and T2\' are parallel - cannot determine origin');
  }
  
  const s_2d = (d1_d2 * d2_w - d2_d2 * d1_w) / denom_2d;
  const origin_paper = t1Point1.clone().addScaledVector(t1Dir_2d, s_2d);
  
  // 1.2: U-axis = direction of T1 on paper (homogeneous direction)
  const u_paper = new Vector3(t1Dir_2d.x, t1Dir_2d.y, 0);  // w=0 for direction
  
  // 1.3: V-axis = perpendicular to T1 on paper
  // Perpendicular in 2D: (x, y) → (-y, x) for +90° or (y, -x) for -90°
  const v_paper_candidate = new Vector3(-u_paper.y, u_paper.x, 0);
  
  // 1.4: Orientation check: which side of T1 does T2 fall on?
  // Transform a point on T2 to P1's paper coordinates and check which side
  
  // Get a point on T2 in 3D
  const t2Point1_3D_forOrientation = applyMatrix4x3(t2Realization.point1, planeP2Realization3D.planeTo3D);
  
  // Transform to P1's plane coordinates
  const t2Point_on_P1_plane = applyMatrix3x4(
    new Vector4(t2Point1_3D_forOrientation.x, t2Point1_3D_forOrientation.y, t2Point1_3D_forOrientation.z, 1),
    planeP1Realization3D.threeDToPlane
  );
  
  // Transform to paper coordinates (get planeToPaper2D from plane's 2D realization)
  const planeP1Realization2D = planeP1.realize2D(world);
  const t2Point_on_P1_paper = new Vector3(t2Point_on_P1_plane.x, t2Point_on_P1_plane.y, 1)
    .applyMatrix3(planeP1Realization2D.planeToPaper2D);
  
  // Vector from origin to T2 point
  const offset_paper = new Vector3(
    t2Point_on_P1_paper.x - origin_paper.x,
    t2Point_on_P1_paper.y - origin_paper.y,
    0
  );
  
  // Dot product determines which side
  const side = offset_paper.dot(v_paper_candidate);
  
  const v_paper = (side > 0) ? v_paper_candidate : v_paper_candidate.clone().negate();
  
  // 1.5: Build planeToPaper matrix (homogeneous 2D transform)
  // Transformation: (u, v, 1) → (x_paper, y_paper, 1)
  const planeToPaper = new Matrix3();
  planeToPaper.set(
    u_paper.x, v_paper.x, origin_paper.x,  // Column 0, 1, 2 (row 0)
    u_paper.y, v_paper.y, origin_paper.y,  // Row 1
    0,         0,         1                 // Row 2 (homogeneous)
  );
  
  
  // ===== PART 2: planeTo3D and threeDToPlane (3D Geometry) =====
  // Origin: T1-T2 intersection in 3D
  // U-axis: Along T1 in 3D
  // V-axis: Double cross product t1 × (t1 × t2) - perpendicular to U, in-plane
  
  // 2.1: Get T1 and T2 as 3D lines
  // T1 points in 3D
  const t1Point1_3D = applyMatrix4x3(t1Realization.point1, planeP1Realization3D.planeTo3D);
  const t1Point2_3D = applyMatrix4x3(t1Realization.point2, planeP1Realization3D.planeTo3D);
  
  console.log('[computeProjectionPlaneMatrices] T1 2D:', t1Realization.point1, t1Realization.point2);
  console.log('[computeProjectionPlaneMatrices] T1 3D: p1=', t1Point1_3D, 'p2=', t1Point2_3D);
  
  // T2 points in 3D
  const t2Point1_3D = applyMatrix4x3(t2Realization.point1, planeP2Realization3D.planeTo3D);
  const t2Point2_3D = applyMatrix4x3(t2Realization.point2, planeP2Realization3D.planeTo3D);
  
  console.log('[computeProjectionPlaneMatrices] T2 2D:', t2Realization.point1, t2Realization.point2);
  console.log('[computeProjectionPlaneMatrices] T2 3D: p1=', t2Point1_3D, 'p2=', t2Point2_3D);
  
  // 2.2: T1 and T2 as Line3D
  // CRITICAL: point2 in realization has w=0 (direction vector in homogeneous coords)
  // When transformed to 3D, it remains a direction - use it directly, don't subtract!
  const t1Line3D: Line3D = {
    point: new Vector3(t1Point1_3D.x, t1Point1_3D.y, t1Point1_3D.z),
    direction: new Vector3(t1Point2_3D.x, t1Point2_3D.y, t1Point2_3D.z).normalize()
  };
  
  const t2Line3D: Line3D = {
    point: new Vector3(t2Point1_3D.x, t2Point1_3D.y, t2Point1_3D.z),
    direction: new Vector3(t2Point2_3D.x, t2Point2_3D.y, t2Point2_3D.z).normalize()
  };
  
  console.log('[computeProjectionPlaneMatrices] t1Line3D:', t1Line3D);
  console.log('[computeProjectionPlaneMatrices] t2Line3D:', t2Line3D);
  
  // 2.3: U-axis = direction of T1 in 3D
  const u_3d = t1Line3D.direction.clone();
  
  // 2.4: V-axis = double cross product (stable, in-plane, perpendicular to U)
  const t1_dir = t1Line3D.direction.clone();
  const t2_dir = t2Line3D.direction.clone();
  
  const t1_cross_t2 = new Vector3().crossVectors(t1_dir, t2_dir);
  // t1 × t2 = normal to plane containing both traces
  
  const v_3d_candidate = new Vector3().crossVectors(t1_dir, t1_cross_t2).normalize();
  // t1 × (t1 × t2) = perpendicular to t1, lying in plane Q
  
  // 2.5: Check orientation: v_3d should align with paper v direction
  // Project v_3d_candidate onto P1, check if it aligns with v_paper
  const v_3d_on_P1_plane = applyMatrix3x4(
    new Vector4(v_3d_candidate.x, v_3d_candidate.y, v_3d_candidate.z, 0),  // Direction: w=0
    planeP1Realization3D.threeDToPlane
  );
  
  const v_3d_on_P1_paper = new Vector3(v_3d_on_P1_plane.x, v_3d_on_P1_plane.y, 0)
    .applyMatrix3(planeP1Realization2D.planeToPaper2D);
  
  const alignment = new Vector3(v_3d_on_P1_paper.x, v_3d_on_P1_paper.y, 0).dot(v_paper);
  
  const v_3d = (alignment > 0) ? v_3d_candidate : v_3d_candidate.clone().negate();
  
  // 2.6: Origin = intersection of T1 and T2 in 3D
  const origin_3d = computeLineLineIntersection3D(t1Line3D, t2Line3D);
  
  console.log('[computeProjectionPlaneMatrices] u_3d:', u_3d);
  console.log('[computeProjectionPlaneMatrices] v_3d:', v_3d);
  console.log('[computeProjectionPlaneMatrices] origin_3d:', origin_3d);
  
  // Verify: compute normal as u × v
  const normal_aux = new Vector3().crossVectors(u_3d, v_3d);
  console.log('[computeProjectionPlaneMatrices] Auxiliary plane normal (u×v):', normal_aux);
  console.log('[computeProjectionPlaneMatrices] Normal should match Plane3DFromTraces normal: (0.408, 0.816, 0.408)');
  
  // 2.7: Build planeTo3D matrix (homogeneous 2D → 3D)
  // Transformation: (u, v, 0) → (x, y, z, 0) for directions
  //                 (u, v, 1) → (x, y, z, 1) for points (via origin + u*u_3d + v*v_3d)
  // Formula: point_3d = origin_3d + u * u_3d + v * v_3d
  const planeTo3D = new Matrix4x3();
  planeTo3D.set(
    u_3d.x, v_3d.x, origin_3d.x,  // Row 0: x = u*u_3d.x + v*v_3d.x + origin_3d.x
    u_3d.y, v_3d.y, origin_3d.y,  // Row 1: y = ...
    u_3d.z, v_3d.z, origin_3d.z,  // Row 2: z = ...
    0,      0,      1             // Row 3: w = 1 (homogeneous)
  );
  
  // 2.8: Build threeDToPlane matrix (homogeneous 3D → 2D)
  // Inverse transformation: (x, y, z, 1) → (u, v, 0)
  // Solve: (x, y, z) = origin_3d + u * u_3d + v * v_3d
  // u = (point_3d - origin_3d) · u_3d  (since u_3d is normalized and orthogonal to v_3d)
  // v = (point_3d - origin_3d) · v_3d
  const threeDToPlane = new Matrix3x4();
  threeDToPlane.set(
    u_3d.x, u_3d.y, u_3d.z, -u_3d.dot(origin_3d),  // Row 0: u = ...
    v_3d.x, v_3d.y, v_3d.z, -v_3d.dot(origin_3d),  // Row 1: v = ...
    0,      0,      0,      0                       // Row 2: w = 0 (direction)
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

/**
 * Element3DRealization3D - Base class for all 3D element realizations
 * 
 * Mirrors Element2DRealization2D architecture:
 * - Contains ONLY numeric data (Vector4 coordinates)
 * - NO structural information (id, projection IDs) - that stays in Element3D
 * - Extends Realization to inherit feasible property
 * 
 * Architectural symmetry:
 * - Realization → Element2DRealization2D (Vector3 for 2D)
 * - Realization → Element3DRealization3D (Vector4 for 3D)
 * 
 * Phase 78: Introduced for user-created 3D elements from 2D projections
 * 
 * @see specs/001-dihedral-learning-mvp/data-model.md#element3drealization3d
 */
import { Vector4 } from 'three';
import { Realization } from './Realization';

/**
 * Base class for all 3D element realizations (point, line, segment, plane geometry)
 * 
 * Provides common feasibility status for all 3D geometric computations.
 * 
 * Architectural principle: Realization classes contain ONLY geometric data.
 * No structural information (id, projection IDs) - that stays in domain objects.
 */
export abstract class Element3DRealization3D extends Realization {
  /**
   * Constructor for all 3D element realizations
   * 
   * @param feasible - Whether the geometric computation succeeded (default: true)
   */
  constructor(feasible: boolean = true) {
    super(feasible);
  }
}

/**
 * Point3DRealization3D - Stores computed 3D position for a point
 * Result of realize3D() geometric calculation
 * 
 * Contains ONLY numeric data (Vector4). Structural information (id, projection IDs) stays in Point3D.
 */
export class Point3DRealization3D extends Element3DRealization3D {
  position: Vector4;  // Position in 3D space [x, y, z, 1] - ONLY NUMERIC DATA

  constructor(position: Vector4, feasible: boolean = true) {
    super(feasible);
    this.position = position;
  }

  /**
   * Get position as Vector4 (homogeneous coordinates)
   */
  getPosition(): Vector4 {
    return this.position;
  }

  /**
   * Get position as Cartesian coordinates [x, y, z]
   * Useful for rendering (converts from homogeneous)
   */
  getCartesian(): [number, number, number] {
    // For regular points w=1, but handle general case
    const w = this.position.w || 1;
    return [
      this.position.x / w,
      this.position.y / w,
      this.position.z / w
    ];
  }
}

/**
 * Line3DRealization3D - Stores computed 3D line (point + direction)
 * Result of realize3D() geometric calculation
 * 
 * Representation: parametric form p(t) = point + t * direction
 * - point: Vector4 [x, y, z, 1] - any point on the line
 * - direction: Vector4 [dx, dy, dz, 0] - normalized direction (w=0 for vectors)
 * 
 * Contains ONLY numeric data. Structural information (id, projection IDs) stays in Line3D.
 */
export class Line3DRealization3D extends Element3DRealization3D {
  point: Vector4;      // Point on line [x, y, z, 1] - w=1 for points
  direction: Vector4;  // Direction vector [dx, dy, dz, 0] - w=0 for vectors

  constructor(point: Vector4, direction: Vector4, feasible: boolean = true) {
    super(feasible);
    this.point = point;
    this.direction = direction.clone().normalize();  // Store normalized
  }

  /**
   * Create an infeasible line realization
   * Used when parent dependencies are infeasible
   */
  static createInfeasible(): Line3DRealization3D {
    return new Line3DRealization3D(
      new Vector4(0, 0, 0, 1),
      new Vector4(1, 0, 0, 0),
      false
    );
  }

  /**
   * Evaluate line at parameter t: p(t) = point + t * direction
   */
  getPointAt(t: number): Vector4 {
    return new Vector4(
      this.point.x + t * this.direction.x,
      this.point.y + t * this.direction.y,
      this.point.z + t * this.direction.z,
      1  // Result is a point
    );
  }

  /**
   * Get direction as Vector4 (normalized)
   */
  getDirection(): Vector4 {
    return this.direction;
  }
}

/**
 * Segment3DRealization3D - Stores computed 3D segment (two endpoints)
 * Result of realize3D() geometric calculation
 * 
 * Representation: two finite points
 * - startPoint: Vector4 [x1, y1, z1, 1]
 * - endPoint: Vector4 [x2, y2, z2, 1]
 * 
 * Contains ONLY numeric data. Structural information (id, projection IDs) stays in Segment3D.
 */
export class Segment3DRealization3D extends Element3DRealization3D {
  startPoint: Vector4;  // Start point [x1, y1, z1, 1]
  endPoint: Vector4;    // End point [x2, y2, z2, 1]

  constructor(startPoint: Vector4, endPoint: Vector4, feasible: boolean = true) {
    super(feasible);
    this.startPoint = startPoint;
    this.endPoint = endPoint;
  }

  /**
   * Get segment length in 3D space
   */
  getLength(): number {
    const dx = this.endPoint.x - this.startPoint.x;
    const dy = this.endPoint.y - this.startPoint.y;
    const dz = this.endPoint.z - this.startPoint.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Evaluate segment at parameter t ∈ [0, 1]
   * t=0 → startPoint, t=1 → endPoint
   */
  getPointAt(t: number): Vector4 {
    const clampedT = Math.max(0, Math.min(1, t));
    return new Vector4(
      this.startPoint.x + clampedT * (this.endPoint.x - this.startPoint.x),
      this.startPoint.y + clampedT * (this.endPoint.y - this.startPoint.y),
      this.startPoint.z + clampedT * (this.endPoint.z - this.startPoint.z),
      1
    );
  }

  /**
   * Get direction vector (unnormalized, from start to end)
   */
  getDirection(): Vector4 {
    return new Vector4(
      this.endPoint.x - this.startPoint.x,
      this.endPoint.y - this.startPoint.y,
      this.endPoint.z - this.startPoint.z,
      0  // Vector, not point
    );
  }
}

/**
 * Plane3DRealization3D - Stores computed 3D plane equation
 * Result of realize3D() geometric calculation
 * 
 * Representation: implicit form ax + by + cz + d = 0
 * - normal: Vector4 [a, b, c, d] - plane equation coefficients
 *   - [a, b, c] is the normal vector (may or may not be normalized)
 *   - d is the distance term
 * 
 * For rendering 3D plane rectangles:
 * - quaternion: Quaternion for orienting plane mesh (aligns (0,0,1) with plane normal) IN DOMAIN COORDS
 * - originPoint: Origin point on the plane in domain coordinates (Vector4 with w=1)
 * 
 * Contains ONLY numeric data. Structural information (id, trace IDs) stays in Plane3D.
 */
export class Plane3DRealization3D extends Element3DRealization3D {
  normal: Vector4;  // Plane equation [a, b, c, d]: ax + by + cz + d = 0
  quaternion?: { x: number; y: number; z: number; w: number };  // Orientation quaternion (domain coords)
  originPoint?: Vector4;  // Origin point on plane in domain coordinates [x, y, z, 1]

  constructor(
    normal: Vector4, 
    feasible: boolean = true,
    quaternion?: { x: number; y: number; z: number; w: number },
    originPoint?: Vector4
  ) {
    super(feasible);
    this.normal = normal;
    this.quaternion = quaternion;
    this.originPoint = originPoint;
  }

  /**
   * Get normal vector as Vector4 [a, b, c, 0] (direction only)
   */
  getNormalVector(): Vector4 {
    return new Vector4(this.normal.x, this.normal.y, this.normal.z, 0);
  }

  /**
   * Get quaternion for Three.js rendering (with Y-axis negated for coordinate system conversion)
   */
  getQuaternionForThreeJS(): { x: number; y: number; z: number; w: number } | undefined {
    if (!this.quaternion) return undefined;
    
    // When converting from domain (left-handed, Y-up) to Three.js (right-handed, Y-up),
    // the rotation axis Y component needs to be negated
    return {
      x: this.quaternion.x,
      y: -this.quaternion.y,
      z: this.quaternion.z,
      w: this.quaternion.w
    };
  }

  /**
   * Compute the 4 corners of the rectangle representing this plane in 3D space.
   * Uses the precomputed quaternion and originPoint to transform PlaneGeometry corners.
   * 
   * @param planeSize Half-size of the plane rectangle (default 75 for 150x150 square)
   * @returns Array of 4 corners [bottom-left, bottom-right, top-right, top-left] in domain coordinates
   */
  getRectangleCorners(planeSize: number = 75): Vector4[] {
    if (!this.quaternion || !this.originPoint) {
      console.error('[Plane3DRealization3D] Cannot compute corners: missing quaternion or originPoint');
      return [];
    }

    const quat = this.quaternion;
    const origin = this.originPoint;

    // PlaneGeometry corners in local space: (±planeSize, ±planeSize, 0)
    const localCorners = [
      { x: -planeSize, y: -planeSize, z: 0 },  // Bottom-left
      { x: planeSize, y: -planeSize, z: 0 },   // Bottom-right
      { x: planeSize, y: planeSize, z: 0 },    // Top-right
      { x: -planeSize, y: planeSize, z: 0 }    // Top-left
    ];

    const worldCorners: Vector4[] = [];
    for (const local of localCorners) {
      // Apply quaternion rotation: v' = q * v * q^(-1)
      // Using simplified formula for unit quaternions
      const qx = quat.x, qy = quat.y, qz = quat.z, qw = quat.w;
      const vx = local.x, vy = local.y, vz = local.z;

      // Compute q * v
      const ix = qw * vx + qy * vz - qz * vy;
      const iy = qw * vy + qz * vx - qx * vz;
      const iz = qw * vz + qx * vy - qy * vx;
      const iw = -qx * vx - qy * vy - qz * vz;

      // Compute (q * v) * q^(-1)
      const rotX = ix * qw + iw * -qx + iy * -qz - iz * -qy;
      const rotY = iy * qw + iw * -qy + iz * -qx - ix * -qz;
      const rotZ = iz * qw + iw * -qz + ix * -qy - iy * -qx;

      // Apply translation
      worldCorners.push(new Vector4(
        rotX + origin.x,
        rotY + origin.y,
        rotZ + origin.z,
        1
      ));
    }

    return worldCorners;
  }

  /**
   * Evaluate plane equation at point p: ax + by + cz + d
   * Returns 0 if point is on plane, positive/negative if above/below
   */
  evaluateAt(point: Vector4): number {
    return this.normal.x * point.x +
           this.normal.y * point.y +
           this.normal.z * point.z +
           this.normal.w;
  }

  /**
   * Get distance from point to plane (signed)
   */
  distanceToPoint(point: Vector4): number {
    const normalMagnitude = Math.sqrt(
      this.normal.x * this.normal.x +
      this.normal.y * this.normal.y +
      this.normal.z * this.normal.z
    );
    return this.evaluateAt(point) / normalMagnitude;
  }

  /**
   * Project point onto plane (orthogonal projection)
   */
  projectPoint(point: Vector4): Vector4 {
    const dist = this.distanceToPoint(point);
    const normalVec = this.getNormalVector();
    const normalizedNormal = normalVec.clone().normalize();

    return new Vector4(
      point.x - dist * normalizedNormal.x,
      point.y - dist * normalizedNormal.y,
      point.z - dist * normalizedNormal.z,
      1
    );
  }
}

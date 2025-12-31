/**
 * Plane3D - 3D plane representation
 * 
 * Represents a 3D plane defined by a point and normal vector.
 * Used for projection planes (P_V, P_H) and auxiliary planes.
 * 
 * Per data-model.md §Plane3DByPointAndNormal:
 * - Point on plane (P₀)
 * - Normal vector (n)
 * - Plane3D equation: n·(P - P₀) = 0
 * 
 * @see specs/001-dihedral-learning-mvp/data-model.md#plane3dbypointandnormal
 */

import { Vector3, Vector4 } from 'three';

export interface Plane3DCoordinateSystem {
  origin: Vector4;     // Origin point on the plane (x, y, z, 1)
  uAxis: Vector4;      // U-axis direction (normalized) (x, y, z, 0)
  vAxis: Vector4;      // V-axis direction (normalized) (x, y, z, 0)
}

export type Plane3DType = 'projection' | 'auxiliary';

export class Plane3D {
  id?: string;
  type: Plane3DType;
  label?: string;
  
  // Plane3D definition: point + normal
  point: Vector4;      // Point on the plane (x, y, z, 1)
  normal: Vector4;     // Normal vector (normalized) (x, y, z, 0)
  
  // Coordinate system for 2D representation
  coordinateSystem?: Plane3DCoordinateSystem;
  
  // Visual boundaries (for rendering)
  boundaries?: {
    minU: number;
    maxU: number;
    minV: number;
    maxV: number;
  };

  constructor(
    point: Vector4,
    normal: Vector4,
    type: Plane3DType = 'auxiliary',
    label?: string
  ) {
    this.point = point.clone();
    this.normal = this.normalize(normal);
    this.type = type;
    this.label = label;
  }

  /**
   * Normalize a vector to unit length
   */
  private normalize(v: Vector4): Vector4 {
    const vec3 = new Vector3(v.x, v.y, v.z);
    const length = vec3.length();
    if (length === 0) {
      throw new Error('Cannot normalize zero vector');
    }
    vec3.normalize();
    return new Vector4(vec3.x, vec3.y, vec3.z, v.w);
  }

  /**
   * Set the 2D coordinate system for this plane
   * Used to convert between 3D and plane intrinsic <u,v> coordinates
   */
  setCoordinateSystem(system: Plane3DCoordinateSystem): void {
    this.coordinateSystem = system;
  }

  /**
   * Set visual boundaries for rendering
   */
  setBoundaries(minU: number, maxU: number, minV: number, maxV: number): void {
    this.boundaries = { minU, maxU, minV, maxV };
  }

  /**
   * Check if a 3D point lies on this plane (within tolerance)
   * Uses vector algebra: n·(P - P₀)
   * @param p Point in 3D space (homogeneous coordinates)
   * @param tolerance Distance tolerance (default: 1e-6)
   */
  containsPoint(p: Vector4, tolerance: number = 1e-6): boolean {
    // Convert Vector4 to Vector3 for computation
    const point3 = new Vector3(p.x, p.y, p.z);
    const planePoint3 = new Vector3(this.point.x, this.point.y, this.point.z);
    const normal3 = new Vector3(this.normal.x, this.normal.y, this.normal.z);
    
    // Calculate n·(P - P₀) using vector subtraction and dot product
    const diff = point3.sub(planePoint3);
    const dot = normal3.dot(diff);
    
    return Math.abs(dot) < tolerance;
  }

  /**
   * Clone this plane
   */
  clone(): Plane3D {
    const cloned = new Plane3D(this.point, this.normal, this.type, this.label);
    if (this.id) {
      cloned.id = this.id;
    }
    if (this.coordinateSystem) {
      cloned.coordinateSystem = {
        origin: this.coordinateSystem.origin.clone(),
        uAxis: this.coordinateSystem.uAxis.clone(),
        vAxis: this.coordinateSystem.vAxis.clone()
      };
    }
    if (this.boundaries) {
      cloned.boundaries = { ...this.boundaries };
    }
    return cloned;
  }

  /**
   * Create P_H (horizontal projection plane)
   * Z = 0 plane with origin at (0,0,0)
   */
  static createPH(): Plane3D {
    const plane = new Plane3D(
      new Vector4(0, 0, 0, 1),           // Origin
      new Vector4(0, 0, 1, 0),           // Normal: +Z
      'projection',
      'P_H'
    );
    
    // Set coordinate system per spec.md
    plane.setCoordinateSystem({
      origin: new Vector4(0, 0, 0, 1),
      uAxis: new Vector4(1, 0, 0, 0),    // i = (1,0,0) → X in 3D
      vAxis: new Vector4(0, 1, 0, 0)     // j = (0,1,0) → Y in 3D
    });
    
    // Default boundaries
    plane.setBoundaries(-400, 400, -400, 400);
    
    return plane;
  }

  /**
   * Create P_V (vertical projection plane)
   * Y = 0 plane with origin at (0,0,0)
   */
  static createPV(): Plane3D {
    const plane = new Plane3D(
      new Vector4(0, 0, 0, 1),           // Origin
      new Vector4(0, 1, 0, 0),           // Normal: +Y
      'projection',
      'P_V'
    );
    
    // Set coordinate system per spec.md
    plane.setCoordinateSystem({
      origin: new Vector4(0, 0, 0, 1),
      uAxis: new Vector4(1, 0, 0, 0),    // i = (1,0,0) → X in 3D
      vAxis: new Vector4(0, 0, 1, 0)     // k = (0,0,1) → Z in 3D
    });
    
    // Default boundaries
    plane.setBoundaries(-400, 400, -400, 400);
    
    return plane;
  }

  /**
   * Getters for boundaries (convenience accessors)
   */
  get minU(): number {
    return this.boundaries?.minU ?? -400;
  }

  get maxU(): number {
    return this.boundaries?.maxU ?? 400;
  }

  get minV(): number {
    return this.boundaries?.minV ?? -400;
  }

  get maxV(): number {
    return this.boundaries?.maxV ?? 400;
  }
}

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

export interface PlaneCoordinateSystem {
  origin: [number, number, number, number];     // Origin point on the plane [x, y, z, 1]
  uAxis: [number, number, number, number];      // U-axis direction (normalized) [x, y, z, 0]
  vAxis: [number, number, number, number];      // V-axis direction (normalized) [x, y, z, 0]
}

export type PlaneType = 'projection' | 'auxiliary';

export class Plane3D {
  id?: string;
  type: Plane3DType;
  label?: string;
  
  // Plane3D definition: point + normal
  point: Vector3D;      // Point on the plane
  normal: Vector3D;     // Normal vector (should be normalized)
  
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
    point: Vector3D,
    normal: Vector3D,
    type: Plane3DType = 'auxiliary',
    label?: string
  ) {
    this.point = [...point] as Vector3;
    this.normal = this.normalize(normal);
    this.type = type;
    this.label = label;
  }

  /**
   * Normalize a vector to unit length
   */
  private normalize(v: [number, number, number, number]): [number, number, number, number] {
    const length = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    if (length === 0) {
      throw new Error('Cannot normalize zero vector');
    }
    return [
      v[0] / length,
      v[1] / length,
      v[2] / length,
      1
    ];
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
   * @param p Point in 3D space (homogeneous coordinates [x, y, z, 1])
   * @param tolerance Distance tolerance (default: 1e-6)
   */
  containsPoint(p: [number, number, number, number], tolerance: number = 1e-6): boolean {
    // Calculate n·(P - P₀)
    const dx = p[0] - this.point[0];
    const dy = p[1] - this.point[1];
    const dz = p[2] - this.point[2];
    
    const dot = this.normal[0] * dx + this.normal[1] * dy + this.normal[2] * dz;
    
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
        origin: [...this.coordinateSystem.origin] as Vector3,
        uAxis: [...this.coordinateSystem.uAxis] as Vector3,
        vAxis: [...this.coordinateSystem.vAxis] as Vector3
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
      [0, 0, 0, 1],           // Origin
      [0, 0, 1, 1],           // Normal: +Z
      'projection',
      'P_H'
    );
    
    // Set coordinate system per spec.md
    plane.setCoordinateSystem({
      origin: [0, 0, 0, 1],
      uAxis: [1, 0, 0, 1],    // i = (1,0,0) → X in 3D
      vAxis: [0, 1, 0, 1]     // j = (0,1,0) → Y in 3D
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
      [0, 0, 0, 1],           // Origin
      [0, 1, 0, 1],           // Normal: +Y
      'projection',
      'P_V'
    );
    
    // Set coordinate system per spec.md
    plane.setCoordinateSystem({
      origin: [0, 0, 0, 1],
      uAxis: [1, 0, 0, 1],    // i = (1,0,0) → X in 3D
      vAxis: [0, 0, 1, 1]     // k = (0,0,1) → Z in 3D
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

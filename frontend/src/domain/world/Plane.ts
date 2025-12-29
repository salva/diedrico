/**
 * Plane - 3D plane representation
 * 
 * Represents a 3D plane defined by a point and normal vector.
 * Used for projection planes (P_V, P_H) and auxiliary planes.
 * 
 * Per data-model.md §Plane3DByPointAndNormal:
 * - Point on plane (P₀)
 * - Normal vector (n)
 * - Plane equation: n·(P - P₀) = 0
 * 
 * @see specs/001-dihedral-learning-mvp/data-model.md#plane3dbypointandnormal
 */

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface PlaneCoordinateSystem {
  origin: Vector3;     // Origin point on the plane
  uAxis: Vector3;      // U-axis direction (normalized)
  vAxis: Vector3;      // V-axis direction (normalized)
}

export type PlaneType = 'projection' | 'auxiliary';

export class Plane {
  id?: string;
  type: PlaneType;
  label?: string;
  
  // Plane definition: point + normal
  point: Vector3;      // Point on the plane
  normal: Vector3;     // Normal vector (should be normalized)
  
  // Coordinate system for 2D representation
  coordinateSystem?: PlaneCoordinateSystem;
  
  // Visual boundaries (for rendering)
  boundaries?: {
    minU: number;
    maxU: number;
    minV: number;
    maxV: number;
  };

  constructor(
    point: Vector3,
    normal: Vector3,
    type: PlaneType = 'auxiliary',
    label?: string
  ) {
    this.point = { ...point };
    this.normal = this.normalize(normal);
    this.type = type;
    this.label = label;
  }

  /**
   * Normalize a vector to unit length
   */
  private normalize(v: Vector3): Vector3 {
    const length = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    if (length === 0) {
      throw new Error('Cannot normalize zero vector');
    }
    return {
      x: v.x / length,
      y: v.y / length,
      z: v.z / length
    };
  }

  /**
   * Set the 2D coordinate system for this plane
   * Used to convert between 3D and plane intrinsic <u,v> coordinates
   */
  setCoordinateSystem(system: PlaneCoordinateSystem): void {
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
   */
  containsPoint(p: Vector3, tolerance: number = 1e-6): boolean {
    // Calculate n·(P - P₀)
    const dx = p.x - this.point.x;
    const dy = p.y - this.point.y;
    const dz = p.z - this.point.z;
    
    const dot = this.normal.x * dx + this.normal.y * dy + this.normal.z * dz;
    
    return Math.abs(dot) < tolerance;
  }

  /**
   * Clone this plane
   */
  clone(): Plane {
    const cloned = new Plane(this.point, this.normal, this.type, this.label);
    if (this.id) {
      cloned.id = this.id;
    }
    if (this.coordinateSystem) {
      cloned.coordinateSystem = {
        origin: { ...this.coordinateSystem.origin },
        uAxis: { ...this.coordinateSystem.uAxis },
        vAxis: { ...this.coordinateSystem.vAxis }
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
  static createPH(): Plane {
    const plane = new Plane(
      { x: 0, y: 0, z: 0 },           // Origin
      { x: 0, y: 0, z: 1 },           // Normal: +Z
      'projection',
      'P_H'
    );
    
    // Set coordinate system per spec.md
    plane.setCoordinateSystem({
      origin: { x: 0, y: 0, z: 0 },
      uAxis: { x: 1, y: 0, z: 0 },    // i = (1,0,0) → X in 3D
      vAxis: { x: 0, y: 1, z: 0 }     // j = (0,1,0) → Y in 3D
    });
    
    // Default boundaries
    plane.setBoundaries(-400, 400, -400, 400);
    
    return plane;
  }

  /**
   * Create P_V (vertical projection plane)
   * Y = 0 plane with origin at (0,0,0)
   */
  static createPV(): Plane {
    const plane = new Plane(
      { x: 0, y: 0, z: 0 },           // Origin
      { x: 0, y: 1, z: 0 },           // Normal: +Y
      'projection',
      'P_V'
    );
    
    // Set coordinate system per spec.md
    plane.setCoordinateSystem({
      origin: { x: 0, y: 0, z: 0 },
      uAxis: { x: 1, y: 0, z: 0 },    // i = (1,0,0) → X in 3D
      vAxis: { x: 0, y: 0, z: 1 }     // k = (0,0,1) → Z in 3D
    });
    
    // Default boundaries
    plane.setBoundaries(-400, 400, -400, 400);
    
    return plane;
  }
}

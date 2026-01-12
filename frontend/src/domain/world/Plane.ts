/**
 * Plane3D - 3D plane representation (abstract base)
 * 
 * Abstract base class for 3D planes. Concrete implementations provide
 * specific construction rules:
 * - Plane3DFixed: Hard-coded planes (P_H: z=0, P_V: y=0) for initialization
 * - Plane3DByTraces: Computed from traces (future)
 * 
 * **Phase 52**: Refactored to extend Element3D, removing id and label properties
 * which are now inherited from Element base class.
 * 
 * Per data-model.md §Plane3DByPointAndNormal:
 * - Point on plane (P₀)
 * - Normal vector (n)
 * - Plane3D equation: n·(P - P₀) = 0
 * 
 * @see specs/001-dihedral-learning-mvp/data-model.md#plane3dbypointandnormal
 */

import { Vector3, Vector4 } from 'three';
import { Element3D } from './Element3D';

export interface Plane3DCoordinateSystem {
  origin: Vector4;     // Origin point on the plane (x, y, z, 1)
  uAxis: Vector4;      // U-axis direction (normalized) (x, y, z, 0)
  vAxis: Vector4;      // V-axis direction (normalized) (x, y, z, 0)
}

export type Plane3DType = 'projection' | 'auxiliary';

export abstract class Plane3D extends Element3D {
  type: Plane3DType;
  
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

  /**
   * Get the plane equation parameters
   * For planes defined by point + normal: n·(P - P₀) = 0
   * Concrete implementations may use different representations
   */
  abstract getEquation(): { point: Vector4; normal: Vector4 };

  /**
   * Get dependencies - IDs of elements this plane depends on
   * Fixed planes have no dependencies, trace-based planes depend on traces
   * Inherited from Element3D
   */
  abstract getDependencies(): string[];

  protected constructor(
    id: string,
    point: Vector4,
    normal: Vector4,
    type: Plane3DType = 'auxiliary',
    label?: string
  ) {
    // Phase 52: Call Element3D constructor with id and label
    super(id, label);
    
    this.point = point.clone();
    this.normal = this.normalize(normal);
    this.type = type;
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
   * Subclasses must implement their own cloning logic
   */
  abstract clone(): Plane3D;

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

/**
 * Plane3DFixed - Fixed 3D plane defined by point and normal
 * 
 * Represents a plane with fixed geometric definition (no dependencies).
 * The plane is fully defined by a point on the plane and a normal vector.
 * 
 * **Phase 52**: Updated constructor to pass id as required parameter to parent,
 * and implements getDependencies() from Element3D.
 * 
 * @remarks This class is typically used during world initialization but can
 * represent any plane defined by point and normal without dependencies.
 */
export class Plane3DFixed extends Plane3D {
  constructor(
    id: string,
    point: Vector4,
    normal: Vector4,
    label?: string
  ) {
    // Phase 52: Pass id to Plane3D constructor (which calls Element3D/Element)
    super(id, point, normal, 'projection', label);
  }

  getEquation(): { point: Vector4; normal: Vector4 } {
    return {
      point: this.point.clone(),
      normal: this.normal.clone()
    };
  }

  getDependencies(): string[] {
    // Phase 52: Fixed planes have no dependencies
    return [];
  }

  clone(): Plane3D {
    const cloned = new Plane3DFixed(
      this.id,
      this.point.clone(),
      this.normal.clone(),
      this.label
    );
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
}

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
 */

import { Vector3, Vector4 } from 'three';
import { Element3D } from './Element3D';
import { Plane3DRealization3D } from './Element3DRealization3D';
import { applyMatrix4x3, crossVector3Homogeneous } from '@/utils/threeUtils';
import { computePlaneEquationFromTwo3DLines } from '@/utils/projectionPlaneUtils';
import type { PlaneEquationRealizationContext } from './projectionPlane/ProjectionPlaneContext';

export abstract class Plane3D extends Element3D {
  /**
   * Get plane equation [a, b, c, d] where ax + by + cz + d = 0
   * Each concrete class computes this based on its representation
   */
  abstract getPlaneEquation(context: PlaneEquationRealizationContext): Vector4 | null;

  /**
   * Compute 3D realization (plane equation + rendering geometry)
   * Uses getPlaneEquation() from concrete class
   */
  realize3D(context: PlaneEquationRealizationContext): Plane3DRealization3D {
    const equation = this.getPlaneEquation(context);
    
    if (!equation) {
      return Plane3DRealization3D.infeasible();
    }
    
    const a = equation.x;
    const b = equation.y;
    const c = equation.z;
    const d = equation.w;
    
    // Normal vector from plane equation
    const normal = new Vector4(a, b, c, 0);
    
    // Compute origin point on the plane: P = -d * N (since |N| = 1)
    const originPoint = new Vector4(-d * a, -d * b, -d * c, 1);
    
    // Compute quaternion for mesh orientation (aligns (0,0,1) with plane normal)
    const defaultNormal = new Vector4(0, 0, 1, 0);
    
    // Compute rotation axis and angle using cross product and dot product
    const axis = crossVector3Homogeneous(defaultNormal, normal);
    const axisLength = Math.sqrt(axis.x * axis.x + axis.y * axis.y + axis.z * axis.z);
    const dotProduct = defaultNormal.x * normal.x + defaultNormal.y * normal.y + defaultNormal.z * normal.z;
    
    let quaternion: Vector4;
    if (axisLength < 1e-10) {
      // Normals are parallel or anti-parallel
      if (dotProduct > 0) {
        // Same direction - no rotation needed
        quaternion = new Vector4(0, 0, 0, 1);
      } else {
        // Opposite direction - 180° rotation around any perpendicular axis
        const perpAxis = Math.abs(a) < 0.9 ? new Vector4(1, 0, 0, 0) : new Vector4(0, 1, 0, 0);
        const rotAxis = crossVector3Homogeneous(perpAxis, normal).normalize();
        quaternion = new Vector4(rotAxis.x, rotAxis.y, rotAxis.z, 0);
      }
    } else {
      // General case - compute quaternion from axis-angle
      const halfAngle = 0.5 * Math.atan2(axisLength, dotProduct);
      const sinHalf = Math.sin(halfAngle);
      const cosHalf = Math.cos(halfAngle);
      axis.normalize();
      quaternion = new Vector4(
        axis.x * sinHalf,
        axis.y * sinHalf,
        axis.z * sinHalf,
        cosHalf
      );
    }
    
    return new Plane3DRealization3D(equation, true, quaternion, originPoint);
  }

  /**
   * Get dependencies - IDs of elements this plane depends on
   * Fixed planes have no dependencies, trace-based planes depend on traces
   * Inherited from Element3D
   */
  abstract getDependencies(): string[];

  protected constructor(id: string, label?: string) {
    super(id, label);
  }

  /**
   * Clone this plane
   * Subclasses must implement their own cloning logic
   */
  abstract clone(): Plane3D;
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
  point: Vector4;      // Point on the plane (x, y, z, 1)
  normal: Vector4;     // Normal vector (normalized) (x, y, z, 0)
  
  // Boundary properties for plane extent in u,v coordinates
  minU: number = -400;
  maxU: number = 400;
  minV: number = -400;
  maxV: number = 400;
  
  // Coordinate system for plane (u,v coordinates)
  coordinateSystem?: {
    origin: Vector4;
    uAxis: Vector4;
    vAxis: Vector4;
  };

  constructor(
    id: string,
    point: Vector4,
    normal: Vector4,
    label?: string
  ) {
    super(id, label);
    this.point = point.clone();
    this.normal = this.normalizeVector(normal);
  }

  private normalizeVector(v: Vector4): Vector4 {
    const vec3 = new Vector3(v.x, v.y, v.z);
    const length = vec3.length();
    if (length === 0) {
      throw new Error('Cannot normalize zero vector');
    }
    vec3.normalize();
    return new Vector4(vec3.x, vec3.y, vec3.z, v.w);
  }

  getPlaneEquation(_context: PlaneEquationRealizationContext): Vector4 {
    // Return plane equation: ax + by + cz + d = 0
    // d = -normal · point
    const d = -(this.normal.x * this.point.x + this.normal.y * this.point.y + this.normal.z * this.point.z);
    return new Vector4(this.normal.x, this.normal.y, this.normal.z, d);
  }

  getDependencies(): string[] {
    // Phase 52: Fixed planes have no dependencies
    return [];
  }
  
  /**
   * Set boundary limits for plane extent in u,v coordinates
   */
  setBoundaries(minU: number, maxU: number, minV: number, maxV: number): void {
    this.minU = minU;
    this.maxU = maxU;
    this.minV = minV;
    this.maxV = maxV;
  }
  
  /**
   * Set coordinate system for plane (origin and u,v axes in 3D)
   */
  setCoordinateSystem(system: { origin: Vector4; uAxis: Vector4; vAxis: Vector4 }): void {
    this.coordinateSystem = {
      origin: system.origin.clone(),
      uAxis: system.uAxis.clone(),
      vAxis: system.vAxis.clone()
    };
  }
  
  /**
   * Check if a point lies on this plane (within tolerance)
   */
  containsPoint(point: Vector4 | { x: number; y: number; z: number }, tolerance: number = 1e-6): boolean {
    // Compute distance from point to plane: |n·(P - P₀)|
    const px = point.x;
    const py = point.y;
    const pz = point.z;
    
    const distance = Math.abs(
      this.normal.x * (px - this.point.x) +
      this.normal.y * (py - this.point.y) +
      this.normal.z * (pz - this.point.z)
    );
    
    return distance <= tolerance;
  }

  clone(): Plane3D {
    const cloned = new Plane3DFixed(
      this.id,
      this.point.clone(),
      this.normal.clone(),
      this.label
    );
    
    // Copy boundaries
    cloned.minU = this.minU;
    cloned.maxU = this.maxU;
    cloned.minV = this.minV;
    cloned.maxV = this.maxV;
    
    // Copy coordinate system if set
    if (this.coordinateSystem) {
      cloned.coordinateSystem = {
        origin: this.coordinateSystem.origin.clone(),
        uAxis: this.coordinateSystem.uAxis.clone(),
        vAxis: this.coordinateSystem.vAxis.clone()
      };
    }
    
    return cloned;
  }
}

/**
 * Plane3DFromTraces - Plane from two trace lines (user-constructed - Phase 78)
 * 
 * Stores ONLY IDs of defining elements (trace lines), no numeric data.
 * realize3D() reconstructs plane equation from trace coordinates.
 */
export class Plane3DFromTraces extends Plane3D {
  /** Serialization/DTO discriminator only; runtime dispatch uses instanceof. */
  readonly kind = 'Plane3DFromTraces';
  label: string;
  
  // Defining relations (ONLY IDs, no numeric data)
  trace1: string;      // First trace (Line2D ID on first plane)
  trace2: string;      // Second trace (Line2D ID on second plane)
  plane1Id: string;    // Which plane trace1 is on
  plane2Id: string;    // Which plane trace2 is on (must be different)

  constructor(
    id: string,
    label: string,
    trace1: string,
    trace2: string,
    plane1Id: string,
    plane2Id: string
  ) {
    super(id, label);
    this.label = label;
    this.trace1 = trace1;
    this.trace2 = trace2;
    this.plane1Id = plane1Id;
    this.plane2Id = plane2Id;
  }

  getPlaneEquation(context: PlaneEquationRealizationContext): Vector4 | null {
    // Reconstruct plane equation from two trace lines on different projection planes
    
    // Get all realizations (let it fail hard if structure is wrong)
    const t1Line = context.getLine2D(this.trace1);
    const t2Line = context.getLine2D(this.trace2);
    if (!t1Line || !t2Line) {
      return null;
    }
    const t1InP1 = t1Line.realize2D(context);
    const t2InP2 = t2Line.realize2D(context);
    
    const plane1 = context.getProjectionPlaneById(t1Line.planeId);
    const plane2 = context.getProjectionPlaneById(t2Line.planeId);
    
    if (!plane1 || !plane2) {
      return null;
    }
    
    const p1 = context.getProjectionPlane3DRealization(plane1.id);
    const p2 = context.getProjectionPlane3DRealization(plane2.id);
    
    // Check feasibility of all realizations
    if (!p1 || !p2 || !t1InP1.feasible || !t2InP2.feasible || !p1.feasible || !p2.feasible) {
      return null;
    }
    
    // Transform t1 from 2D to 3D
    const t1PointIn3D = applyMatrix4x3(t1InP1.point1, p1.planeTo3D);
    const t1DirIn3D = applyMatrix4x3(t1InP1.point2, p1.planeTo3D);
    
    // Transform t2 from 2D to 3D
    const t2PointIn3D = applyMatrix4x3(t2InP2.point1, p2.planeTo3D);
    const t2DirIn3D = applyMatrix4x3(t2InP2.point2, p2.planeTo3D);
    
    return computePlaneEquationFromTwo3DLines(t1PointIn3D, t1DirIn3D, t2PointIn3D, t2DirIn3D);
  }

  getDependencies(): string[] {
    return [this.trace1, this.trace2, this.plane1Id, this.plane2Id];
  }

  clone(): Plane3DFromTraces {
    return new Plane3DFromTraces(
      this.id,
      this.label,
      this.trace1,
      this.trace2,
      this.plane1Id,
      this.plane2Id
    );
  }

  /**
   * Validate that traces are on different planes
   * Called during creation to enforce Phase 78 requirement
   */
  static validateDifferentPlanes(plane1Id: string, plane2Id: string): boolean {
    return plane1Id !== plane2Id;
  }
}

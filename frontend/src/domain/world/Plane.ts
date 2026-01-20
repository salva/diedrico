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
import { Plane3DRealization3D } from './Element3DRealization3D';
import { applyMatrix4x3 } from '@/utils/threeUtils';

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
   * Compute 3D realization (plane equation)
   * For most planes, returns the stored normal vector
   */
  realize3D(_world: any): Plane3DRealization3D {
    // Return plane equation: ax + by + cz + d = 0
    // d = -normal · point
    const d = -(this.normal.x * this.point.x + this.normal.y * this.point.y + this.normal.z * this.point.z);
    const equation = new Vector4(this.normal.x, this.normal.y, this.normal.z, d);
    return new Plane3DRealization3D(equation);
  }

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

/**
 * Plane3DFromTraces - Plane from two trace lines (user-constructed - Phase 78)
 * 
 * Stores ONLY IDs of defining elements (trace lines), no numeric data.
 * realize3D() reconstructs plane equation from trace coordinates.
 */
export class Plane3DFromTraces extends Plane3D {
  readonly kind = 'Plane3DFromTraces';
  label: string;
  
  // Defining relations (ONLY IDs, no numeric data)
  trace1: string;      // First trace (Line2D ID on first plane)
  trace2: string;      // Second trace (Line2D ID on second plane)
  plane1Id: string;    // Which plane trace1 is on
  plane2Id: string;    // Which plane trace2 is on (must be different)
  
  visualStyle?: any;

  constructor(
    id: string,
    label: string,
    trace1: string,
    trace2: string,
    plane1Id: string,
    plane2Id: string
  ) {
    // Initialize with placeholder point and normal (will be computed in realize3D)
    super(id, new Vector4(0, 0, 0, 1), new Vector4(0, 0, 1, 0), 'auxiliary', label);
    this.label = label;
    this.trace1 = trace1;
    this.trace2 = trace2;
    this.plane1Id = plane1Id;
    this.plane2Id = plane2Id;
  }

  realize3D(world: any): Plane3DRealization3D {
    // Reconstruct 3D plane from two trace lines on different projection planes
    // Algorithm:
    // 1. Get 2D realizations of both trace lines
    // 2. Transform 2D points/directions to 3D using projection plane transformation matrices
    // 3. Compute plane normal as cross product of 3D line directions
    // 4. Use any point on either line to compute d
    // 5. Verify that the second line's point lies on the plane (compatibility check)
    
    console.log('[Plane3DFromTraces] realize3D called for plane:', this.id, 'trace1:', this.trace1, 'trace2:', this.trace2);
    
    // Get Line2D objects
    const trace1Line = world.getLine2D(this.trace1);
    const trace2Line = world.getLine2D(this.trace2);
    
    console.log('[Plane3DFromTraces] trace1Line:', trace1Line, 'trace2Line:', trace2Line);
    
    if (!trace1Line || !trace2Line) {
      console.warn('[Plane3DFromTraces] Missing trace lines');
      return new Plane3DRealization3D(new Vector4(0, 0, 1, 0), false);
    }
    
    // Get 2D realizations
    const line1_2D = trace1Line.realize2D(world);
    const line2_2D = trace2Line.realize2D(world);
    
    console.log('[Plane3DFromTraces] line1_2D:', line1_2D, 'line2_2D:', line2_2D);
    console.log('[Plane3DFromTraces] Line1 2D coords - point1:', line1_2D.point1, 'point2:', line1_2D.point2);
    console.log('[Plane3DFromTraces] Line2 2D coords - point1:', line2_2D.point1, 'point2:', line2_2D.point2);
    
    // Check if any endpoints are sibling points
    const line1Point1 = world.getPoint2D(trace1Line.point1Id);
    const line1Point2 = world.getPoint2D(trace1Line.point2Id);
    const line2Point1 = world.getPoint2D(trace2Line.point1Id);
    const line2Point2 = world.getPoint2D(trace2Line.point2Id);
    console.log('[Plane3DFromTraces] Line1 point objects:', { 
      point1: { id: line1Point1?.id, type: line1Point1?.constructor.name, siblingId: (line1Point1 as any)?.siblingPointId },
      point2: { id: line1Point2?.id, type: line1Point2?.constructor.name, siblingId: (line1Point2 as any)?.siblingPointId }
    });
    console.log('[Plane3DFromTraces] Line2 point objects:', { 
      point1: { id: line2Point1?.id, type: line2Point1?.constructor.name, siblingId: (line2Point1 as any)?.siblingPointId },
      point2: { id: line2Point2?.id, type: line2Point2?.constructor.name, siblingId: (line2Point2 as any)?.siblingPointId }
    });
    
    if (!line1_2D || !line2_2D || !line1_2D.feasible || !line2_2D.feasible) {
      console.warn('[Plane3DFromTraces] Infeasible trace lines', { line1_2D, line2_2D });
      return new Plane3DRealization3D(new Vector4(0, 0, 1, 0), false);
    }
    
    // Get projection planes
    console.log('[Plane3DFromTraces] trace1Line.planeId:', trace1Line.planeId, 'trace2Line.planeId:', trace2Line.planeId);
    const plane1 = world.getProjectionPlaneById(trace1Line.planeId);
    const plane2 = world.getProjectionPlaneById(trace2Line.planeId);
    console.log('[Plane3DFromTraces] plane1:', plane1, 'plane2:', plane2);
    
    if (!plane1 || !plane2 || !plane1.id || !plane2.id) {
      console.warn('[Plane3DFromTraces] Missing projection planes', { plane1, plane2, plane1Id: plane1?.id, plane2Id: plane2?.id });
      return new Plane3DRealization3D(new Vector4(0, 0, 1, 0), false);
    }
    
    // Get projection plane 3D realizations for transformation matrices
    const planeRealization1 = world.getProjectionPlane3DRealization(plane1.id);
    const planeRealization2 = world.getProjectionPlane3DRealization(plane2.id);
    
    console.log('[Plane3DFromTraces] planeRealization1:', planeRealization1, 'planeRealization2:', planeRealization2);
    
    if (!planeRealization1 || !planeRealization2) {
      console.warn('[Plane3DFromTraces] Missing projection plane realizations', { planeRealization1, planeRealization2 });
      return new Plane3DRealization3D(new Vector4(0, 0, 1, 0), false);
    }
    
    // Transform line1 from 2D to 3D
    // line1_2D.point1 is a point (z=1), line1_2D.point2 is a direction (z=0)
    // To get two 3D points: p1 and p1+direction
    const p1_4D = applyMatrix4x3(line1_2D.point1, planeRealization1.planeTo3D);
    const p1_3D = new Vector3(p1_4D.x, p1_4D.y, p1_4D.z);
    
    // Add direction to get second point
    const p1_plus_d1 = new Vector3(
      line1_2D.point1.x + line1_2D.point2.x,
      line1_2D.point1.y + line1_2D.point2.y,
      1  // Keep z=1 for the point
    );
    const p2_4D = applyMatrix4x3(p1_plus_d1, planeRealization1.planeTo3D);
    const p2_3D = new Vector3(p2_4D.x, p2_4D.y, p2_4D.z);
    
    console.log('[Plane3DFromTraces] Line 1 in 3D: p1_3D:', p1_3D, 'p2_3D:', p2_3D);
    
    // Compute direction of line1 in 3D
    const d1 = new Vector3(
      p2_3D.x - p1_3D.x,
      p2_3D.y - p1_3D.y,
      p2_3D.z - p1_3D.z
    );
    
    console.log('[Plane3DFromTraces] d1:', d1);
    
    // Transform line2 from 2D to 3D
    // line2_2D.point1 is a point (z=1), line2_2D.point2 is a direction (z=0)
    const p3_4D = applyMatrix4x3(line2_2D.point1, planeRealization2.planeTo3D);
    const p3_3D = new Vector3(p3_4D.x, p3_4D.y, p3_4D.z);
    
    // Add direction to get second point
    const p3_plus_d2 = new Vector3(
      line2_2D.point1.x + line2_2D.point2.x,
      line2_2D.point1.y + line2_2D.point2.y,
      1  // Keep z=1 for the point
    );
    const p4_4D = applyMatrix4x3(p3_plus_d2, planeRealization2.planeTo3D);
    const p4_3D = new Vector3(p4_4D.x, p4_4D.y, p4_4D.z);
    
    console.log('[Plane3DFromTraces] Line 2 in 3D: p3_3D:', p3_3D, 'p4_3D:', p4_3D);
    
    // Compute direction of line2 in 3D
    const d2 = new Vector3(
      p4_3D.x - p3_3D.x,
      p4_3D.y - p3_3D.y,
      p4_3D.z - p3_3D.z
    );
    
    console.log('[Plane3DFromTraces] d2:', d2);
    
    // Normal = d1 × d2 (cross product of line directions)
    const normal = new Vector4(
      d1.y * d2.z - d1.z * d2.y,
      d1.z * d2.x - d1.x * d2.z,
      d1.x * d2.y - d1.y * d2.x,
      0
    );
    
    console.log('[Plane3DFromTraces] normal (before normalization):', normal);
    
    // Check if normal is degenerate (lines are parallel)
    const normalLength = Math.sqrt(normal.x * normal.x + normal.y * normal.y + normal.z * normal.z);
    
    console.log('[Plane3DFromTraces] normalLength:', normalLength);
    
    if (normalLength < 1e-10) {
      console.warn('[Plane3DFromTraces] Degenerate plane (parallel traces)', { normalLength, d1, d2 });
      return new Plane3DRealization3D(new Vector4(0, 0, 1, 0), false);
    }
    
    // Normalize normal vector
    const a = normal.x / normalLength;
    const b = normal.y / normalLength;
    const c = normal.z / normalLength;
    
    // Compute d from plane equation: ax + by + cz + d = 0
    // Using any point on line1: d = -(a*p1.x + b*p1.y + c*p1.z)
    const d = -(a * p1_3D.x + b * p1_3D.y + c * p1_3D.z);
    
    console.log('[Plane3DFromTraces] Plane equation: a=', a, 'b=', b, 'c=', c, 'd=', d);
    
    // COMPATIBILITY CHECK: Verify that line2's point lies on the computed plane
    // If the traces are valid projections of the same 3D plane, line2's point should lie on it
    const distance = Math.abs(a * p3_3D.x + b * p3_3D.y + c * p3_3D.z + d);
    
    console.log('[Plane3DFromTraces] Compatibility check distance:', distance);
    
    if (distance > 1e-6) {
      console.warn('[Plane3DFromTraces] Incompatible traces: line2 point does not lie on computed plane', {
        distance,
        line1Point: [p1_3D.x, p1_3D.y, p1_3D.z],
        line2Point: [p3_3D.x, p3_3D.y, p3_3D.z],
        planeEquation: [a, b, c, d]
      });
      return new Plane3DRealization3D(new Vector4(0, 0, 1, 0), false);
    }
    
    const equation = new Vector4(a, b, c, d);
    return new Plane3DRealization3D(equation);
  }

  getEquation(): { point: Vector4; normal: Vector4 } {
    return {
      point: this.point.clone(),
      normal: this.normal.clone()
    };
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

/**
 * BrokenHingeLine - Represents traces that appear on different planes after a 3D plane is folded
 * 
 * A Broken Hinge Line (BHL) represents a 3D line that appears as two separate projections
 * (T2 on plane P2, T2' on plane P1) after an auxiliary projection plane is created by folding
 * plane Q using trace T1 as the hinge.
 * 
 * **Key Geometric Distinction from Regular HingeLine**:
 * - Regular HingeLine: Guides are perpendicular (plane perpendicular to both projection planes)
 * - Broken HingeLine: Guides are PARALLEL to the main hinge T1 (planes containing T1 intersecting plane Q)
 * 
 * **Phase 101**: Broken Hinge Lines and Distance Transport Guides
 * - T2 and T2' are projections of the same 3D line (not two separate lines)
 * - Only directions parallel to T1 preserve distance relationships between T2 and T2'
 * - Used for distance transport operations in auxiliary plane constructions
 * 
 */

import { HingeLine } from './HingeLine';
import { Line3DRealization3D } from './Element3DRealization3D';
import type { World } from './World';
import { applyMatrix4x3 } from '@/utils/threeUtils';

/**
 * BrokenHingeLine - Extends HingeLine with auxiliary plane context
 * 
 * Stores the reference to the main hinge (T1) used for folding and the
 * auxiliary projection plane this BHL belongs to.
 */
export class BrokenHingeLine extends HingeLine {
  readonly mainHingeId: string;       // ID of the HingeLine (T1) used for folding
  readonly auxiliaryPlaneId: string;  // Auxiliary projection plane this BHL belongs to

  constructor(
    id: string,
    label: string,
    plane1Id: string,    // Base plane (contains T1 and T2')
    plane2Id: string,    // Original plane (contains T2)
    mainHingeId: string,
    auxiliaryPlaneId: string
  ) {
    super(id, label, plane1Id, plane2Id);
    this.mainHingeId = mainHingeId;
    this.auxiliaryPlaneId = auxiliaryPlaneId;
  }

  /**
   * Realize BHL in 3D using T2's geometry
   * 
   * Unlike regular HingeLine (which uses canonical coordinates), BrokenHingeLine
   * must be positioned at the actual T2 location.
   * 
   * CRITICAL: The two BHHLs use DIFFERENT T2 traces:
   * - BHHL on plane1 (auxiliary plane): uses T2' from the hinge plane
   * - BHHL on plane2 (other plane): uses T2 from the other plane
   * 
   * This is because the BHHL on the auxiliary plane must align with T2' (which is
   * visible on the hinge plane), while the BHHL on the other plane aligns with T2.
   * 
   * Context parameter determines which plane's BHHL is being realized.
   * 
   * Algorithm:
   * 1. Get auxiliary plane to find appropriate T2 trace ID
   * 2. Get T2/T2' line and realize it in 2D
   * 3. Get source plane's 3D realization (planeToThreeD matrix)
   * 4. Transform T2/T2' 2D geometry to 3D using the matrix
   * 5. Return 3D line at T2/T2' position
   */
  realize3D(world: World, context?: { planeId?: string }): Line3DRealization3D {
    // Get auxiliary plane to derive T2 trace ID
    const auxPlane = world.getProjectionPlaneById(this.auxiliaryPlaneId);
    if (!auxPlane || auxPlane.type !== 'auxiliary') {
      console.error(`[BrokenHingeLine] Auxiliary plane not found or wrong type: ${this.auxiliaryPlaneId}`);
      return Line3DRealization3D.createInfeasible();
    }

    // Determine which T2 trace to use based on which BHHL is being realized
    // - If realizing for plane1 (auxiliary plane): use T2' from hinge plane
    // - If realizing for plane2 (other plane): use T2 from other plane
    const isAuxiliaryPlane = context?.planeId === this.plane1Id;
    const t2TraceId = isAuxiliaryPlane 
      ? (auxPlane as any).t2PrimeLineId   // T2' on hinge plane (e.g., projPlane3)
      : (auxPlane as any).t2OtherTraceId; // T2 on other plane (e.g., projPlane4)
    
    const traceName = isAuxiliaryPlane ? 'T2\'' : 'T2';
    
    if (!t2TraceId) {
      console.error(`[BrokenHingeLine] Auxiliary plane ${this.auxiliaryPlaneId} has no ${traceName} trace`);
      return Line3DRealization3D.createInfeasible();
    }

    // Get T2/T2' line and realize it in 2D
    const t2Line = world.getLine2D(t2TraceId);
    if (!t2Line) {
      console.error(`[BrokenHingeLine] ${traceName} line not found: ${t2TraceId}`);
      return Line3DRealization3D.createInfeasible();
    }

    const t2Real2D = t2Line.realize2D(world);
    if (!t2Real2D.feasible) {
      return Line3DRealization3D.createInfeasible();
    }

    // Get source plane's 3D realization to transform from 2D to 3D
    // Use the plane where the T2/T2' trace actually exists
    const sourcePlaneReal3D = world.getProjectionPlane3DRealization(t2Line.planeId);
    if (!sourcePlaneReal3D || !sourcePlaneReal3D.feasible) {
      return Line3DRealization3D.createInfeasible();
    }

    // Transform T2/T2' 2D geometry to 3D
    // point1 is a point on the line (Vector3), point2 is direction (Vector3, z=0)
    // applyMatrix4x3 transforms Vector3 → Vector4 (homogeneous 3D coordinates)
    const point3D = applyMatrix4x3(t2Real2D.point1, sourcePlaneReal3D.planeTo3D);
    const direction3D = applyMatrix4x3(t2Real2D.point2, sourcePlaneReal3D.planeTo3D);

    console.log(`[BHL ${this.label}] ${traceName} on ${t2Line.planeId}: (${t2Real2D.point1.x.toFixed(2)}, ${t2Real2D.point1.y.toFixed(2)})`);
    console.log(`[BHL ${this.label}] 3D point: (${point3D.x.toFixed(2)}, ${point3D.y.toFixed(2)}, ${point3D.z.toFixed(2)}, ${point3D.w.toFixed(2)})`);

    return new Line3DRealization3D(point3D, direction3D, true);
  }

  /**
   * Get dependencies for this broken hinge line
   * 
   * Includes parent HingeLine dependencies plus mainHingeId
   */
  getDependencies(): string[] {
    return [...super.getDependencies(), this.mainHingeId];
  }

  /**
   * Clone this BrokenHingeLine
   */
  clone(): BrokenHingeLine {
    return new BrokenHingeLine(
      this.id,
      this.label || '',
      this.plane1Id,
      this.plane2Id,
      this.mainHingeId,
      this.auxiliaryPlaneId
    );
  }
}

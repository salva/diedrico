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
 * Reference: specs/001-dihedral-learning-mvp/data-model.md §Phase 101
 */

import { HingeLine } from './HingeLine';
import { Line3DRealization3D } from './Element3DRealization3D';
import type { World } from './World';

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
   * Realize BHL in 3D - same as regular HingeLine
   * 
   * Returns the 3D line geometry (canonical coordinates from plane1 transformed to 3D).
   * The BHL is geometrically identical to a regular HingeLine in 3D space - the
   * difference is only in how guides are created (parallel vs perpendicular).
   */
  realize3D(world: World): Line3DRealization3D {
    return super.realize3D(world);
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

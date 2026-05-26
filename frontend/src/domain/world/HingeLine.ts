/**
 * HingeLine - Intersection line shared by two projection planes
 * 
 * A hinge line represents the physical fold between two projection planes
 * (e.g., HL_HV between P_H and P_V). It is NOT used for broken hinge lines (BHLs),
 * which are intersections between arbitrary 3D planes.
 * 
 * The hinge line exists in 3D space and automatically realizes on both planes it connects.
 * Each plane gets a HingeLineRealization2D (the 2D view of the hinge line on that plane).
 * 
 * **Phase 52**: Refactored to extend Element3D, removing id and label properties
 * which are now inherited from Element base class. Replaces `name` with `label`.
 * 
 */

import type { ProjectionElementRealizationContext } from './projectionPlane/ProjectionPlaneContext';
import { Vector3 } from 'three';
import { Line2D } from './Line';
import { Line3D } from './Line3D';
import { Line3DRealization3D } from './Element3DRealization3D';
import { HalfHingeLineRealization2D } from './HalfHingeLineRealization2D';
import { applyMatrix4x3, applyMatrix3x4 } from '@/utils/threeUtils';

/**
 * HalfHingeLine2D - 2D representation of a hinge line on a specific projection plane
 * 
 * Each HingeLine has exactly 2 HalfHingeLine2D objects (one per plane).
 * This represents how the hinge line appears in the plane's (u,v) coordinate system.
 * 
 * **Phase 84**: NO geometry storage - computed on demand from canonical coordinates.
 * Hinge line is ALWAYS at v=0 along u-axis in plane intrinsic coordinates.
 * 
 * Design: HalfHingeLine2D extends Line2D so it can be used with all line operations.
 * It's a fixed line (cannot be deleted) that represents the fold between planes.
 * Guides reference HalfHingeLine2D (not HingeLine) because guides are perpendicular
 * to the 2D representation.
 * 
 */
export class HalfHingeLine2D extends Line2D {
  readonly hingeLineId: string;  // Parent HingeLine
  // Phase 84: NO geometry storage - computed via realize2D()

  constructor(
    id: string,
    hingeLineId: string,
    planeId: string,
    label?: string
  ) {
    // Create a friendly label like "HHL_{8}" from "projPlane3/line2d8"
    // Extract the line number after 'line2d' (not the plane number)
    const numericPart = id.match(/line2d(\d+)/)?.[1] || id.match(/\d+$/)?.[0] || id;
    super(id, planeId, label || `HHL_{${numericPart}}`);
    this.hingeLineId = hingeLineId;
  }

  clone(): HalfHingeLine2D {
    return new HalfHingeLine2D(
      this.id,
      this.hingeLineId,
      this.planeId,
      this.label
    );
  }

  /**
   * Get dependencies for this half hinge line
   * 
   * Dependencies:
   * - Parent HingeLine (for 3D realization)
   * - Projection plane (for transformation matrix in realize2D)
   * 
   * Phase 85 FIX: Must include planeId because realize2D() for plane2 calls:
   *   world.getProjectionPlane3DRealization(this.planeId)
   * 
   * When projection plane transforms change (e.g., auxiliary plane's trace lines move),
   * this half hinge line's realization must be recomputed.
   */
  getDependencies(): string[] {
    // Depend on both the parent HingeLine AND the projection plane
    // The plane dependency is critical for plane2 half-hinge lines that project back
    return [this.hingeLineId, this.planeId];
  }

  /**
   * Find the sibling HalfHingeLine2D in the other plane.
   * 
   * Static method for navigating from one HalfHingeLine2D to its sibling
   * in the paired projection plane. Used when creating sibling elements
   * (guides, intersection points, etc.)
   * 
   * Navigation: HalfHingeLine2D → HingeLine → getOtherPlane() → find matching HHL
   * 
   * @param world World instance to navigate
   * @param halfHingeLineId ID of the HalfHingeLine2D in the current plane
   * @param currentPlaneId ID of the current plane
   * @returns Object with siblingPlaneId and siblingHalfHingeLineId, or undefined if not a HHL
   */
  static getSiblingInfo(
    world: ProjectionElementRealizationContext,
    halfHingeLineId: string,
    currentPlaneId: string
  ): { siblingPlaneId: string; siblingHalfHingeLineId: string } | undefined {
    // Get current plane and HalfHingeLine2D
    const currentPlane = world.getProjectionPlaneById(currentPlaneId)!;
    const halfHingeLine = currentPlane.getLine(halfHingeLineId);
    
    if (!halfHingeLine || !(halfHingeLine instanceof HalfHingeLine2D)) {
      return undefined;
    }

    // Get parent HingeLine and sibling plane
    const hingeLine = world.getHingeLineById(halfHingeLine.hingeLineId)!;
    const siblingPlaneId = hingeLine.getOtherPlane(currentPlaneId)!;
    const siblingPlane = world.getProjectionPlaneById(siblingPlaneId)!;

    // Find HalfHingeLine2D with same hingeLineId in sibling plane
    const siblingHalfHingeLine = siblingPlane.getAllLines().find(
      (line): line is HalfHingeLine2D => line instanceof HalfHingeLine2D && line.hingeLineId === halfHingeLine.hingeLineId
    )!;

    return {
      siblingPlaneId,
      siblingHalfHingeLineId: siblingHalfHingeLine.id
    };
  }

  /**
   * Realize this half-hinge line using canonical coordinates (Phase 84)
   * 
   * Returns HalfHingeLineRealization2D with line geometry and guideVector.
   * guideVector is PERPENDICULAR to the hinge line (for regular hinge lines).
   * 
   * **Phase 84 Architecture**:
   * - Plane1: Returns canonical coordinates (0,0,1) and (1,0,0) directly
   * - Plane2: Projects 3D line back to plane2 using applyMatrix3x4()
   * 
   * **Phase 101**: Returns HalfHingeLineRealization2D with guideVector
   * - guideVector is perpendicular to hinge line direction
   * - Guide2D uses this vector to create guides
   * 
   * @param world World instance for accessing HingeLine and plane realizations
   */
  realize2D(world: ProjectionElementRealizationContext): HalfHingeLineRealization2D {
    const hingeLine = world.getHingeLineById(this.hingeLineId)!;

    // Plane1: Return canonical coordinates directly
    if (this.planeId === hingeLine.plane1Id) {
      // Check feasibility of underlying Plane3D (if projection plane has one)
      const projPlane1 = world.getProjectionPlaneById(hingeLine.plane1Id)!;
      if (projPlane1.plane3DId) {
        const plane3DReal = world.get3DPlaneRealization(projPlane1.plane3DId)!;
        if (!plane3DReal.isFeasible()) {
          // Return infeasible realization instead of throwing
          return HalfHingeLineRealization2D.createInfeasible();
        }
      }

      const hingeDirection = new Vector3(1, 0, 0);  // Canonical u-axis direction
      const guideVector = new Vector3(0, 1, 0);     // Perpendicular (v-axis direction)

      return new HalfHingeLineRealization2D(
        new Vector3(0, 0, 1),    // Canonical origin
        hingeDirection,           // Hinge line direction
        guideVector,              // Perpendicular for guides
        true                      // feasible
      );
    }

    // Plane2: Project 3D line back to plane2
    const line3D = hingeLine.realize3D(world);
    const plane2Real = world.getProjectionPlane3DRealization(this.planeId)!;

    // Check feasibility of 3D line (depends on plane1)
    if (!line3D.isFeasible()) {
      // Return infeasible realization instead of throwing
      return HalfHingeLineRealization2D.createInfeasible();
    }

    const origin2D = applyMatrix3x4(line3D.point, plane2Real.threeDToPlane);
    const direction2D = applyMatrix3x4(line3D.direction, plane2Real.threeDToPlane);
    
    // Compute perpendicular guide vector
    const guideVector = new Vector3(-direction2D.y, direction2D.x, 0).normalize();
    
    return new HalfHingeLineRealization2D(
      origin2D,
      direction2D,
      guideVector,
      true  // feasible
    );
  }
}

/**
 * HingeLine - Physical fold between two projection planes
 * 
 * The hinge line is a 3D element that automatically appears on both planes it connects.
 * It cannot be deleted and is not stored as Line2D entities - it's a fixed element.
 * 
 * Each HingeLine has exactly 2 HalfHingeLine2D objects (one per plane) that represent
 * how the hinge line appears in each plane's (u,v) coordinate system. These HalfHingeLine2D
 * objects are owned by their respective ProjectionPlane objects.
 * 
 * **Phase 52**: Refactored to extend Element3D. Inherits id and label from Element.
 * **Phase 84**: NO geometry storage - computed on demand from canonical coordinates (0,0,1), (1,0,0).
 * Extends Line3D base class to share realization pattern with other 3D lines.
 */
export class HingeLine extends Line3D {
  readonly plane1Id: string;  // Reference plane (canonical coords source)
  readonly plane2Id: string;  // Second projection plane

  constructor(
    id: string,
    label: string,
    plane1Id: string,
    plane2Id: string
  ) {
    // Phase 52: Call Element3D constructor with id and label
    super(id, label);
    
    if (plane1Id === plane2Id) {
      throw new Error('HingeLine: plane1 and plane2 must be distinct');
    }

    this.plane1Id = plane1Id;
    this.plane2Id = plane2Id;
  }

  /**
   * Compute 3D realization using canonical coordinates (Phase 84)
   * 
   * Transforms canonical coordinates (0,0,1) origin and (1,0,0) u-axis direction
   * from plane1 to 3D using applyMatrix4x3().
   * 
   * Returns Line3DRealization3D with point and direction in 3D domain coordinates (Vector4).
   */
  realize3D(world: ProjectionElementRealizationContext): Line3DRealization3D {
    const projPlane1 = world.getProjectionPlaneById(this.plane1Id);
    const projPlane2 = world.getProjectionPlaneById(this.plane2Id);

    // Check that both planes exist (structural integrity)
    if (!projPlane1 || !projPlane2) {
      const errorInfo = {
        hingeLineId: this.id,
        hingeLineLabel: this.label,
        plane1Id: this.plane1Id,
        plane2Id: this.plane2Id,
        projPlane1Exists: !!projPlane1,
        projPlane2Exists: !!projPlane2,
        allProjectionPlanes: world.getAllProjectionPlanes().map(p => ({ id: p.id })),
        allHingeLines: world.getAllHingeLines().map(hl => ({ 
          id: hl.id, 
          label: hl.label, 
          plane1Id: hl.plane1Id, 
          plane2Id: hl.plane2Id 
        }))
      };
      console.error(`[HingeLine.realize3D] CRITICAL: HingeLine references non-existent projection plane(s)`, errorInfo);
      throw new Error(`HingeLine.realize3D: HingeLine ${this.id} references invalid plane(s) - plane1: ${projPlane1 ? 'exists' : 'MISSING'}, plane2: ${projPlane2 ? 'exists' : 'MISSING'}`);
    }

    // Check feasibility of underlying Plane3D (feasibility propagation)
    // For main planes (P_H, P_V), there's no plane3DId - they're always feasible
    // For auxiliary planes, check the underlying Plane3D feasibility
    if (projPlane1.plane3DId) {
      const plane3DReal = world.get3DPlaneRealization(projPlane1.plane3DId);
      if (!plane3DReal) {
        // Plane3D not realized yet - return infeasible
        console.warn(`[HingeLine] Plane3D ${projPlane1.plane3DId} not realized yet for hinge line ${this.id}`);
        return Line3DRealization3D.createInfeasible();
      }
      if (!plane3DReal.isFeasible()) {
        // Return infeasible realization instead of throwing
        return Line3DRealization3D.createInfeasible();
      }
    }

    const plane1Real = world.getProjectionPlane3DRealization(this.plane1Id)!;
    const origin = new Vector3(0, 0, 1);      // Canonical origin
    const direction = new Vector3(1, 0, 0);   // Canonical u-axis direction
    
    const origin3D = applyMatrix4x3(origin, plane1Real.planeTo3D);
    const direction3D = applyMatrix4x3(direction, plane1Real.planeTo3D);
    
    return new Line3DRealization3D(origin3D, direction3D);
  }

  /**
   * Get dependencies - IDs of planes this hinge line depends on
   * Implementation of Element3D.getDependencies()
   */
  getDependencies(): string[] {
    return [this.plane1Id, this.plane2Id];
  }

  /**
   * Clone this hinge line
   * Implementation of Element3D.clone()
   */
  clone(): HingeLine {
    return new HingeLine(
      this.id,
      this.label || '',
      this.plane1Id,
      this.plane2Id
    );
  }

  /**
   * Check if this hinge line connects to the specified plane
   */
  connectsToPlane(planeId: string): boolean {
    return this.plane1Id === planeId || this.plane2Id === planeId;
  }

  /**
   * Get the other plane connected by this hinge line
   */
  getOtherPlane(planeId: string): string | null {
    if (planeId === this.plane1Id) return this.plane2Id;
    if (planeId === this.plane2Id) return this.plane1Id;
    return null;
  }

  /**
   * Phase 84: validateParametricConsistency() REMOVED
   * 
   * No longer needed - parametric consistency is automatic with canonical coordinates.
   * Both HalfHingeLine2D objects derive from the same 3D line via transformation,
   * guaranteeing identical parametric representation.
   */
}

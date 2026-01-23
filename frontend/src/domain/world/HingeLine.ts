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
 * Reference: specs/001-dihedral-learning-mvp/data-model.md §HingeLine
 */

import { Vector3, Vector4 } from 'three';
import { Line2D, Line2DRealization2D } from './Line';
import { Element3D } from './Element3D';
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
 * Reference: specs/001-dihedral-learning-mvp/data-model.md §HingeLine
 */
export class HalfHingeLine2D extends Line2D {
  readonly hingeLineId: string;  // Parent HingeLine
  // Phase 84: NO geometry storage - computed via realize2D()

  constructor(
    id: string,
    hingeLineId: string,
    planeId: string
  ) {
    super(id, planeId, `HL_${hingeLineId}`);
    this.hingeLineId = hingeLineId;
  }

  clone(): HalfHingeLine2D {
    return new HalfHingeLine2D(
      this.id,
      this.hingeLineId,
      this.planeId
    );
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
    world: import('./World').World,
    halfHingeLineId: string,
    currentPlaneId: string
  ): { siblingPlaneId: string; siblingHalfHingeLineId: string } | undefined {
    console.log(`[HalfHingeLine2D.getSiblingInfo] Called with halfHingeLineId=${halfHingeLineId}, currentPlaneId=${currentPlaneId}`);
    
    // Get current plane and HalfHingeLine2D
    const currentPlane = world.getProjectionPlaneById(currentPlaneId)!;
    const halfHingeLine = currentPlane.getLine(halfHingeLineId);
    
    if (!halfHingeLine || !(halfHingeLine instanceof HalfHingeLine2D)) {
      console.log(`[HalfHingeLine2D.getSiblingInfo] Early return: not a HalfHingeLine2D`);
      return undefined;
    }

    // Get parent HingeLine and sibling plane
    const hingeLine = world.getHingeLineById(halfHingeLine.hingeLineId)!;
    const siblingPlaneId = hingeLine.getOtherPlane(currentPlaneId)!;
    const siblingPlane = world.getProjectionPlaneById(siblingPlaneId)!;

    console.log(`[HalfHingeLine2D.getSiblingInfo] Sibling plane: ${siblingPlaneId}`);

    // Find HalfHingeLine2D with same hingeLineId in sibling plane
    const siblingHalfHingeLine = siblingPlane.getAllLines().find(
      (line): line is HalfHingeLine2D => line instanceof HalfHingeLine2D && line.hingeLineId === halfHingeLine.hingeLineId
    )!;

    console.log(`[HalfHingeLine2D.getSiblingInfo] Found sibling HHL: ${siblingHalfHingeLine.id}`);

    return {
      siblingPlaneId,
      siblingHalfHingeLineId: siblingHalfHingeLine.id
    };
  }

  /**
   * Realize this half-hinge line using canonical coordinates (Phase 84)
   * 
   * Returns infinite line: point1 (finite) + point2 (direction with z=0)
   * 
   * **Phase 84 Architecture**:
   * - Plane1: Returns canonical coordinates (0,0,1) and (1,0,0) directly
   * - Plane2: Projects 3D line back to plane2 using applyMatrix3x4()
   * 
   * @param world World instance for accessing HingeLine and plane realizations
   */
  realize2D(world: import('./World').World): Line2DRealization2D {
    const hingeLine = world.getHingeLineById(this.hingeLineId);
    if (!hingeLine) {
      throw new Error(`[HalfHingeLine2D.realize2D] HingeLine ${this.hingeLineId} not found`);
    }

    // Plane1: Return canonical coordinates directly
    if (this.planeId === hingeLine.plane1Id) {
      return new Line2DRealization2D(
        new Vector3(0, 0, 1),    // Canonical origin
        new Vector3(1, 0, 0)     // Canonical u-axis direction
      );
    }

    // Plane2: Project 3D line back to plane2
    const line3D = hingeLine.realize3D(world);
    const plane2Real = world.getProjectionPlane3DRealization(this.planeId);
    if (!plane2Real) {
      throw new Error(`[HalfHingeLine2D.realize2D] Plane realization not found for ${this.planeId}`);
    }

    const origin2D = applyMatrix3x4(line3D.point, plane2Real.threeDToPlane);
    const direction2D = applyMatrix3x4(line3D.direction, plane2Real.threeDToPlane);
    
    return new Line2DRealization2D(origin2D, direction2D);
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
 * Implements getDependencies() to return [plane1Id, plane2Id].
 */
export class HingeLine extends Element3D {
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
   * Returns object with point and direction in 3D domain coordinates (Vector4).
   */
  realize3D(world: any): { point: Vector4; direction: Vector4 } {
    const plane1Real = world.getProjectionPlane3DRealization(this.plane1Id);
    if (!plane1Real) {
      throw new Error(`[HingeLine.realize3D] Plane realization not found for ${this.plane1Id}`);
    }
    
    const origin = new Vector3(0, 0, 1);      // Canonical origin
    const direction = new Vector3(1, 0, 0);   // Canonical u-axis direction
    
    const origin3D = applyMatrix4x3(origin, plane1Real.planeTo3D);
    const direction3D = applyMatrix4x3(direction, plane1Real.planeTo3D);
    
    return {
      point: origin3D,
      direction: direction3D
    };
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

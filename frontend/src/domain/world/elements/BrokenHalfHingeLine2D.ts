/**
 * BrokenHalfHingeLine2D - 2D representation of a broken hinge line on a specific projection plane
 * 
 * Extends HalfHingeLine2D to represent traces T2 and T2' that appear on different planes
 * after an auxiliary projection plane is created. Unlike regular HalfHingeLine2D where guides
 * are perpendicular, guides for BrokenHalfHingeLine2D must be PARALLEL to the main hinge T1.
 * 
 * **Key Distinction**:
 * - Regular HalfHingeLine2D: Guides perpendicular (represent plane perpendicular to both projection planes)
 * - BrokenHalfHingeLine2D: Guides parallel to T1 (represent intersections with planes containing T1)
 * 
 * **Phase 101**: Broken Hinge Lines and Distance Transport Guides
 * - Stores mainHingeId (reference to T1) for computing parallelVector
 * - Stores siblingBHHLId for creating linked guides on both T2 and T2'
 * - realize2D() returns BrokenHalfHingeLineRealization2D with parallelVector field
 * 
 * Reference: specs/001-dihedral-learning-mvp/data-model.md §Phase 101
 */

import { HalfHingeLine2D } from '../HingeLine';
import { BrokenHingeLine } from '../BrokenHingeLine';
import { HalfHingeLineRealization2D } from '../HalfHingeLineRealization2D';
import type { World } from '../World';

/**
 * BrokenHalfHingeLine2D - Broken hinge line projection on one plane
 * 
 * Extends HalfHingeLine2D with additional fields:
 * - mainHingeId: Reference to T1 (the folding hinge)
 * - siblingBHHLId: Reference to the sibling BHHL on the other plane
 */
export class BrokenHalfHingeLine2D extends HalfHingeLine2D {
  readonly mainHingeId: string;     // ID of the main hinge (T1) used for folding
  readonly siblingBHHLId: string;   // ID of the sibling BrokenHalfHingeLine2D on the other plane

  constructor(
    id: string,
    planeId: string,
    brokenHingeLineId: string,
    mainHingeId: string,
    siblingBHHLId: string,
    label?: string
  ) {
    // Create a friendly label like "BHHL_{33}" from "hingeLine33" if not provided
    const numericPart = brokenHingeLineId.match(/\d+/)?.[0] || brokenHingeLineId;
    const bhhlLabel = label || `BHHL_{${numericPart}}`;
    
    super(id, brokenHingeLineId, planeId, bhhlLabel);
    this.mainHingeId = mainHingeId;
    this.siblingBHHLId = siblingBHHLId;
  }

  /**
   * Clone this BrokenHalfHingeLine2D
   */
  clone(): BrokenHalfHingeLine2D {
    return new BrokenHalfHingeLine2D(
      this.id,
      this.planeId,
      this.hingeLineId,
      this.mainHingeId,
      this.siblingBHHLId,
      this.label
    );
  }

  /**
   * Realize BHHL in 2D with parallel vector
   * 
   * Returns BrokenHalfHingeLineRealization2D with:
   * - Line geometry (point, direction) from super.realize2D()
   * - parallelVector: Direction parallel to main hinge T1 (for guide creation)
   * 
   * **Algorithm**:
   * 1. Call super.realize2D() to get line geometry (T2 or T2' position/direction)
   * 2. Get the BrokenHingeLine to access mainHingeId
   * 3. Find the main hinge's (T1's) HalfHingeLine2D on THIS plane
   * 4. Realize T1 to get its direction vector
   * 5. Normalize → parallelVector
   * 6. Return BrokenHalfHingeLineRealization2D with parallelVector
   * 
   * @throws Error if main hinge not found on this plane
   */
  realize2D(world: World): HalfHingeLineRealization2D {
    // Get line geometry from parent realization (T2 or T2' position/direction)
    const lineRealization = super.realize2D(world);

    // If infeasible, return infeasible HalfHingeLineRealization2D
    if (!lineRealization.isFeasible()) {
      return HalfHingeLineRealization2D.createInfeasible();
    }

    // Get the BrokenHingeLine to access mainHingeId
    const bhl = world.getHingeLineById(this.hingeLineId);
    if (!(bhl instanceof BrokenHingeLine)) {
      throw new Error(
        `BrokenHalfHingeLine2D ${this.id}: hingeLineId ${this.hingeLineId} is not a BrokenHingeLine`
      );
    }

    // Get the main hinge (T1)
    const mainHinge = world.getHingeLineById(bhl.mainHingeId);
    if (!mainHinge) {
      throw new Error(
        `BrokenHalfHingeLine2D ${this.id}: mainHingeId ${bhl.mainHingeId} not found`
      );
    }

    // Determine which plane has the main hinge's HalfHingeLine2D
    // The main hinge connects two planes. We need to find which one to use for this BHHL.
    // If this BHHL is on the auxiliary plane, we use the hinge trace plane (the other plane from main hinge).
    // If this BHHL is on the other plane, we use that plane itself if it's part of the main hinge.
    let planeWithMainHinge: string;
    
    if (this.planeId === bhl.auxiliaryPlaneId) {
      // This BHHL is on the auxiliary plane, so find the hinge trace plane
      // The hinge trace plane is whichever of the main hinge's planes is NOT the auxiliary plane
      if (mainHinge.plane1Id === bhl.auxiliaryPlaneId) {
        planeWithMainHinge = mainHinge.plane2Id;
      } else if (mainHinge.plane2Id === bhl.auxiliaryPlaneId) {
        planeWithMainHinge = mainHinge.plane1Id;
      } else {
        // Main hinge doesn't connect to auxiliary plane at all - use whichever plane contains the other plane
        // In BrokenHingeLine: plane1Id = auxiliary, plane2Id = other
        if (mainHinge.plane1Id === bhl.plane2Id || mainHinge.plane2Id === bhl.plane2Id) {
          planeWithMainHinge = bhl.plane2Id;
        } else {
          // Use the first plane of the main hinge
          planeWithMainHinge = mainHinge.plane1Id;
        }
      }
    } else {
      // This BHHL is on the "other" plane (not auxiliary)
      // Use this plane itself if it's part of the main hinge
      if (this.planeId === mainHinge.plane1Id || this.planeId === mainHinge.plane2Id) {
        planeWithMainHinge = this.planeId;
      } else {
        // This plane is not part of the main hinge - this shouldn't happen
        throw new Error(
          `BrokenHalfHingeLine2D ${this.id}: This plane ${this.planeId} is not part of main hinge ${mainHinge.id}`
        );
      }
    }

    // Find the main hinge's HalfHingeLine2D on the determined plane
    const planeWithHinge = world.getProjectionPlaneById(planeWithMainHinge);
    if (!planeWithHinge) {
      throw new Error(
        `BrokenHalfHingeLine2D ${this.id}: plane ${planeWithMainHinge} not found`
      );
    }

    const mainHingeOnPlane = planeWithHinge.getAllLines().find(
      (line): line is HalfHingeLine2D => 
        line instanceof HalfHingeLine2D && line.hingeLineId === mainHinge.id
    );

    if (!mainHingeOnPlane) {
      throw new Error(
        `BrokenHalfHingeLine2D ${this.id}: Main hinge ${mainHinge.id} not found on plane ${planeWithMainHinge}`
      );
    }

    // Get the main hinge's direction vector (for parallel guides)
    const mainHingeRealization = mainHingeOnPlane.realize2D(world);
    if (!mainHingeRealization.isFeasible()) {
      return HalfHingeLineRealization2D.createInfeasible();
    }

    const guideVector = mainHingeRealization.getDirection().clone().normalize();

    // Return same realization type as regular HalfHingeLine2D, but with parallel guideVector
    return new HalfHingeLineRealization2D(
      lineRealization.point1,
      lineRealization.point2,
      guideVector,  // Parallel to main hinge T1 (not perpendicular!)
      true          // feasible
    );
  }

  /**
   * Get dependencies for this broken half hinge line
   * 
   * Includes parent HalfHingeLine2D dependencies plus mainHingeId
   */
  getDependencies(): string[] {
    return [...super.getDependencies(), this.mainHingeId];
  }

  /**
   * Get sibling BHHL information
   * 
   * Static method similar to HalfHingeLine2D.getSiblingInfo(), but for BrokenHalfHingeLine2D.
   * Returns the sibling BHHL ID and plane ID for creating linked guides.
   * 
   * @param world World instance for navigation
   * @param bhhlId ID of this BrokenHalfHingeLine2D
   * @param currentPlaneId ID of the plane containing this BHHL
   * @returns Sibling info or undefined if not a BHHL
   */
  static getSiblingInfo(
    world: World,
    bhhlId: string,
    currentPlaneId: string
  ): { siblingPlaneId: string; siblingHalfHingeLineId: string } | undefined {
    // Get current plane and BHHL
    const currentPlane = world.getProjectionPlaneById(currentPlaneId);
    if (!currentPlane) return undefined;

    const bhhl = currentPlane.getLine(bhhlId);
    if (!bhhl || !(bhhl instanceof BrokenHalfHingeLine2D)) {
      return undefined;
    }

    // Get sibling BHHL using direct reference
    const siblingBHHL = world.getLine2D(bhhl.siblingBHHLId);
    if (!siblingBHHL || !(siblingBHHL instanceof BrokenHalfHingeLine2D)) {
      console.warn(`BrokenHalfHingeLine2D.getSiblingInfo: sibling BHHL ${bhhl.siblingBHHLId} not found`);
      return undefined;
    }

    return {
      siblingPlaneId: siblingBHHL.planeId,
      siblingHalfHingeLineId: siblingBHHL.id  // Use same field name as parent for compatibility
    };
  }
}

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
 */

import { HalfHingeLine2D } from '../HingeLine';
import { BrokenHingeLine } from '../BrokenHingeLine';
import { HalfHingeLineRealization2D } from '../HalfHingeLineRealization2D';
import { AuxiliaryProjectionPlane } from '../projectionPlane/AuxiliaryProjectionPlane';
import type { ProjectionElementRealizationContext } from '../projectionPlane/ProjectionPlaneContext';

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
    brokenHingeLine: BrokenHingeLine,
    mainHingeId: string,
    siblingBHHLId: string,
    label?: string
  ) {
    // Create a friendly label like "BHHL_{33}" from "projPlane28/line2d33" if not provided
    // Extract the line number after 'line2d' (not the plane number)
    const numericPart = id.match(/line2d(\d+)/)?.[1] || id.match(/\d+$/)?.[0] || id;
    const bhhlLabel = label || `BHHL_{${numericPart}}`;
    
    super(id, brokenHingeLine, planeId, bhhlLabel);
    this.mainHingeId = mainHingeId;
    this.siblingBHHLId = siblingBHHLId;
  }

  /**
   * Clone this BrokenHalfHingeLine2D
   */
  clone(): BrokenHalfHingeLine2D {
    // Note: Cloning requires looking up brokenHingeLine from world, which isn't available here
    // This is a limitation of the current clone() signature  
    // For now, keep the ID-based approach for clone()
    return new BrokenHalfHingeLine2D(
      this.id,
      this.planeId,
      { id: this.hingeLineId } as BrokenHingeLine,  // Minimal object with just ID
      this.mainHingeId,
      this.siblingBHHLId,
      this.label
    );
  }

  /**
   * Realize BHHL in 2D with guide vector pointing to sibling BHHL
   * 
   * Unlike regular HalfHingeLine2D (which uses canonical coords for plane1),
   * BHHL must ALWAYS project from 3D to get the correct T2/T2' position.
   * 
   * Returns HalfHingeLineRealization2D with:
   * - Line geometry: Projected from BrokenHingeLine's 3D realization
   * - guideVector: Points from this BHHL to the sibling BHHL on the other plane
   * 
   * **Algorithm**:
   * 1. Get BrokenHingeLine's 3D realization (at T2's position)
   * 2. Project 3D line to THIS plane's 2D coordinates (gives us T2 or T2')
   * 3. Get sibling BHHL's realization
   * 4. Create guide vector pointing from this BHHL to sibling BHHL
   *
   * CRITICAL: The BHHL must overlay its corresponding T2/T2' trace in paper coordinates.
   * We achieve this by transforming the T2/T2' realization through paper coordinates:
   *   T2/T2' local coords → paper coords (via source planeToPaper) → this plane local coords (via paperToPlane)
   * This avoids the 3D round-trip which incorrectly maps to the P_A1 origin.
   */
  realize2D(world: ProjectionElementRealizationContext): HalfHingeLineRealization2D {
    // Get the BrokenHingeLine parent
    const bhl = world.getHingeLineById(this.hingeLineId);
    if (!(bhl instanceof BrokenHingeLine)) {
      console.error(`[BrokenHalfHingeLine2D] Not a BrokenHingeLine: ${this.hingeLineId}`);
      return HalfHingeLineRealization2D.createInfeasible();
    }

    // Get auxiliary plane to find the correct T2/T2' trace
    const auxPlane = world.getProjectionPlaneById(bhl.auxiliaryPlaneId);
    if (!(auxPlane instanceof AuxiliaryProjectionPlane)) {
      console.error(`[BHHL ${this.label}] Auxiliary plane not found: ${bhl.auxiliaryPlaneId}`);
      return HalfHingeLineRealization2D.createInfeasible();
    }

    // Select the correct T2 trace based on which plane this BHHL is on:
    // - BHHL on plane1 (auxiliary plane): uses T2' from the hinge plane
    // - BHHL on plane2 (other plane): uses T2 from the other plane
    const isOnAuxiliaryPlane = this.planeId === bhl.plane1Id;
    const t2TraceId = isOnAuxiliaryPlane
      ? auxPlane.t2PrimeLineId   // T2' on hinge plane
      : auxPlane.t2OtherTraceId; // T2 on other plane
    const traceName = isOnAuxiliaryPlane ? "T2'" : 'T2';

    if (!t2TraceId) {
      console.error(`[BHHL ${this.label}] No ${traceName} trace on auxiliary plane ${bhl.auxiliaryPlaneId}`);
      return HalfHingeLineRealization2D.createInfeasible();
    }

    // Get T2/T2' line and realize it in its source plane's local coords
    const t2Line = world.getLine2D(t2TraceId);
    if (!t2Line) {
      console.error(`[BHHL ${this.label}] ${traceName} line not found: ${t2TraceId}`);
      return HalfHingeLineRealization2D.createInfeasible();
    }

    const t2Real2D = t2Line.realize2D(world);
    if (!t2Real2D.feasible) {
      console.error(`[BHHL ${this.label}] ${traceName} realization infeasible`);
      return HalfHingeLineRealization2D.createInfeasible();
    }

    // Transform T2/T2' from source plane → paper → this plane
    // This ensures the BHHL overlays T2/T2' visually in paper coordinates
    const sourcePlaneReal2D = world.getProjectionPlane2DRealization(t2Line.planeId);
    const targetPlaneReal2D = world.getProjectionPlane2DRealization(this.planeId);
    if (!sourcePlaneReal2D?.feasible || !targetPlaneReal2D?.feasible) {
      return HalfHingeLineRealization2D.createInfeasible();
    }

    // Step 1: T2/T2' point in source plane local → paper coords
    const pointInPaper = t2Real2D.point1.clone().applyMatrix3(sourcePlaneReal2D.planeToPaper2D);
    // Step 2: Paper coords → this plane's local coords
    const origin2D = pointInPaper.applyMatrix3(targetPlaneReal2D.paperToPlane2D);

    // Same for direction (z=0, so translation component doesn't apply)
    const dirInPaper = t2Real2D.getDirection().clone().applyMatrix3(sourcePlaneReal2D.planeToPaper2D);
    const direction2D = dirInPaper.applyMatrix3(targetPlaneReal2D.paperToPlane2D);

    console.log(`[BHHL ${this.label}] ${traceName} (${t2TraceId}) on ${t2Line.planeId}: point=(${t2Real2D.point1.x.toFixed(2)}, ${t2Real2D.point1.y.toFixed(2)})`);
    console.log(`[BHHL ${this.label}] origin2D: (${origin2D.x.toFixed(2)}, ${origin2D.y.toFixed(2)}, z=${origin2D.z.toFixed(2)}) on plane ${this.planeId}`);

    // Get T1's direction on THIS plane for parallel guides
    const mainHinge = world.getHingeLineById(bhl.mainHingeId);
    if (!mainHinge) {
      console.error(`[BHHL ${this.label}] Main hinge not found: ${bhl.mainHingeId}`);
      return HalfHingeLineRealization2D.createInfeasible();
    }

    // Find T1's trace on THIS plane
    const thisPlane = world.getProjectionPlaneById(this.planeId);
    if (!thisPlane) {
      console.error(`[BHHL ${this.label}] Plane not found: ${this.planeId}`);
      return HalfHingeLineRealization2D.createInfeasible();
    }

    // Find hinge line connecting this plane to mainHinge.plane1Id
    console.log(`[BHHL ${this.label}] Looking for T1 hinge between ${this.planeId} and ${mainHinge.plane1Id}`);
    const allHingeLines = world.getAllHingeLines();
    console.log(`[BHHL ${this.label}] Available hinge lines:`, allHingeLines.map(hl => `${hl.id}(${hl.plane1Id}-${hl.plane2Id})`));
    
    const t1HingeLine = allHingeLines.find(hl => 
      (hl.plane1Id === this.planeId && hl.plane2Id === mainHinge.plane1Id) ||
      (hl.plane2Id === this.planeId && hl.plane1Id === mainHinge.plane1Id)
    );

    if (!t1HingeLine) {
      console.error(`[BHHL ${this.label}] T1 hinge not found between ${this.planeId} and ${mainHinge.plane1Id}`);
      return HalfHingeLineRealization2D.createInfeasible();
    }

    console.log(`[BHHL ${this.label}] Found T1 hinge: ${t1HingeLine.id}`);

    // Get T1's HalfHingeLine2D on THIS plane
    const allLinesOnPlane = thisPlane.getAllLines();
    console.log(`[BHHL ${this.label}] Lines on plane ${this.planeId}:`, allLinesOnPlane.map(l => `${l.id}(${l.constructor.name})`));
    
    const t1HalfHinge = allLinesOnPlane.find(
      (line): line is HalfHingeLine2D => 
        line instanceof HalfHingeLine2D && 
        line.hingeLineId === t1HingeLine.id
    );

    if (!t1HalfHinge) {
      console.error(`[BHHL ${this.label}] T1 trace not found on plane ${this.planeId}`);
      return HalfHingeLineRealization2D.createInfeasible();
    }

    console.log(`[BHHL ${this.label}] Found T1 trace: ${t1HalfHinge.id} (${t1HalfHinge.label})`);

    const t1Realization = t1HalfHinge.realize2D(world);
    if (!t1Realization.isFeasible()) {
      console.error(`[BHHL ${this.label}] T1 realization infeasible`);
      return HalfHingeLineRealization2D.createInfeasible();
    }

    console.log(`[BHHL ${this.label}] T1 realization feasible`);

    // Guide vector is parallel to T1
    const guideVector = t1Realization.getDirection().clone().normalize();

    console.log(`[BHHL ${this.label}] Guide vector parallel to T1: (${guideVector.x.toFixed(2)}, ${guideVector.y.toFixed(2)})`);
    console.log(`[BHHL ${this.label}] ✅ REALIZATION COMPLETE - returning feasible result`);

    // Return realization with BHHL at T2/T2' and guides parallel to T1
    return new HalfHingeLineRealization2D(
      origin2D,          // T2 on plane2, T2' on plane1
      direction2D,       // BHHL direction (T2/T2' direction)
      guideVector,       // Parallel to T1
      true               // feasible
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
    world: ProjectionElementRealizationContext,
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

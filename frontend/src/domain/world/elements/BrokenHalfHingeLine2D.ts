/**
 * BrokenHalfHingeLine2D - 2D representation of a broken hinge line on a specific projection plane
 * 
 * Extends HalfHingeLine2D to represent traces T2 and T2' that appear on different planes
 * after an auxiliary projection plane is created. Unlike regular HalfHingeLine2D where guides
 * are perpendicular, guides for BrokenHalfHingeLine2D are also perpendicular to the
 * broken hinge trace they replace.
 * 
 * **Key Distinction**:
 * - Regular HalfHingeLine2D: Guides perpendicular (represent plane perpendicular to both projection planes)
 * - BrokenHalfHingeLine2D: Guides perpendicular to the replaced T2/T2' trace
 * 
 * **Phase 101**: Broken Hinge Lines and Distance Transport Guides
 * - Stores mainHingeId (reference to T1) for dependency tracking
 * - Stores siblingBHHLId for creating linked guides on both T2 and T2'
 * - realize2D() returns HalfHingeLineRealization2D with a trace-perpendicular guideVector
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
    brokenHingeLineId: string,
    mainHingeId: string,
    siblingBHHLId: string,
    label?: string
  ) {
    // Create a friendly label like "BHHL_{33}" from "projPlane28/line2d33" if not provided
    // Extract the line number after 'line2d' (not the plane number)
    const numericPart = id.match(/line2d(\d+)/)?.[1] || id.match(/\d+$/)?.[0] || id;
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
  realize2D(context: ProjectionElementRealizationContext): HalfHingeLineRealization2D {
    // Get the BrokenHingeLine parent
    const bhl = context.getHingeLineById(this.hingeLineId);
    if (!(bhl instanceof BrokenHingeLine)) {
      return HalfHingeLineRealization2D.createInfeasible();
    }

    // Get auxiliary plane to find the correct T2/T2' trace
    const auxPlane = context.getProjectionPlaneById(bhl.auxiliaryPlaneId);
    if (!(auxPlane instanceof AuxiliaryProjectionPlane)) {
      return HalfHingeLineRealization2D.createInfeasible();
    }

    // Select the correct T2 trace based on which plane this BHHL is on:
    // - BHHL on plane1 (auxiliary plane): uses T2' from the hinge plane
    // - BHHL on plane2 (other plane): uses T2 from the other plane
    const isOnAuxiliaryPlane = this.planeId === bhl.plane1Id;
    const t2TraceId = isOnAuxiliaryPlane
      ? auxPlane.t2PrimeLineId   // T2' on hinge plane
      : auxPlane.t2OtherTraceId; // T2 on other plane

    if (!t2TraceId) {
      return HalfHingeLineRealization2D.createInfeasible();
    }

    // Get T2/T2' line and realize it in its source plane's local coords
    const t2Line = context.getLine2D(t2TraceId);
    if (!t2Line) {
      return HalfHingeLineRealization2D.createInfeasible();
    }

    const t2Real2D = t2Line.realize2D(context);
    if (!t2Real2D.feasible) {
      return HalfHingeLineRealization2D.createInfeasible();
    }

    // Transform T2/T2' from source plane → paper → this plane
    // This ensures the BHHL overlays T2/T2' visually in paper coordinates
    const sourcePlaneReal2D = context.getProjectionPlane2DRealization(t2Line.planeId);
    const targetPlaneReal2D = context.getProjectionPlane2DRealization(this.planeId);
    if (!sourcePlaneReal2D) throw new Error(`BrokenHalfHingeLine2D ${this.id}: missing 2D realization for source plane ${t2Line.planeId}`);
    if (!targetPlaneReal2D) throw new Error(`BrokenHalfHingeLine2D ${this.id}: missing 2D realization for target plane ${this.planeId}`);
    if (!sourcePlaneReal2D.feasible || !targetPlaneReal2D.feasible) {
      return HalfHingeLineRealization2D.createInfeasible();
    }

    // Step 1: T2/T2' point in source plane local → paper coords
    const pointInPaper = t2Real2D.point1.clone().applyMatrix3(sourcePlaneReal2D.planeToPaper2D);
    // Step 2: Paper coords → this plane's local coords
    const origin2D = pointInPaper.applyMatrix3(targetPlaneReal2D.paperToPlane2D);

    // Same for direction (z=0, so translation component doesn't apply)
    const dirInPaper = t2Real2D.getDirection().clone().applyMatrix3(sourcePlaneReal2D.planeToPaper2D);
    const direction2D = dirInPaper.applyMatrix3(targetPlaneReal2D.paperToPlane2D);

    // Guide vector follows regular half-hinge behavior: perpendicular to the
    // broken hinge line's 2D trace on this plane.
    const guideVector = direction2D.lengthSq() > 1e-10
      ? direction2D.clone().normalize()
      : direction2D.clone();
    guideVector.set(-guideVector.y, guideVector.x, 0);
    if (guideVector.lengthSq() < 1e-10) {
      return HalfHingeLineRealization2D.createInfeasible();
    }

    // Return realization with BHHL at T2/T2' and guides perpendicular to the trace
    return new HalfHingeLineRealization2D(
      origin2D,          // T2 on plane2, T2' on plane1
      direction2D,       // BHHL direction (T2/T2' direction)
      guideVector,       // Perpendicular to the replaced T2/T2' trace
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
   * @param context Realization context for navigation
   * @param bhhlId ID of this BrokenHalfHingeLine2D
   * @param currentPlaneId ID of the plane containing this BHHL
   * @returns Sibling info or undefined if not a BHHL
   */
  static getSiblingInfo(
    context: ProjectionElementRealizationContext,
    bhhlId: string,
    currentPlaneId: string
  ): { siblingPlaneId: string; siblingHalfHingeLineId: string } | undefined {
    // Get current plane and BHHL
    const currentPlane = context.getProjectionPlaneById(currentPlaneId);
    if (!currentPlane) return undefined;

    const bhhl = currentPlane.getLine(bhhlId);
    if (!bhhl || !(bhhl instanceof BrokenHalfHingeLine2D)) {
      return undefined;
    }

    // Get sibling BHHL using direct reference
    const siblingBHHL = context.getLine2D(bhhl.siblingBHHLId);
    if (!siblingBHHL || !(siblingBHHL instanceof BrokenHalfHingeLine2D)) {
      return undefined;
    }

    return {
      siblingPlaneId: siblingBHHL.planeId,
      siblingHalfHingeLineId: siblingBHHL.id  // Use same field name as parent for compatibility
    };
  }
}

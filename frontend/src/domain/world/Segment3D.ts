/**
 * 3D segment classes (domain layer - definitions)
 * 
 * Contains high-level definitions and relationships (IDs of source 2D elements).
 * NO numeric coordinates - those are computed and stored in Segment3DRealization3D.
 * 
 * Types:
 * - Segment3DFromProjections: User-created segment from two 2D segment projections (Phase 78)
 * 
 * Architecture:
 * - Element3D classes store WHAT the element is (definition/rules)
 * - realize3D() computes numeric geometry → Segment3DRealization3D
 * - Lazy evaluation with caching owned by World's RealizationService
 * 
 */
import { Vector4 } from 'three';
import { Element3D } from './Element3D';
import { Segment3DRealization3D } from './Element3DRealization3D';
import type { Element3DRealizationContext } from './projectionPlane/ProjectionPlaneContext';
import type { VisualStyle } from './VisualStyle';
import { createVisualStyle } from './VisualStyle';
import { reconstruct3DPointFromProjections } from '@/utils/threeUtils';

/**
 * Segment3DFromProjections - Segment derived from two 2D segment projections
 * User-created element (Phase 78)
 * 
 * Stores ONLY IDs of defining elements, no numeric data.
 * realize3D() reconstructs 3D segment from 2D projection coordinates.
 */
export class Segment3DFromProjections extends Element3D {
  /** Serialization/DTO discriminator only; runtime dispatch uses instanceof. */
  readonly kind = 'Segment3DFromProjections';
  label: string;
  
  // Defining relations (ONLY IDs, no numeric data)
  projection1: string;  // Segment2D ID on first plane
  projection2: string;  // Segment2D ID on second plane (must be different)
  plane1Id: string;     // Which plane projection1 is on
  plane2Id: string;     // Which plane projection2 is on (must be different)

  constructor(
    id: string,
    label: string,
    projection1: string,
    projection2: string,
    plane1Id: string,
    plane2Id: string,
    visualStyle: VisualStyle
  ) {
    super(id, label, visualStyle);  // Pass label and visualStyle to Element base constructor
    this.label = label;
    this.projection1 = projection1;
    this.projection2 = projection2;
    this.plane1Id = plane1Id;
    this.plane2Id = plane2Id;
  }

  realize3D(context: Element3DRealizationContext): Segment3DRealization3D {
    try {
      // 1. Get 2D projections and their planes
      const plane1 = context.getProjectionPlaneById(this.plane1Id);
      const plane2 = context.getProjectionPlaneById(this.plane2Id);
      
      if (!plane1 || !plane2) {
        return new Segment3DRealization3D(
          new Vector4(0, 0, 0, 1),
          new Vector4(1, 0, 0, 1),
          false
        );
      }

      const seg1Element = plane1.getLine(this.projection1);  // Segments are stored as Line2D
      const seg2Element = plane2.getLine(this.projection2);
      
      if (!seg1Element || !seg2Element) {
        return new Segment3DRealization3D(
          new Vector4(0, 0, 0, 1),
          new Vector4(1, 0, 0, 1),
          false
        );
      }

      // 2. Realize 2D projections to get endpoint coordinates
      const seg1Real = seg1Element.realize2D(context);
      const seg2Real = seg2Element.realize2D(context);

      if (!seg1Real || !seg2Real || !seg1Real.isFeasible() || !seg2Real.isFeasible()) {
        return new Segment3DRealization3D(
          new Vector4(0, 0, 0, 1),
          new Vector4(1, 0, 0, 1),
          false
        );
      }

      // 3. Get plane 3D realizations for projection matrices
      const plane1Real = context.getProjectionPlane3DRealization(this.plane1Id);
      const plane2Real = context.getProjectionPlane3DRealization(this.plane2Id);

      if (!plane1Real || !plane2Real) {
        return new Segment3DRealization3D(
          new Vector4(0, 0, 0, 1),
          new Vector4(1, 0, 0, 1),
          false
        );
      }

      // 4. Get segment endpoints (point1 and point2 from Line2DRealization2D)
      const p1_seg1 = seg1Real.point1;  // First endpoint of segment on plane1
      const p2_seg1 = seg1Real.point2;  // Second endpoint of segment on plane1
      const p1_seg2 = seg2Real.point1;  // First endpoint of segment on plane2
      const p2_seg2 = seg2Real.point2;  // Second endpoint of segment on plane2

      // 5. Try both possible endpoint pairings
      // Pairing A: seg1.p1 ↔ seg2.p1, seg1.p2 ↔ seg2.p2
      const pairA_start = reconstruct3DPointFromProjections(
        p1_seg1, p1_seg2, plane1Real.threeDToPlane, plane2Real.threeDToPlane
      );
      const pairA_end = reconstruct3DPointFromProjections(
        p2_seg1, p2_seg2, plane1Real.threeDToPlane, plane2Real.threeDToPlane
      );
      const pairA_valid = pairA_start.feasible && pairA_end.feasible;
      const pairA_error = pairA_start.error + pairA_end.error;

      // Pairing B: seg1.p1 ↔ seg2.p2, seg1.p2 ↔ seg2.p1
      const pairB_start = reconstruct3DPointFromProjections(
        p1_seg1, p2_seg2, plane1Real.threeDToPlane, plane2Real.threeDToPlane
      );
      const pairB_end = reconstruct3DPointFromProjections(
        p2_seg1, p1_seg2, plane1Real.threeDToPlane, plane2Real.threeDToPlane
      );
      const pairB_valid = pairB_start.feasible && pairB_end.feasible;
      const pairB_error = pairB_start.error + pairB_end.error;

      // 6. Select valid pairing
      if (pairA_valid && pairB_valid) {
        // Both valid — use the one with smaller total error
        if (pairA_error <= pairB_error) {
          return new Segment3DRealization3D(pairA_start.point, pairA_end.point);
        } else {
          return new Segment3DRealization3D(pairB_start.point, pairB_end.point);
        }
      } else if (pairA_valid) {
        return new Segment3DRealization3D(pairA_start.point, pairA_end.point);
      } else if (pairB_valid) {
        return new Segment3DRealization3D(pairB_start.point, pairB_end.point);
      } else {
        // Neither pairing is consistent — infeasible
        return new Segment3DRealization3D(
          new Vector4(0, 0, 0, 1),
          new Vector4(1, 0, 0, 1),
          false
        );
      }
    } catch {
      return new Segment3DRealization3D(
        new Vector4(0, 0, 0, 1),
        new Vector4(1, 0, 0, 1),
        false
      );
    }
  }

  getDependencies(): string[] {
    return [this.projection1, this.projection2, this.plane1Id, this.plane2Id];
  }

  clone(): Segment3DFromProjections {
    return new Segment3DFromProjections(
      this.id,
      this.label,
      this.projection1,
      this.projection2,
      this.plane1Id,
      this.plane2Id,
      this.visualStyle ? { ...this.visualStyle } : createVisualStyle()
    );
  }

  /**
   * Validate that projections are on different planes
   * Called during creation to enforce Phase 78 requirement
   */
  static validateDifferentPlanes(plane1Id: string, plane2Id: string): boolean {
    return plane1Id !== plane2Id;
  }
}

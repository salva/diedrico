/**
 * Segment3D - 3D segment classes (domain layer - definitions)
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
 * - Lazy evaluation with caching in World.segmentRealizations3D
 * 
 * @see specs/001-dihedral-learning-mvp/data-model.md#segment3d
 */
import { Vector4 } from 'three';
import { Element3D } from './Element3D';
import { Segment3DRealization3D } from './Element3DRealization3D';
import type { World } from './World';
import type { VisualStyle } from './VisualStyle';
import { createVisualStyle } from './VisualStyle';

/**
 * Segment3DFromProjections - Segment derived from two 2D segment projections
 * User-created element (Phase 78)
 * 
 * Stores ONLY IDs of defining elements, no numeric data.
 * realize3D() reconstructs 3D segment from 2D projection coordinates.
 */
export class Segment3DFromProjections extends Element3D {
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

  realize3D(world: World): Segment3DRealization3D {
    try {
      // 1. Get 2D projections and their planes
      const plane1 = world.getProjectionPlaneById(this.plane1Id);
      const plane2 = world.getProjectionPlaneById(this.plane2Id);
      
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

      // 2. Realize 2D projections to get coordinates
      const seg1Real = seg1Element.realize2D(world);
      const seg2Real = seg2Element.realize2D(world);

      if (!seg1Real || !seg2Real || !seg1Real.isFeasible() || !seg2Real.isFeasible()) {
        return new Segment3DRealization3D(
          new Vector4(0, 0, 0, 1),
          new Vector4(1, 0, 0, 1),
          false
        );
      }

      // 3. Reconstruct 3D segment from two 2D projections
      // TODO: Implement GeometryUtils3D.reconstructSegmentFrom2Projections
      // For now, return a placeholder
      const startPoint = new Vector4(0, 0, 0, 1);
      const endPoint = new Vector4(1, 0, 0, 1);

      return new Segment3DRealization3D(startPoint, endPoint);
    } catch (error) {
      console.error('[Segment3DFromProjections] realize3D failed:', error);
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
      this.id!,
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

/**
 * Type union for all Segment3D types
 */
export type Segment3D = Segment3DFromProjections;

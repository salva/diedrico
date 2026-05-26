/**
 * Point3D - 3D point classes (domain layer - definitions)
 * 
 * Contains high-level definitions and relationships (IDs of source 2D elements).
 * NO numeric coordinates - those are computed and stored in Point3DRealization3D.
 * 
 * Types:
 * - Point3DByCoordinates: System element with fixed coordinates (e.g., origin O)
 * - Point3DFromProjections: User-created point from two 2D projections (Phase 78)
 * 
 * Architecture:
 * - Element3D classes store WHAT the element is (definition/rules)
 * - realize3D() computes numeric geometry → Point3DRealization3D
 * - Lazy evaluation with caching in World.pointRealizations3D
 * 
 */
import { Vector4 } from 'three';
import { Element3D } from './Element3D';
import { Point3DRealization3D } from './Element3DRealization3D';
import type { World } from './World';
import type { VisualStyle } from './VisualStyle';
import { createVisualStyle } from './VisualStyle';
import { reconstruct3DPointFromProjections } from '@/utils/threeUtils';

/**
 * Point3DByCoordinates - Point with explicit 3D coordinates
 * System element with fixed position (e.g., origin O)
 */
export class Point3DByCoordinates extends Element3D {
  readonly kind = 'Point3DByCoordinates';
  name: string;
  coordinates: Vector4;  // Position [x, y, z, 1] - stored as Vector4
  projectionH?: string;  // ID of projection on P_H
  projectionV?: string;  // ID of projection on P_V

  constructor(
    id: string,
    name: string,
    coordinates: Vector4,
    visualStyle: VisualStyle,
    projectionH?: string,
    projectionV?: string
  ) {
    super(id, undefined, visualStyle);  // Pass visualStyle to Element base constructor
    this.name = name;
    this.coordinates = coordinates;
    this.projectionH = projectionH;
    this.projectionV = projectionV;
  }

  realize3D(_world: World): Point3DRealization3D {
    // Return fixed coordinates as realization
    return new Point3DRealization3D(this.coordinates.clone());
  }

  getDependencies(): string[] {
    return [];  // No dependencies - coordinates are fixed
  }

  clone(): Point3DByCoordinates {
    return new Point3DByCoordinates(
      this.id!,
      this.name,
      this.coordinates.clone(),
      this.visualStyle ? { ...this.visualStyle } : createVisualStyle(),
      this.projectionH,
      this.projectionV
    );
  }
}

/**
 * Point3DFromProjections - Point derived from two 2D projections
 * User-created element (Phase 78)
 * 
 * Stores ONLY IDs of defining elements, no numeric data.
 * realize3D() reconstructs 3D position from 2D projection coordinates.
 */
export class Point3DFromProjections extends Element3D {
  readonly kind = 'Point3DFromProjections';
  label: string;
  
  // Defining relations (ONLY IDs, no numeric data)
  projection1: string;  // Point2D ID on first plane
  projection2: string;  // Point2D ID on second plane (must be different)
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

  realize3D(world: World): Point3DRealization3D {
    try {
      // 1. Get 2D projections and their planes
      const plane1 = world.getProjectionPlaneById(this.plane1Id);
      const plane2 = world.getProjectionPlaneById(this.plane2Id);
      
      if (!plane1 || !plane2) {
        return new Point3DRealization3D(new Vector4(0, 0, 0, 1), false);
      }

      const proj1Element = plane1.getPoint(this.projection1);
      const proj2Element = plane2.getPoint(this.projection2);
      
      if (!proj1Element || !proj2Element) {
        return new Point3DRealization3D(new Vector4(0, 0, 0, 1), false);
      }

      // 2. Realize 2D projections to get coordinates
      const proj1Realization = proj1Element.realize2D(world);
      const proj2Realization = proj2Element.realize2D(world);

      if (!proj1Realization.isFeasible() || !proj2Realization.isFeasible()) {
        return new Point3DRealization3D(new Vector4(0, 0, 0, 1), false);
      }

      // 3. Get plane realizations for projection matrices
      const plane1Real = world.getProjectionPlane3DRealization(this.plane1Id);
      const plane2Real = world.getProjectionPlane3DRealization(this.plane2Id);

      if (!plane1Real || !plane2Real) {
        return new Point3DRealization3D(new Vector4(0, 0, 0, 1), false);
      }

      // 4. Reconstruct 3D point using shared utility
      const result = reconstruct3DPointFromProjections(
        proj1Realization.position,
        proj2Realization.position,
        plane1Real.threeDToPlane,
        plane2Real.threeDToPlane
      );

      if (!result.feasible) {
        return new Point3DRealization3D(new Vector4(0, 0, 0, 1), false);
      }

      return new Point3DRealization3D(result.point);
    } catch (error) {
      console.error('[Point3DFromProjections] realize3D failed:', error);
      return new Point3DRealization3D(new Vector4(0, 0, 0, 1), false);
    }
  }

  getDependencies(): string[] {
    return [this.projection1, this.projection2, this.plane1Id, this.plane2Id];
  }

  clone(): Point3DFromProjections {
    return new Point3DFromProjections(
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

  /**
   * Validate geometric compatibility of projections
   * (perpendicular to hinge line requirement)
   * TODO: Implement proper validation in GeometryValidator
   */
  validateProjectionCompatibility(_world: World): boolean {
    // Placeholder - will be implemented with GeometryValidator
    return true;
  }
}

/**
 * Type union for all Point3D types
 */
export type Point3D = Point3DByCoordinates | Point3DFromProjections;

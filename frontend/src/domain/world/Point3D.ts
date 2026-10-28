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
 * - Lazy evaluation with caching owned by World's RealizationService
 * 
 */
import { Vector4 } from 'three';
import { Element3D } from './Element3D';
import { Point3DRealization3D } from './Element3DRealization3D';
import type { Element3DRealizationContext, ProjectionElementRealizationContext } from './projectionPlane/ProjectionPlaneContext';
import type { VisualStyle } from './VisualStyle';
import { createVisualStyle } from './VisualStyle';
import { applyMatrix4x3, reconstruct3DPointFromProjections } from '@/utils/threeUtils';

/**
 * Point3DByCoordinates - Point with explicit 3D coordinates
 * System element with fixed position (e.g., origin O)
 */
export class Point3DByCoordinates extends Element3D {
  /** Serialization/DTO discriminator only; runtime dispatch uses instanceof. */
  readonly kind = 'Point3DByCoordinates';
  /** Stable system-point name; Element.label stays optional user-facing display text. */
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

  realize3D(_context: Element3DRealizationContext): Point3DRealization3D {
    // Return fixed coordinates as realization
    return new Point3DRealization3D(this.coordinates.clone());
  }

  getDependencies(): string[] {
    return [];  // No dependencies - coordinates are fixed
  }

  clone(): Point3DByCoordinates {
    return new Point3DByCoordinates(
      this.id,
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
  /** Serialization/DTO discriminator only; runtime dispatch uses instanceof. */
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

  realize3D(context: Element3DRealizationContext): Point3DRealization3D {
    try {
      // 1. Get 2D projections and their planes
      const plane1 = context.getProjectionPlaneById(this.plane1Id);
      const plane2 = context.getProjectionPlaneById(this.plane2Id);
      
      if (!plane1 || !plane2) {
        return new Point3DRealization3D(new Vector4(0, 0, 0, 1), false);
      }

      const proj1Element = plane1.getPoint(this.projection1);
      const proj2Element = plane2.getPoint(this.projection2);
      
      if (!proj1Element || !proj2Element) {
        return new Point3DRealization3D(new Vector4(0, 0, 0, 1), false);
      }

      // 2. Realize 2D projections to get coordinates
      const proj1Realization = proj1Element.realize2D(context);
      const proj2Realization = proj2Element.realize2D(context);

      if (!proj1Realization.isFeasible() || !proj2Realization.isFeasible()) {
        return new Point3DRealization3D(new Vector4(0, 0, 0, 1), false);
      }

      // 3. Get plane realizations for projection matrices
      const plane1Real = context.getProjectionPlane3DRealization(this.plane1Id);
      const plane2Real = context.getProjectionPlane3DRealization(this.plane2Id);

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
    } catch {
      return new Point3DRealization3D(new Vector4(0, 0, 0, 1), false);
    }
  }

  getDependencies(): string[] {
    return [this.projection1, this.projection2, this.plane1Id, this.plane2Id];
  }

  clone(): Point3DFromProjections {
    return new Point3DFromProjections(
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

  /**
   * Validate geometric compatibility of projections
   * (perpendicular to hinge line requirement)
   * TODO: Implement proper validation in GeometryValidator
   */
  validateProjectionCompatibility(_context: ProjectionElementRealizationContext): boolean {
    // Placeholder - will be implemented with GeometryValidator
    return true;
  }
}

/**
 * Point3DFromProjectionOnPlane - Point lifted from a true projection plane.
 *
 * This is useful after an auxiliary projection plane has been folded into true
 * size: a 2D point drawn on that projection plane represents a concrete 3D
 * point on the underlying 3D plane.
 */
export class Point3DFromProjectionOnPlane extends Element3D {
  readonly kind = 'Point3DFromProjectionOnPlane';
  label: string;

  constructor(
    id: string,
    label: string,
    readonly projectionPointId: string,
    readonly planeId: string,
    visualStyle: VisualStyle
  ) {
    super(id, label, visualStyle);
    this.label = label;
  }

  realize3D(context: Element3DRealizationContext): Point3DRealization3D {
    const plane = context.getProjectionPlaneById(this.planeId);
    const point = plane?.getPoint(this.projectionPointId);
    const planeRealization = context.getProjectionPlane3DRealization(this.planeId);
    if (!point || !planeRealization?.feasible) {
      return Point3DRealization3D.infeasible();
    }

    const pointRealization = point.realize2D(context);
    if (!pointRealization.feasible) {
      return Point3DRealization3D.infeasible();
    }

    return new Point3DRealization3D(applyMatrix4x3(pointRealization.position, planeRealization.planeTo3D));
  }

  getDependencies(): string[] {
    return [this.projectionPointId, this.planeId];
  }

  clone(): Point3DFromProjectionOnPlane {
    return new Point3DFromProjectionOnPlane(
      this.id,
      this.label,
      this.projectionPointId,
      this.planeId,
      this.visualStyle ? { ...this.visualStyle } : createVisualStyle()
    );
  }
}

/**
 * Point3DByPlaneNormalOffset - Point obtained by lifting a foot point along a
 * plane normal by the length of an already constructed 2D segment.
 */
export class Point3DByPlaneNormalOffset extends Element3D {
  readonly kind = 'Point3DByPlaneNormalOffset';
  label: string;

  constructor(
    id: string,
    label: string,
    readonly footPoint3DId: string,
    readonly plane3DId: string,
    readonly distanceSegmentId: string,
    readonly distancePlaneId: string,
    readonly directionSign: 1 | -1,
    visualStyle: VisualStyle
  ) {
    super(id, label, visualStyle);
    this.label = label;
  }

  realize3D(context: Element3DRealizationContext): Point3DRealization3D {
    const contextWithPoints = context as Element3DRealizationContext & {
      get3DPointRealization(id: string): Point3DRealization3D | undefined;
    };
    const foot = contextWithPoints.get3DPointRealization?.(this.footPoint3DId);
    const plane = context.get3DPlaneRealization(this.plane3DId);
    const distancePlane = context.getProjectionPlaneById(this.distancePlaneId);
    const distanceSegment = distancePlane?.getLine(this.distanceSegmentId);

    if (!foot?.feasible || !plane?.feasible || !distanceSegment) {
      return Point3DRealization3D.infeasible();
    }

    const distanceRealization = distanceSegment.realize2D(context);
    if (!distanceRealization.feasible || !distanceRealization.isBounded()) {
      return Point3DRealization3D.infeasible();
    }

    const distance = distanceRealization.getLength();
    if (distance == null) {
      return Point3DRealization3D.infeasible();
    }

    const normal = plane.getNormalVector();
    const normalLength = Math.hypot(normal.x, normal.y, normal.z);
    if (normalLength < 1e-10) {
      return Point3DRealization3D.infeasible();
    }

    const scale = this.directionSign * distance / normalLength;
    return new Point3DRealization3D(new Vector4(
      foot.position.x + normal.x * scale,
      foot.position.y + normal.y * scale,
      foot.position.z + normal.z * scale,
      1
    ));
  }

  getDependencies(): string[] {
    return [this.footPoint3DId, this.plane3DId, this.distanceSegmentId, this.distancePlaneId];
  }

  clone(): Point3DByPlaneNormalOffset {
    return new Point3DByPlaneNormalOffset(
      this.id,
      this.label,
      this.footPoint3DId,
      this.plane3DId,
      this.distanceSegmentId,
      this.distancePlaneId,
      this.directionSign,
      this.visualStyle ? { ...this.visualStyle } : createVisualStyle()
    );
  }
}

/**
 * Type union for all Point3D types
 */
export type Point3D =
  | Point3DByCoordinates
  | Point3DFromProjections
  | Point3DFromProjectionOnPlane
  | Point3DByPlaneNormalOffset;

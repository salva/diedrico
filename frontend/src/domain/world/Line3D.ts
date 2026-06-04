/**
 * Line3D - 3D line classes (domain layer - definitions)
 * 
 * Contains high-level definitions and relationships (IDs of source 2D elements).
 * NO numeric coordinates - those are computed and stored in Line3DRealization3D.
 * 
 * Types:
 * - HingeLine: System line representing fold between projection planes (Phase 84)
 * - Line3DFromProjections: User-created line from two 2D line projections (Phase 78)
 * 
 * Architecture:
 * - Element3D classes store WHAT the element is (definition/rules)
 * - realize3D() computes numeric geometry → Line3DRealization3D
 * - Lazy evaluation with caching owned by World's RealizationStore
 * 
 */
import { Vector4 } from 'three';
import { Element3D } from './Element3D';
import { Line3DRealization3D } from './Element3DRealization3D';
import type { Element3DRealizationContext } from './projectionPlane/ProjectionPlaneContext';
import type { VisualStyle } from './VisualStyle';
import { createVisualStyle } from './VisualStyle';

/**
 * Line3D - Abstract base class for all 3D line types
 * 
 * All 3D lines must implement realize3D() to compute their geometric realization.
 * Subclasses store only defining relationships (IDs), never numeric coordinates.
 */
export abstract class Line3D extends Element3D {
  /**
   * Compute 3D geometric realization of this line
   * @param context Typed realization context for accessing related elements
   * @returns Line3DRealization3D with point and direction in 3D space
   */
  abstract realize3D(context: Element3DRealizationContext): Line3DRealization3D;
}

/**
 * Line3DFromProjections - Line derived from two 2D line projections
 * User-created element (Phase 78)
 * 
 * Stores ONLY IDs of defining elements, no numeric data.
 * realize3D() reconstructs 3D line from 2D projection coordinates.
 */
export class Line3DFromProjections extends Line3D {
  /** Serialization/DTO discriminator only; runtime dispatch uses instanceof. */
  readonly kind = 'Line3DFromProjections';
  label: string;
  
  // Defining relations (ONLY IDs, no numeric data)
  projection1: string;  // Line2D ID on first plane
  projection2: string;  // Line2D ID on second plane (must be different)
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

  realize3D(context: Element3DRealizationContext): Line3DRealization3D {
    try {
      // 1. Get 2D projections and their planes
      const plane1 = context.getProjectionPlaneById(this.plane1Id);
      const plane2 = context.getProjectionPlaneById(this.plane2Id);
      
      if (!plane1 || !plane2) {
        return new Line3DRealization3D(
          new Vector4(0, 0, 0, 1),
          new Vector4(1, 0, 0, 0),
          false
        );
      }

      const line1Element = plane1.getLine(this.projection1);
      const line2Element = plane2.getLine(this.projection2);
      
      if (!line1Element || !line2Element) {
        return new Line3DRealization3D(
          new Vector4(0, 0, 0, 1),
          new Vector4(1, 0, 0, 0),
          false
        );
      }

      // 2. Realize 2D projections to get coordinates
      const line1Real = line1Element.realize2D(context);
      const line2Real = line2Element.realize2D(context);

      if (!line1Real || !line2Real || !line1Real.isFeasible() || !line2Real.isFeasible()) {
        return new Line3DRealization3D(
          new Vector4(0, 0, 0, 1),
          new Vector4(1, 0, 0, 0),
          false
        );
      }

      // 3. Reconstruct 3D line from two 2D projections
      // Strategy: Each 2D line defines a 3D plane perpendicular to its projection plane
      // The 3D line is the intersection of these two 3D planes
      
      // Get plane realizations for transformations
      const plane1Real = plane1.realize3D(context);
      const plane2Real = plane2.realize3D(context);
      
      if (!plane1Real || !plane2Real) {
        return new Line3DRealization3D(
          new Vector4(0, 0, 0, 1),
          new Vector4(1, 0, 0, 0),
          false
        );
      }

      // Get a point and direction from each 2D line
      const p1_2d = line1Real.point1;  // Point on line 1 (in 2D plane coords)
      const d1_2d = line1Real.getDirection();  // Direction of line 1
      
      const p2_2d = line2Real.point1;  // Point on line 2 (in 2D plane coords)
      const d2_2d = line2Real.getDirection();  // Direction of line 2

      // Lift 2D lines to 3D planes
      // A 2D line (point + direction) in a projection plane defines a 3D plane
      // The 3D plane contains all 3D points that project onto the 2D line
      
      // For plane 1: Get the 3D line direction by lifting the 2D line
      // Matrix4x3 is stored row-major: [m11,m12,m13, m21,m22,m23, m31,m32,m33, m41,m42,m43]
      // Row 1 (x): M[0]*u + M[1]*v + M[2]*w
      // Row 2 (y): M[3]*u + M[4]*v + M[5]*w
      // Row 3 (z): M[6]*u + M[7]*v + M[8]*w
      // Row 4 (w): M[9]*u + M[10]*v + M[11]*w
      const M1 = plane1Real.planeTo3D.elements;  // Matrix4x3 stored row-major
      const P1_3d = new Vector4(
        M1[0] * p1_2d.x + M1[1] * p1_2d.y + M1[2],
        M1[3] * p1_2d.x + M1[4] * p1_2d.y + M1[5],
        M1[6] * p1_2d.x + M1[7] * p1_2d.y + M1[8],
        M1[9] * p1_2d.x + M1[10] * p1_2d.y + M1[11]
      );
      
      const p1_plus_d1 = { x: p1_2d.x + d1_2d.x, y: p1_2d.y + d1_2d.y };
      const P2_3d = new Vector4(
        M1[0] * p1_plus_d1.x + M1[1] * p1_plus_d1.y + M1[2],
        M1[3] * p1_plus_d1.x + M1[4] * p1_plus_d1.y + M1[5],
        M1[6] * p1_plus_d1.x + M1[7] * p1_plus_d1.y + M1[8],
        M1[9] * p1_plus_d1.x + M1[10] * p1_plus_d1.y + M1[11]
      );
      
      // Direction of the 2D line lifted to 3D
      const lineDir1_3d = new Vector4(
        P2_3d.x - P1_3d.x,
        P2_3d.y - P1_3d.y,
        P2_3d.z - P1_3d.z,
        0
      );
      
      // To find the normal to the 3D plane containing this line:
      // Extract the u-direction and v-direction from the projection plane matrix
      // In homogeneous coordinates:
      // - u-direction: what happens when u increases by 1 (keeping v=0, w=1)
      // - v-direction: what happens when v increases by 1 (keeping u=0, w=1)
      // Matrix is stored row-major: [m11,m12,m13, m21,m22,m23, m31,m32,m33, m41,m42,m43]
      // u-dir = [m11, m21, m31, m41] (first column)
      // v-dir = [m12, m22, m32, m42] (second column)
      const uDir1 = new Vector4(M1[0], M1[3], M1[6], M1[9]);
      const vDir1 = new Vector4(M1[1], M1[4], M1[7], M1[10]);
      
      // Perpendicular to projection plane = u × v
      const projPlanePerp1 = new Vector4(
        uDir1.y * vDir1.z - uDir1.z * vDir1.y,
        uDir1.z * vDir1.x - uDir1.x * vDir1.z,
        uDir1.x * vDir1.y - uDir1.y * vDir1.x,
        0
      );
      
      // Normal to the 3D plane = lineDir × projPlanePerp
      const N1 = new Vector4(
        lineDir1_3d.y * projPlanePerp1.z - lineDir1_3d.z * projPlanePerp1.y,
        lineDir1_3d.z * projPlanePerp1.x - lineDir1_3d.x * projPlanePerp1.z,
        lineDir1_3d.x * projPlanePerp1.y - lineDir1_3d.y * projPlanePerp1.x,
        0
      );
      
      // Similarly for plane 2
      const M2 = plane2Real.planeTo3D.elements;
      const Q1_3d = new Vector4(
        M2[0] * p2_2d.x + M2[1] * p2_2d.y + M2[2],
        M2[3] * p2_2d.x + M2[4] * p2_2d.y + M2[5],
        M2[6] * p2_2d.x + M2[7] * p2_2d.y + M2[8],
        M2[9] * p2_2d.x + M2[10] * p2_2d.y + M2[11]
      );
      
      const p2_plus_d2 = { x: p2_2d.x + d2_2d.x, y: p2_2d.y + d2_2d.y };
      const Q2_3d = new Vector4(
        M2[0] * p2_plus_d2.x + M2[1] * p2_plus_d2.y + M2[2],
        M2[3] * p2_plus_d2.x + M2[4] * p2_plus_d2.y + M2[5],
        M2[6] * p2_plus_d2.x + M2[7] * p2_plus_d2.y + M2[8],
        M2[9] * p2_plus_d2.x + M2[10] * p2_plus_d2.y + M2[11]
      );
      
      const lineDir2_3d = new Vector4(
        Q2_3d.x - Q1_3d.x,
        Q2_3d.y - Q1_3d.y,
        Q2_3d.z - Q1_3d.z,
        0
      );
      
      const uDir2 = new Vector4(M2[0], M2[3], M2[6], M2[9]);
      const vDir2 = new Vector4(M2[1], M2[4], M2[7], M2[10]);
      
      const projPlanePerp2 = new Vector4(
        uDir2.y * vDir2.z - uDir2.z * vDir2.y,
        uDir2.z * vDir2.x - uDir2.x * vDir2.z,
        uDir2.x * vDir2.y - uDir2.y * vDir2.x,
        0
      );
      
      const N2 = new Vector4(
        lineDir2_3d.y * projPlanePerp2.z - lineDir2_3d.z * projPlanePerp2.y,
        lineDir2_3d.z * projPlanePerp2.x - lineDir2_3d.x * projPlanePerp2.z,
        lineDir2_3d.x * projPlanePerp2.y - lineDir2_3d.y * projPlanePerp2.x,
        0
      );
      
      // Direction of 3D line = cross product of the two plane normals
      const direction3D = new Vector4(
        N1.y * N2.z - N1.z * N2.y,
        N1.z * N2.x - N1.x * N2.z,
        N1.x * N2.y - N1.y * N2.x,
        0  // Direction vector
      );
      
      const dirLength = Math.sqrt(
        direction3D.x * direction3D.x +
        direction3D.y * direction3D.y +
        direction3D.z * direction3D.z
      );

      if (dirLength < 1e-10) {
        return new Line3DRealization3D(
          new Vector4(0, 0, 0, 1),
          new Vector4(1, 0, 0, 0),
          false
        );
      }

      // Normalize direction
      direction3D.x /= dirLength;
      direction3D.y /= dirLength;
      direction3D.z /= dirLength;

      // Find a point on the 3D line (intersection of two planes)
      // Plane 1: N1·(P - P1) = 0  →  N1·P = N1·P1
      // Plane 2: N2·(P - Q1) = 0  →  N2·P = N2·Q1
      //
      // We have 2 equations with 3 unknowns. To find a specific point, we fix one coordinate.
      // Choose the coordinate where direction3D has the largest component for stability.
      
      const d1 = N1.x * P1_3d.x + N1.y * P1_3d.y + N1.z * P1_3d.z;  // Right-hand side for plane 1
      const d2 = N2.x * Q1_3d.x + N2.y * Q1_3d.y + N2.z * Q1_3d.z;  // Right-hand side for plane 2
      
      let point3D: Vector4;
      
      // Find which coordinate to fix based on largest direction component
      const absX = Math.abs(direction3D.x);
      const absY = Math.abs(direction3D.y);
      const absZ = Math.abs(direction3D.z);
      
      if (absZ >= absX && absZ >= absY) {
        // Fix z = 0, solve for x and y
        // N1.x * x + N1.y * y = d1 - N1.z * 0
        // N2.x * x + N2.y * y = d2 - N2.z * 0
        const det = N1.x * N2.y - N1.y * N2.x;
        if (Math.abs(det) < 1e-10) {
          return new Line3DRealization3D(
            new Vector4(0, 0, 0, 1),
            new Vector4(1, 0, 0, 0),
            false
          );
        }
        const x = (d1 * N2.y - d2 * N1.y) / det;
        const y = (N1.x * d2 - N2.x * d1) / det;
        point3D = new Vector4(x, y, 0, 1);
      } else if (absY >= absX) {
        // Fix y = 0, solve for x and z
        // N1.x * x + N1.z * z = d1
        // N2.x * x + N2.z * z = d2
        const det = N1.x * N2.z - N1.z * N2.x;
        if (Math.abs(det) < 1e-10) {
          return new Line3DRealization3D(
            new Vector4(0, 0, 0, 1),
            new Vector4(1, 0, 0, 0),
            false
          );
        }
        const x = (d1 * N2.z - d2 * N1.z) / det;
        const z = (N1.x * d2 - N2.x * d1) / det;
        point3D = new Vector4(x, 0, z, 1);
      } else {
        // Fix x = 0, solve for y and z
        // N1.y * y + N1.z * z = d1
        // N2.y * y + N2.z * z = d2
        const det = N1.y * N2.z - N1.z * N2.y;
        if (Math.abs(det) < 1e-10) {
          return new Line3DRealization3D(
            new Vector4(0, 0, 0, 1),
            new Vector4(1, 0, 0, 0),
            false
          );
        }
        const y = (d1 * N2.z - d2 * N1.z) / det;
        const z = (N1.y * d2 - N2.y * d1) / det;
        point3D = new Vector4(0, y, z, 1);
      }

      return new Line3DRealization3D(point3D, direction3D);
    } catch {
      return new Line3DRealization3D(
        new Vector4(0, 0, 0, 1),
        new Vector4(1, 0, 0, 0),
        false
      );
    }
  }

  getDependencies(): string[] {
    return [this.projection1, this.projection2, this.plane1Id, this.plane2Id];
  }

  clone(): Line3DFromProjections {
    return new Line3DFromProjections(
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

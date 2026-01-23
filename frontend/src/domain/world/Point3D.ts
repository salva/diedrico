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
 * @see specs/001-dihedral-learning-mvp/data-model.md#point3d
 */
import { Vector4 } from 'three';
import { Element3D } from './Element3D';
import { Point3DRealization3D } from './Element3DRealization3D';
import type { World } from './World';
import type { VisualStyle } from './VisualStyle';
import { createVisualStyle } from './VisualStyle';

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

      // 3. Reconstruct 3D point from two 2D projections
      // Get plane realizations to understand coordinate mappings
      const plane1Real = world.getProjectionPlane3DRealization(this.plane1Id);
      const plane2Real = world.getProjectionPlane3DRealization(this.plane2Id);

      if (!plane1Real || !plane2Real) {
        console.error('[Point3DFromProjections] Could not get plane realizations', {
          plane1Id: this.plane1Id,
          plane2Id: this.plane2Id,
          plane1Real: !!plane1Real,
          plane2Real: !!plane2Real
        });
        return new Point3DRealization3D(new Vector4(0, 0, 0, 1), false);
      }

      // Get 2D projection coordinates (u,v,1) in homogeneous form
      const pos1 = proj1Realization.position;  // (u₁, v₁, 1)
      const pos2 = proj2Realization.position;  // (u₂, v₂, 1)

      console.log('[Point3DFromProjections] Reconstructing from projections:', {
        plane1Id: this.plane1Id,
        plane2Id: this.plane2Id,
        pos1: { u: pos1.x, v: pos1.y },
        pos2: { u: pos2.x, v: pos2.y }
      });

      // Mathematical formulation:
      // Each projection gives us 2 equations relating (u,v) to (x,y,z):
      //
      // Plane 1: threeDToPlane₁ × [x,y,z,1]ᵀ = [u₁,v₁,1]ᵀ
      //   u₁ = a₁₁·x + a₁₂·y + a₁₃·z + a₁₄   (equation 1)
      //   v₁ = a₂₁·x + a₂₂·y + a₂₃·z + a₂₄   (equation 2)
      //
      // Plane 2: threeDToPlane₂ × [x,y,z,1]ᵀ = [u₂,v₂,1]ᵀ
      //   u₂ = b₁₁·x + b₁₂·y + b₁₃·z + b₁₄   (equation 3)
      //   v₂ = b₂₁·x + b₂₂·y + b₂₃·z + b₂₄   (equation 4)
      //
      // We have 4 equations with 3 unknowns (overdetermined system).
      //
      // Solution approach:
      // 1. Pick 3 equations (we'll use equations 1, 2, 3)
      // 2. Solve the 3×3 linear system for (x, y, z)
      // 3. Check if equation 4 is satisfied (consistency check)

      const M1 = plane1Real.threeDToPlane.elements;  // 3×4 matrix
      const M2 = plane2Real.threeDToPlane.elements;

      // Extract coefficients from threeDToPlane matrices
      // Matrix3x4 layout is ROW-MAJOR: [m11, m12, m13, m14, m21, m22, m23, m24, m31, m32, m33, m34]
      // Row 1 (u equation): elements[0..3]  → u = M[0]*x + M[1]*y + M[2]*z + M[3]
      // Row 2 (v equation): elements[4..7]  → v = M[4]*x + M[5]*y + M[6]*z + M[7]
      // Row 3 (unused):     elements[8..11] → 1 = M[8]*x + M[9]*y + M[10]*z + M[11]
      
      // Equation 1: u₁ = a₁₁·x + a₁₂·y + a₁₃·z + a₁₄
      const a11 = M1[0], a12 = M1[1], a13 = M1[2], a14 = M1[3];
      // Equation 2: v₁ = a₂₁·x + a₂₂·y + a₂₃·z + a₂₄
      const a21 = M1[4], a22 = M1[5], a23 = M1[6], a24 = M1[7];
      // Equation 3: u₂ = b₁₁·x + b₁₂·y + b₁₃·z + b₁₄
      const b11 = M2[0], b12 = M2[1], b13 = M2[2], b14 = M2[3];
      // Equation 4: v₂ = b₂₁·x + b₂₂·y + b₂₃·z + b₂₄
      const b21 = M2[4], b22 = M2[5], b23 = M2[6], b24 = M2[7];

      console.log('[Point3DFromProjections] Matrix coefficients:', {
        plane1_u: [a11, a12, a13, a14],
        plane1_v: [a21, a22, a23, a24],
        plane2_u: [b11, b12, b13, b14],
        plane2_v: [b21, b22, b23, b24]
      });

      // Smart equation selection strategy:
      // - Always use equations 1 and 2 from plane 1 (guaranteed independent)
      // - For the third equation, pick whichever from plane 2 gives largest |det|
      //   This maximizes numerical stability and avoids singular matrices

      // Try equation 3 (u₂ from plane 2)
      const A_with_eq3 = [
        a11, a12, a13,
        a21, a22, a23,
        b11, b12, b13
      ];
      const det3 = 
        A_with_eq3[0] * (A_with_eq3[4] * A_with_eq3[8] - A_with_eq3[5] * A_with_eq3[7]) -
        A_with_eq3[1] * (A_with_eq3[3] * A_with_eq3[8] - A_with_eq3[5] * A_with_eq3[6]) +
        A_with_eq3[2] * (A_with_eq3[3] * A_with_eq3[7] - A_with_eq3[4] * A_with_eq3[6]);

      // Try equation 4 (v₂ from plane 2)
      const A_with_eq4 = [
        a11, a12, a13,
        a21, a22, a23,
        b21, b22, b23
      ];
      const det4 = 
        A_with_eq4[0] * (A_with_eq4[4] * A_with_eq4[8] - A_with_eq4[5] * A_with_eq4[7]) -
        A_with_eq4[1] * (A_with_eq4[3] * A_with_eq4[8] - A_with_eq4[5] * A_with_eq4[6]) +
        A_with_eq4[2] * (A_with_eq4[3] * A_with_eq4[7] - A_with_eq4[4] * A_with_eq4[6]);

      console.log('[Point3DFromProjections] Determinants:', {
        'with_eq3_(u₂)': det3,
        'with_eq4_(v₂)': det4
      });

      // Pick the equation that gives larger |det| for better numerical stability
      const useEq3 = Math.abs(det3) > Math.abs(det4);
      const A = useEq3 ? A_with_eq3 : A_with_eq4;
      const det = useEq3 ? det3 : det4;
      const usedEquation = useEq3 ? '1,2,3 (u₁,v₁,u₂)' : '1,2,4 (u₁,v₁,v₂)';
      
      console.log(`[Point3DFromProjections] Using equations ${usedEquation}, |det| = ${Math.abs(det)}`);

      if (Math.abs(det) < 1e-10) {
        console.error('[Point3DFromProjections] Both determinants too small - planes may be parallel or degenerate');
        return new Point3DRealization3D(new Vector4(0, 0, 0, 1), false);
      }

      // Build right-hand side vector
      const b = useEq3 
        ? [pos1.x - a14, pos1.y - a24, pos2.x - b14]
        : [pos1.x - a14, pos1.y - a24, pos2.y - b24];

      // Solve using Cramer's rule
      const detX = 
        b[0] * (A[4] * A[8] - A[5] * A[7]) -
        A[1] * (b[1] * A[8] - A[5] * b[2]) +
        A[2] * (b[1] * A[7] - A[4] * b[2]);

      const detY = 
        A[0] * (b[1] * A[8] - A[5] * b[2]) -
        b[0] * (A[3] * A[8] - A[5] * A[6]) +
        A[2] * (A[3] * b[2] - b[1] * A[6]);

      const detZ = 
        A[0] * (A[4] * b[2] - b[1] * A[7]) -
        A[1] * (A[3] * b[2] - b[1] * A[6]) +
        b[0] * (A[3] * A[7] - A[4] * A[6]);

      const x = detX / det;
      const y = detY / det;
      const z = detZ / det;

      console.log('[Point3DFromProjections] Solution:', { x, y, z });

      // Verify consistency with the unused equation
      const checkCoeffs = useEq3 ? [b21, b22, b23, b24] : [b11, b12, b13, b14];
      const checkValue_actual = useEq3 ? pos2.y : pos2.x;
      const checkValue_computed = checkCoeffs[0] * x + checkCoeffs[1] * y + checkCoeffs[2] * z + checkCoeffs[3];
      const tolerance = 1e-6;

      console.log('[Point3DFromProjections] Consistency check (unused equation):', {
        equation: useEq3 ? 'eq4 (v₂)' : 'eq3 (u₂)',
        computed: checkValue_computed,
        actual: checkValue_actual,
        diff: Math.abs(checkValue_computed - checkValue_actual),
        tolerance,
        passes: Math.abs(checkValue_computed - checkValue_actual) <= tolerance
      });

      if (Math.abs(checkValue_computed - checkValue_actual) > tolerance) {
        console.warn(
          `[Point3DFromProjections] Inconsistent projections: ` +
          `unused equation failed check (expected ${checkValue_actual}, got ${checkValue_computed})`
        );
        return new Point3DRealization3D(new Vector4(0, 0, 0, 1), false);
      }

      const position3D = new Vector4(x, y, z, 1);

      console.log('[Point3DFromProjections] ✓ Success! Final 3D position:', { x, y, z });

      return new Point3DRealization3D(position3D);
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

/**
 * Guide2D - Guide line perpendicular to hinge line or BHL projection
 * 
 * Guides are special lines used in dihedral geometry for transporting
 * points and distances between projection planes.
 * 
 * Key properties:
 * - Always perpendicular to a reference line (hinge line or BHL projection)
 * - Pass through a user-specified point
 * - Belong to BOTH planes associated with the reference line
 * - Render as dashed lines extending to viewport edges
 * 
 * Design principles:
 * - Principle V: Homogeneous coordinates for perpendicular calculation
 * - Guides store DEFINITION (lineId, pointId), realization stores computed geometry
 * 
 * @see specs/001-dihedral-learning-mvp/data-model.md#guide
 * @see specs/001-dihedral-learning-mvp/spec.md#guides
 */

import { Vector3 } from 'three';
import { Line2DRealization } from './Line';

export type Guide2DType = 'perpendicular-to-line';

/**
 * Guide2DRealization - Stores computed guide line in parametric form
 * 
 * Same structure as Line2DRealization - guides are lines with special rendering.
 * Parametric form: P(t) = point + t * direction
 * 
 * Contains ONLY numeric data. Structural information (id, planeId) stays in domain objects.
 */
export class Guide2DRealization extends Line2DRealization {
  constructor(point: Vector3, direction: Vector3) {
    super(point, direction);
  }
}

/**
 * Base Guide2D class - represents the rule/definition of a guide
 */
export abstract class Guide2D {
  readonly id: string;
  readonly planeId: string;
  readonly label?: string;
  abstract readonly type: Guide2DType;

  constructor(id: string, planeId: string, label?: string) {
    this.id = id;
    this.planeId = planeId;
    this.label = label;
  }

  abstract clone(): Guide2D;

  /**
   * Calculate 2D realization - compute guide line geometry
   * @param getLine Function to retrieve line realizations by ID
   * @param getPoint Function to retrieve point positions by ID
   */
  abstract realize2D(
    getLine: (id: string) => Line2DRealization | null,
    getPoint: (id: string) => Vector3 | null
  ): Guide2DRealization | null;
}

/**
 * Guide2DPerpendicularToLine - Guide perpendicular to a reference line through a point
 * 
 * The rule is: "guide perpendicular to referenceLineId through throughPointId"
 * 
 * Implementation notes:
 * - Uses homogeneous coordinates for perpendicular calculation per Principle V
 * - Perpendicular direction in 2D: if line has direction (dx, dy), perpendicular is (-dy, dx)
 * - This is a 90-degree rotation, which works correctly in homogeneous coords
 */
export class Guide2DPerpendicularToLine extends Guide2D {
  readonly type: 'perpendicular-to-line' = 'perpendicular-to-line';
  readonly referenceLineId: string;  // Line to be perpendicular to (HL or BHL)
  readonly throughPointId: string;   // Point the guide passes through

  constructor(
    id: string,
    referenceLineId: string,
    throughPointId: string,
    planeId: string,
    label?: string
  ) {
    super(id, planeId, label);
    this.referenceLineId = referenceLineId;
    this.throughPointId = throughPointId;
  }

  clone(): Guide2DPerpendicularToLine {
    return new Guide2DPerpendicularToLine(
      this.id,
      this.referenceLineId,
      this.throughPointId,
      this.planeId,
      this.label
    );
  }

  /**
   * Calculate 2D realization - compute guide perpendicular to reference line
   * 
   * Algorithm:
   * 1. Get reference line's realization (point + direction)
   * 2. Compute perpendicular direction using 90-degree rotation
   * 3. Get the through-point position
   * 4. Return guide as line through the point with perpendicular direction
   * 
   * Perpendicular in 2D homogeneous coordinates:
   * - If line has direction (dx, dy, 0), perpendicular is (-dy, dx, 0)
   * - This is a counter-clockwise 90-degree rotation
   * - Works correctly with homogeneous coords (z=0 for direction vectors)
   */
  realize2D(
    getLine: (id: string) => Line2DRealization | null,
    getPoint: (id: string) => Vector3 | null
  ): Guide2DRealization | null {
    // Get reference line realization
    const referenceLine = getLine(this.referenceLineId);
    if (!referenceLine) {
      return null;  // Cannot compute guide without reference line
    }

    // Get through-point position
    const throughPoint = getPoint(this.throughPointId);
    if (!throughPoint) {
      return null;  // Cannot compute guide without through-point
    }

    // Compute perpendicular direction using 90-degree rotation
    // If line direction is (dx, dy, 0), perpendicular is (-dy, dx, 0)
    const lineDirection = referenceLine.direction;
    const perpendicularDirection = new Vector3(
      -lineDirection.y,  // -dy
      lineDirection.x,   // dx
      0                  // Direction vector, no translation
    );

    // Check for degenerate case (shouldn't happen if reference line is valid)
    if (perpendicularDirection.lengthSq() < 1e-10) {
      console.warn(`Guide ${this.id}: reference line has zero direction`);
      return null;
    }

    // Create guide realization: line through throughPoint with perpendicular direction
    return new Guide2DRealization(throughPoint.clone(), perpendicularDirection);
  }
}

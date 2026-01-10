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
import { Line2DPerpendicularToLine, Line2DRealization2D } from './Line';

/**
 * Guide2D - Guide line perpendicular to reference line (hinge line or BHL)
 * 
 * Guides are by definition perpendicular to a reference line and pass through a point.
 * They have special properties:
 * - Dashed rendering extending to viewport edges
 * - Dual plane membership (belong to both planes of the reference line)
 * - Used for transporting points and distances between planes
 * 
 * Extends Line2DPerpendicularToLine to inherit perpendicular line computation.
 */
export class Guide2D extends Line2DPerpendicularToLine {
  readonly type: 'perpendicular-to-line' = 'perpendicular-to-line';
  visible: boolean = true;  // Whether guide is visible in the canvas

  constructor(
    id: string,
    referenceLineId: string,
    throughPointId: string,
    planeId: string,
    label?: string
  ) {
    super(id, referenceLineId, throughPointId, planeId, label);
  }

  clone(): Guide2D {
    return new Guide2D(
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
   * 
   * NOTE: Guides use Line2DRealization2D directly per architectural principle.
   * Guides are lines with special rendering (dashed, dual-plane), but geometrically
   * they are simply lines. Type distinction happens at domain level (Guide2D), not
   * realization level. See data-model.md §Line2D Constructions.
   */
  realize2D(world: import('./World').World): Line2DRealization2D | null {
    // Get reference line realization from world
    const referenceLine = world.getLine2DRealization(this.referenceLineId);
    if (!referenceLine) {
      return null;  // Cannot compute guide without reference line
    }

    // Check if reference line is infeasible - propagate infeasibility
    if (!referenceLine.feasible) {
      console.warn('[Guide2DPerpendicularToLine] Reference line is infeasible, marking guide as infeasible');
      return new Line2DRealization2D(new Vector3(0, 0, 1), new Vector3(1, 0, 0), false);
    }

    // Get through-point realization from world
    const throughPointRealization = world.getPoint2DRealization(this.throughPointId);
    if (!throughPointRealization) {
      return null;  // Cannot compute guide without through-point
    }

    // Check if through-point is infeasible - propagate infeasibility
    if (!throughPointRealization.feasible) {
      console.warn('[Guide2DPerpendicularToLine] Through-point is infeasible, marking guide as infeasible');
      return new Line2DRealization2D(new Vector3(0, 0, 1), new Vector3(1, 0, 0), false);
    }

    // Compute perpendicular direction using 90-degree rotation
    // If line direction is (dx, dy, 0), perpendicular is (-dy, dx, 0)
    const lineDirection = referenceLine.getDirection();
    const perpendicularDirection = new Vector3(
      -lineDirection.y,  // -dy
      lineDirection.x,   // dx
      0                  // Direction vector, no translation
    );

    // Check for degenerate case (shouldn't happen if reference line is valid)
    if (perpendicularDirection.lengthSq() < 1e-10) {
      console.warn(`Guide ${this.id}: reference line has zero direction`);
      return new Line2DRealization2D(throughPointRealization.position.clone(), new Vector3(1, 0, 0), false);
    }

    // Create guide realization: line through throughPoint with perpendicular direction
    return new Line2DRealization2D(throughPointRealization.position.clone(), perpendicularDirection, true);
  }
}

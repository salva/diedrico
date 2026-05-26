/**
 * HalfHingeLineRealization2D - Realization of HalfHingeLine2D with guide vector
 * 
 * Extends Line2DRealization2D to include guideVector field - the direction for creating
 * guides perpendicular/parallel to this hinge line. This architectural decision keeps
 * guide direction logic in the realization (where geometric data belongs) rather than
 * in Guide2D (which shouldn't need to know about different hinge line types).
 * 
 * **Guide Direction by Hinge Line Type**:
 * - Regular HalfHingeLine2D: guideVector is PERPENDICULAR to hinge line
 *   (represents planes perpendicular to both projection planes)
 * - BrokenHalfHingeLine2D: guideVector is PARALLEL to main hinge T1
 *   (represents intersections with planes containing T1)
 * 
 * **Phase 101**: Broken Hinge Lines and Distance Transport Guides
 * - Guide2D simply uses realization.guideVector (no instanceof checks needed)
 * - Each hinge line type computes its appropriate guide direction
 * - Extensible: future hinge line variants can define their own guide directions
 * 
 */

import { Vector3 } from 'three';
import { Line2DRealization2D } from './Line';

/**
 * HalfHingeLineRealization2D - Adds guideVector to line realization
 * 
 * Contains:
 * - point1, point2: Line geometry (from Line2DRealization2D)
 * - guideVector: Direction for creating guides (perpendicular or parallel depending on type)
 * - feasible: Whether this realization is geometrically valid
 */
export class HalfHingeLineRealization2D extends Line2DRealization2D {
  readonly guideVector: Vector3;  // Direction for guide creation (z=0)

  constructor(
    point1: Vector3,
    point2: Vector3,
    guideVector: Vector3,
    feasible: boolean = true
  ) {
    super(point1, point2, feasible);
    
    // Ensure guideVector is a direction vector (z=0)
    if (guideVector.z !== 0) {
      this.guideVector = guideVector.clone();
      this.guideVector.z = 0;
    } else {
      this.guideVector = guideVector;
    }
  }

  /**
   * Create an infeasible half hinge line realization
   * Used when parent dependencies are infeasible
   */
  static createInfeasible(): HalfHingeLineRealization2D {
    return new HalfHingeLineRealization2D(
      new Vector3(0, 0, 1),   // Fallback point1
      new Vector3(1, 0, 0),   // Fallback point2 (direction)
      new Vector3(0, 1, 0),   // Fallback guideVector (perpendicular)
      false                   // infeasible
    );
  }

  /**
   * Get the guide vector (direction for creating guides)
   * 
   * This is used by Guide2DPerpendicularToLine to determine guide direction.
   * - For regular HalfHingeLine2D: perpendicular to hinge line
   * - For BrokenHalfHingeLine2D: parallel to main hinge T1
   * 
   * @returns Normalized guide direction
   */
  getGuideVector(): Vector3 {
    return this.guideVector.clone().normalize();
  }
}

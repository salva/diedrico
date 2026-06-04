/**
 * Realization - Abstract base class for ALL element realizations (2D and potential future 3D)
 * 
 * Realization classes contain ONLY geometric data resulting from computation:
 * - Position/shape/orientation data (coordinates, vectors, etc.)
 * - Feasibility status (whether computation succeeded)
 * 
 * Behavioral differences belong in domain classes (Element2D, Element3D).
 * 
 * **Phase 52**: Introduced as part of unified realization hierarchy to eliminate
 * duplication and enable uniform feasibility checking.
 * 
 * **Hierarchy**:
 *   Realization
 *   ├── Point2DRealization2D, Line2DRealization2D, Circle2DRealization2D
 *   └── Point3DRealization3D, Line3DRealization3D, Segment3DRealization3D, Plane3DRealization3D
 * 
 * **Design Principle: DRY + Architectural Symmetry**
 * - Mirrors Element base class pattern in realization layer
 * - All realizations share feasibility property
 * - Enables uniform feasibility checking
 * 
 * **Benefits**:
 * - **DRY Principle**: feasible property defined once, not duplicated in concrete realization classes
 * - **Uniform Interface**: isFeasible() method guaranteed to exist on all realizations
 * - **Type Safety**: Can write functions accepting Realization base type
 * - **Architectural Symmetry**: Realization hierarchy mirrors Element hierarchy
 * - **Generic Processing**: Infeasibility handling code can work with Realization base type
 * 
 * **Design Note**: Concrete 2D and 3D realization classes extend this base directly.
 * 
 */
export abstract class Realization {
  /**
   * Whether the geometric computation succeeded
   * 
   * Feasibility indicates whether the realization could be computed from the domain
   * element's definition. For example:
   * - Intersection of parallel lines → feasible = false
   * - Intersection of perpendicular lines → feasible = true
   * - Circle with negative radius → feasible = false
   * - Plane from parallel traces → feasible = false
   */
  readonly feasible: boolean;
  
  /**
   * Constructor for all element realizations
   * 
   * @param feasible - Whether the geometric computation succeeded (default: true)
   */
  constructor(feasible: boolean = true) {
    this.feasible = feasible;
  }
  
  /**
   * Check if this realization is feasible (geometric computation succeeded)
   * 
   * This method provides a uniform way to check feasibility across all realization types.
   * Infeasible realizations typically should not be rendered or used in further calculations.
   * 
   * @returns true if the realization is feasible, false otherwise
   */
  isFeasible(): boolean {
    return this.feasible;
  }
}

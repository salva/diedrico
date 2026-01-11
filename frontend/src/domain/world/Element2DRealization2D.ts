/**
 * Element2DRealization2D - Abstract base class for all 2D element realizations
 * 
 * @sealed - This class must not be subclassed by realization types other than
 * Point2DRealization2D, Line2DRealization2D, and Circle2DRealization2D
 * 
 * Architectural principle: All 2D element realizations share a common feasibility property.
 * This base class provides uniform feasibility checking across all realization types.
 * 
 * Design rationale:
 * - DRY principle: feasible property defined once, not duplicated in three classes
 * - Type safety: isFeasible() method guaranteed to exist on all realizations
 * - Generic processing: Code can work with Element2DRealization2D interface
 * - Architectural symmetry: Mirrors Element2D pattern in the realization layer
 * 
 * Realization classes contain ONLY geometric data (positions, vectors, feasibility).
 * All behavioral differences belong in domain classes (Point2D, Line2D, Circle2D).
 * 
 * @see specs/001-dihedral-learning-mvp/data-model.md#element2drealization2d-base-class
 */
export abstract class Element2DRealization2D {
  /**
   * Whether the geometric computation succeeded
   * 
   * Feasibility indicates whether the realization could be computed from the domain
   * element's definition. For example:
   * - Intersection of parallel lines → feasible = false
   * - Intersection of perpendicular lines → feasible = true
   * - Circle with negative radius → feasible = false
   */
  readonly feasible: boolean;

  /**
   * Constructor for all 2D element realizations
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

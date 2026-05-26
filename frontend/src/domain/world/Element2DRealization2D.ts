/**
 * Element2DRealization2D - Abstract base class for all 2D element realizations
 * 
 * @sealed - This class must not be subclassed by realization types other than
 * Point2DRealization2D, Line2DRealization2D, and Circle2DRealization2D
 * 
 * **Phase 44**: Originally introduced as standalone base class with feasible property.
 * 
 * **Phase 52 Refactoring**: Element2DRealization2D now extends Realization base class
 * to share feasible property with potential future 3D realizations.
 * 
 * Architectural principle: All 2D element realizations share a common feasibility property.
 * This base class provides uniform feasibility checking across all realization types.
 * 
 * Design rationale:
 * - DRY principle: feasible property defined in Realization base, not duplicated
 * - Type safety: isFeasible() method guaranteed to exist on all realizations
 * - Generic processing: Code can work with Realization interface
 * - Architectural symmetry: Mirrors Element → Element2D pattern in the realization layer
 * 
 * Realization classes contain ONLY geometric data (positions, vectors, feasibility).
 * All behavioral differences belong in domain classes (Point2D, Line2D, Circle2D).
 * 
 */
import { Realization } from './Realization';

export abstract class Element2DRealization2D extends Realization {
  /**
   * Constructor for all 2D element realizations
   * 
   * @param feasible - Whether the geometric computation succeeded (default: true)
   */
  constructor(feasible: boolean = true) {
    // Phase 52: Call Realization base constructor with feasible
    super(feasible);
  }
}

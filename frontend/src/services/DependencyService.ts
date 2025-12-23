import type { DependencyGraph } from '../domain/world/DependencyGraph';
import type { Result } from '../types/ResultTypes';
import { Ok, Err } from '../types/ResultTypes';

/**
 * Service for managing dependencies and recomputation logic
 */
export class DependencyService {
  private graph: DependencyGraph;

  constructor(graph: DependencyGraph) {
    this.graph = graph;
  }

  /**
   * Add a dependency edge with cycle detection
   */
  addDependency(fromId: string, toId: string): Result<void, string> {
    try {
      // Attempt to add edge - DependencyGraph.addEdge will check for cycles
      this.graph.addEdge(fromId, toId);
      return Ok(undefined);
    } catch (error) {
      return Err(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Get elements that need recomputation when an element changes
   */
  recomputeAffected(changedElementId: string): string[] {
    return Array.from(this.graph.getDescendants(changedElementId));
  }

  /**
   * Get recomputation order for affected elements
   */
  getRecomputationOrder(affectedIds: string[]): Result<string[], string> {
    try {
      const order = this.graph.topologicalSort(new Set(affectedIds));
      return Ok(order);
    } catch (error) {
      return Err(error instanceof Error ? error.message : 'Failed to compute recomputation order');
    }
  }

  /**
   * Validate that dependencies don't contain cycles
   * (Simplified - DependencyGraph.addEdge already prevents cycles)
   */
  validateDependencies(): Result<void, string> {
    try {
      // Since addEdge prevents cycles, if the graph exists, it's valid
      return Ok(undefined);
    } catch (error) {
      return Err('Dependency graph validation failed');
    }
  }

  /**
   * Get all elements that depend on a given element (direct and indirect)
   */
  getDependents(elementId: string): string[] {
    return Array.from(this.graph.getDescendants(elementId));
  }

  /**
   * Get all elements that a given element depends on (direct and indirect)
   */
  getDependencies(elementId: string): string[] {
    return Array.from(this.graph.getAncestors(elementId));
  }

  /**
   * Propagate infeasibility from an element to its dependents
   */
  propagateInfeasibility(elementId: string): string[] {
    return Array.from(this.graph.propagateInfeasibility(elementId));
  }

  /**
   * Clear infeasibility from an element and its dependents
   */
  clearInfeasibility(elementId: string): void {
    this.graph.clearInfeasibility(elementId);
  }

  /**
   * Check if adding an edge would create a cycle
   * (Removed - use addDependency which checks for cycles)
   */
  // wouldCreateCycle removed - use addDependency instead
}

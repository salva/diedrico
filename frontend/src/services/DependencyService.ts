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
      // Check for cycle before adding
      if (this.graph.wouldCreateCycle(fromId, toId)) {
        return Err(\`Adding edge from \${fromId} to \${toId} would create a cycle\`);
      }
      
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
    return this.graph.getDescendants(changedElementId);
  }

  /**
   * Get recomputation order for affected elements
   */
  getRecomputationOrder(affectedIds: string[]): Result<string[], string> {
    try {
      const order = this.graph.topologicalSort(affectedIds);
      return Ok(order);
    } catch (error) {
      return Err(error instanceof Error ? error.message : 'Failed to compute recomputation order');
    }
  }

  /**
   * Validate that dependencies don't contain cycles
   */
  validateDependencies(): Result<void, string> {
    // For a full validation, we'd need to check all edges
    // This is a simplified version that checks if the graph structure is valid
    try {
      // If we can get all nodes and they're in the graph, it's valid
      const allNodeIds = Array.from(this.graph['nodes'].keys());
      this.graph.topologicalSort(allNodeIds);
      return Ok(undefined);
    } catch (error) {
      return Err('Dependency graph contains cycles or invalid structure');
    }
  }

  /**
   * Get all elements that depend on a given element (direct and indirect)
   */
  getDependents(elementId: string): string[] {
    return this.graph.getDescendants(elementId);
  }

  /**
   * Get all elements that a given element depends on (direct and indirect)
   */
  getDependencies(elementId: string): string[] {
    return this.graph.getAncestors(elementId);
  }

  /**
   * Propagate infeasibility from an element to its dependents
   */
  propagateInfeasibility(elementId: string): string[] {
    return this.graph.propagateInfeasibility(elementId);
  }

  /**
   * Clear infeasibility from an element and its dependents
   */
  clearInfeasibility(elementId: string): void {
    this.graph.clearInfeasibility(elementId);
  }

  /**
   * Check if adding an edge would create a cycle
   */
  wouldCreateCycle(fromId: string, toId: string): boolean {
    return this.graph.wouldCreateCycle(fromId, toId);
  }
}

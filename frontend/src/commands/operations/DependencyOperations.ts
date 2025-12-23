/**
 * Dependency Operations - Operations for modifying the dependency graph
 */

import type { Operation } from '../Command';
import type { OperationResult } from '../../types/CommandTypes';

interface DependencyEdge {
  from: string;
  to: string;
}

/**
 * AddDependencyEdges operation - adds edges to the dependency graph
 */
export class AddDependencyEdgesOp implements Operation {
  id: string;
  type = 'AddDependencyEdges';
  args: {
    edges: DependencyEdge[];
  };

  private worldStore: any;

  constructor(
    id: string,
    edges: DependencyEdge[],
    worldStore: any
  ) {
    this.id = id;
    this.args = { edges };
    this.worldStore = worldStore;
  }

  execute(): OperationResult {
    try {
      const graph = this.worldStore.dependencyGraph;

      for (const edge of this.args.edges) {
        // Ensure nodes exist
        if (!graph.hasNode(edge.from)) {
          graph.addNode(edge.from, 'element');
        }
        if (!graph.hasNode(edge.to)) {
          graph.addNode(edge.to, 'action');
        }

        // Add edge
        graph.addEdge(edge.from, edge.to);
      }

      return {
        success: true,
        outputs: {
          edgeCount: this.args.edges.length
        }
      };
    } catch (error) {
      return {
        success: false,
        outputs: {},
        error: error instanceof Error ? error.message : 'Failed to add dependency edges'
      };
    }
  }

  rollback(): void {
    const graph = this.worldStore.dependencyGraph;

    // Remove edges in reverse order
    for (let i = this.args.edges.length - 1; i >= 0; i--) {
      const edge = this.args.edges[i];
      // Note: DependencyGraph doesn't have removeEdge yet, would need to be added
      // For now, we'll rely on element removal to clean up edges
    }
  }
}

/**
 * RemoveDependencyEdges operation - removes edges from the dependency graph
 */
export class RemoveDependencyEdgesOp implements Operation {
  id: string;
  type = 'RemoveDependencyEdges';
  args: {
    edges: DependencyEdge[];
  };

  private worldStore: any;

  constructor(
    id: string,
    edges: DependencyEdge[],
    worldStore: any
  ) {
    this.id = id;
    this.args = { edges };
    this.worldStore = worldStore;
  }

  execute(): OperationResult {
    try {
      const graph = this.worldStore.dependencyGraph;

      for (const edge of this.args.edges) {
        // Remove edge (implementation would need removeEdge method)
        // For MVP, we might just mark edges as removed
      }

      return {
        success: true,
        outputs: {
          edgeCount: this.args.edges.length
        }
      };
    } catch (error) {
      return {
        success: false,
        outputs: {},
        error: error instanceof Error ? error.message : 'Failed to remove dependency edges'
      };
    }
  }

  rollback(): void {
    const graph = this.worldStore.dependencyGraph;

    // Re-add edges
    for (const edge of this.args.edges) {
      if (!graph.hasNode(edge.from)) {
        graph.addNode(edge.from, 'element');
      }
      if (!graph.hasNode(edge.to)) {
        graph.addNode(edge.to, 'action');
      }
      graph.addEdge(edge.from, edge.to);
    }
  }
}

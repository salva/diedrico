/**
 * Directed Acyclic Graph for tracking element and action dependencies
 * Used for parametric recomputation and hover highlighting
 */

export type NodeId = string;  // ElementId or ActionId

export interface GraphNode {
  id: NodeId;
  type: 'element' | 'action';
  infeasible: boolean;
}

export class DependencyGraph {
  private nodes: Map<NodeId, GraphNode>;
  private edges: Map<NodeId, Set<NodeId>>;  // adjacency list: from -> to

  constructor() {
    this.nodes = new Map();
    this.edges = new Map();
  }

  /**
   * Add a node to the graph
   */
  addNode(id: NodeId, type: 'element' | 'action'): void {
    if (!this.nodes.has(id)) {
      this.nodes.set(id, { id, type, infeasible: false });
      this.edges.set(id, new Set());
    }
  }

  /**
   * Add a directed edge from -> to (to depends on from)
   */
  addEdge(from: NodeId, to: NodeId): void {
    if (!this.nodes.has(from)) {
      throw new Error(`Node ${from} not found`);
    }
    if (!this.nodes.has(to)) {
      throw new Error(`Node ${to} not found`);
    }

    // Check for cycles before adding
    if (this.wouldCreateCycle(from, to)) {
      throw new Error(`Adding edge ${from} -> ${to} would create a cycle`);
    }

    const fromEdges = this.edges.get(from);
    if (fromEdges) {
      fromEdges.add(to);
    }
  }

  /**
   * Remove a node and all its edges
   */
  removeNode(id: NodeId): void {
    // Remove node
    this.nodes.delete(id);

    // Remove outgoing edges
    this.edges.delete(id);

    // Remove incoming edges
    for (const edges of this.edges.values()) {
      edges.delete(id);
    }
  }

  /**
   * Get all ancestors (inputs) of a node via BFS
   */
  getAncestors(id: NodeId): Set<NodeId> {
    const ancestors = new Set<NodeId>();
    const queue: NodeId[] = [id];
    const visited = new Set<NodeId>();

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);

      // Find all nodes that point to current
      for (const [from, toSet] of this.edges.entries()) {
        if (toSet.has(current) && !visited.has(from)) {
          ancestors.add(from);
          queue.push(from);
        }
      }
    }

    return ancestors;
  }

  /**
   * Get all descendants (outputs) of a node via BFS
   */
  getDescendants(id: NodeId): Set<NodeId> {
    const descendants = new Set<NodeId>();
    const queue: NodeId[] = [id];
    const visited = new Set<NodeId>();

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);

      const edges = this.edges.get(current);
      if (edges) {
        for (const to of edges) {
          if (!visited.has(to)) {
            descendants.add(to);
            queue.push(to);
          }
        }
      }
    }

    return descendants;
  }

  /**
   * Topological sort of affected nodes for recomputation
   */
  topologicalSort(nodeIds: Set<NodeId>): NodeId[] {
    const result: NodeId[] = [];
    const visited = new Set<NodeId>();
    const temp = new Set<NodeId>();

    const visit = (id: NodeId): void => {
      if (visited.has(id)) return;
      if (temp.has(id)) {
        throw new Error('Cycle detected in dependency graph');
      }

      temp.add(id);

      const edges = this.edges.get(id);
      if (edges) {
        for (const to of edges) {
          if (nodeIds.has(to)) {
            visit(to);
          }
        }
      }

      temp.delete(id);
      visited.add(id);
      result.push(id);
    };

    for (const id of nodeIds) {
      if (!visited.has(id)) {
        visit(id);
      }
    }

    return result.reverse();
  }

  /**
   * Mark a node and all its descendants as infeasible
   */
  propagateInfeasibility(id: NodeId): Set<NodeId> {
    const affected = new Set<NodeId>([id]);
    const descendants = this.getDescendants(id);

    for (const descendantId of descendants) {
      affected.add(descendantId);
      const node = this.nodes.get(descendantId);
      if (node) {
        node.infeasible = true;
      }
    }

    const node = this.nodes.get(id);
    if (node) {
      node.infeasible = true;
    }

    return affected;
  }

  /**
   * Clear infeasibility flag for a node
   */
  clearInfeasibility(id: NodeId): void {
    const node = this.nodes.get(id);
    if (node) {
      node.infeasible = false;
    }
  }

  /**
   * Check if adding an edge would create a cycle
   */
  private wouldCreateCycle(from: NodeId, to: NodeId): boolean {
    // If 'to' can reach 'from', adding edge 'from' -> 'to' creates cycle
    const reachable = this.getDescendants(to);
    return reachable.has(from);
  }

  /**
   * Get node by id
   */
  getNode(id: NodeId): GraphNode | undefined {
    return this.nodes.get(id);
  }

  /**
   * Check if node exists
   */
  hasNode(id: NodeId): boolean {
    return this.nodes.has(id);
  }

  /**
   * Get all nodes
   */
  getAllNodes(): GraphNode[] {
    return Array.from(this.nodes.values());
  }

  /**
   * Clear the entire graph
   */
  clear(): void {
    this.nodes.clear();
    this.edges.clear();
  }
}

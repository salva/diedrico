/**
 * DependencyService.ts
 * 
 * Service for tracking and querying element dependencies in the process tree.
 * Enables parametric behavior by maintaining relationships between base and derived elements.
 * 
 * Dependency Tracking:
 * - Every constructive action records inputs (dependencies) and outputs (produced elements)
 * - Bidirectional lookup: find what depends on an element AND what an element depends on
 * - Circular dependency detection to prevent invalid construction graphs
 * 
 * Parametric Updates:
 * - When base element changes, all dependent elements are invalidated and recomputed
 * - Cascading updates propagate through dependency chains
 * 
 * Reference: specs/001-dihedral-learning-mvp/spec.md §Parametric Behavior and Dependencies
 * Reference: specs/001-dihedral-learning-mvp/data-model.md §ProcessTree
 */

import type { ProcessTree, ActionNode, ProcessNode, Subprocess, ActionGroup } from '../domain/processTree/ProcessTree';

/**
 * Dependency graph edge representing input-output relationship
 */
export interface DependencyEdge {
  fromElementId: string;  // Input (base element)
  toElementId: string;    // Output (derived element)
  actionId: string;       // Action that created the relationship
}

/**
 * Element dependency information
 */
export interface ElementDependencies {
  dependencies: string[];   // Elements this depends on (inputs)
  dependents: string[];     // Elements that depend on this (outputs)
}

/**
 * Service for managing element dependencies
 */
export class DependencyService {
  private processTree: ProcessTree;
  
  // Cached dependency maps for fast lookup
  private dependentsMap: Map<string, Set<string>> = new Map();  // elementId -> set of elements that depend on it
  private dependenciesMap: Map<string, Set<string>> = new Map(); // elementId -> set of elements it depends on
  
  constructor(processTree: ProcessTree) {
    this.processTree = processTree;
    this.rebuildDependencyMaps();
  }

  /**
   * Rebuild dependency maps from process tree
   * Call this after process tree modifications
   */
  rebuildDependencyMaps(): void {
    this.dependentsMap.clear();
    this.dependenciesMap.clear();
    
    // Traverse process tree and extract dependencies from all actions
    this.traverseTree(this.processTree.root, (node: ProcessNode) => {
      if (node.type === 'action') {
        const action = node as ActionNode;
        
        // For each output element, record its dependencies (inputs)
        for (const outputId of action.outputs) {
          if (!this.dependenciesMap.has(outputId)) {
            this.dependenciesMap.set(outputId, new Set());
          }
          for (const inputId of action.inputs) {
            this.dependenciesMap.get(outputId)!.add(inputId);
          }
        }
        
        // For each input element, record what depends on it (outputs)
        for (const inputId of action.inputs) {
          if (!this.dependentsMap.has(inputId)) {
            this.dependentsMap.set(inputId, new Set());
          }
          for (const outputId of action.outputs) {
            this.dependentsMap.get(inputId)!.add(outputId);
          }
        }
      }
    });
  }

  /**
   * Get all elements that depend on the given element
   * Returns immediate dependents only (not transitive closure)
   * 
   * @param elementId - Element to query
   * @returns Array of element IDs that directly depend on this element
   */
  getDependents(elementId: string): string[] {
    const dependents = this.dependentsMap.get(elementId);
    return dependents ? Array.from(dependents) : [];
  }

  /**
   * Get all elements that the given element depends on
   * Returns immediate dependencies only (not transitive closure)
   * 
   * @param elementId - Element to query
   * @returns Array of element IDs that this element directly depends on
   */
  getDependencies(elementId: string): string[] {
    const dependencies = this.dependenciesMap.get(elementId);
    return dependencies ? Array.from(dependencies) : [];
  }

  /**
   * Get all elements in the transitive closure of dependents
   * (all elements that directly or indirectly depend on the given element)
   * 
   * @param elementId - Element to query
   * @returns Array of all element IDs in dependency chain
   */
  getAllDependents(elementId: string): string[] {
    const visited = new Set<string>();
    const queue: string[] = [elementId];
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      const directDependents = this.getDependents(current);
      
      for (const dependent of directDependents) {
        if (!visited.has(dependent)) {
          visited.add(dependent);
          queue.push(dependent);
        }
      }
    }
    
    return Array.from(visited);
  }

  /**
   * Get all elements in the transitive closure of dependencies
   * (all elements this element directly or indirectly depends on)
   * 
   * @param elementId - Element to query
   * @returns Array of all element IDs in dependency chain
   */
  getAllDependencies(elementId: string): string[] {
    const visited = new Set<string>();
    const queue: string[] = [elementId];
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      const directDependencies = this.getDependencies(current);
      
      for (const dependency of directDependencies) {
        if (!visited.has(dependency)) {
          visited.add(dependency);
          queue.push(dependency);
        }
      }
    }
    
    return Array.from(visited);
  }

  /**
   * Check if adding a dependency would create a cycle
   * Used during command validation to prevent circular dependencies
   * 
   * @param fromElementId - Base element (input)
   * @param toElementId - Derived element (output)
   * @returns true if adding this dependency would create a cycle
   */
  wouldCreateCycle(fromElementId: string, toElementId: string): boolean {
    // If toElementId already depends on fromElementId (directly or indirectly),
    // then adding fromElementId -> toElementId would create a cycle
    const allDependencies = this.getAllDependencies(fromElementId);
    return allDependencies.includes(toElementId);
  }

  /**
   * Get elements to delete in proper order for cascade deletion
   * Returns elements sorted in reverse topological order (dependents before dependencies)
   * 
   * CRITICAL for cascade deletion: Elements MUST be deleted in this order to maintain
   * referential integrity during the deletion process.
   * 
   * Algorithm:
   * 1. Compute dependency depth for each element (max distance from leaves)
   * 2. Sort by depth descending (higher depth = more dependents = delete first)
   * 
   * Example: Point P, Line L (depends on P)
   * - L has depth 0 (no dependents)
   * - P has depth 1 (L depends on it)
   * - Result: [L, P] - delete line before point
   * 
   * @param elementIds - Element IDs to delete (user selection)
   * @returns Array of element IDs in deletion order (dependents first, roots last)
   */
  getElementsInDeletionOrder(elementIds: string[]): string[] {
    // Collect all elements to delete (selected + cascaded dependents)
    const allElements = new Set<string>();
    for (const elementId of elementIds) {
      allElements.add(elementId);
      const dependents = this.getAllDependents(elementId);
      dependents.forEach(dep => allElements.add(dep));
    }

    // Compute dependency depth for each element
    const depths = new Map<string, number>();
    
    const computeDepth = (elementId: string, visited: Set<string>): number => {
      if (depths.has(elementId)) {
        return depths.get(elementId)!;
      }
      
      if (visited.has(elementId)) {
        // Circular dependency - shouldn't happen but handle gracefully
        return 0;
      }
      
      visited.add(elementId);
      
      // Depth = 1 + max(depth of all dependents)
      const directDependents = this.getDependents(elementId);
      let maxDepth = 0;
      
      for (const dependentId of directDependents) {
        if (allElements.has(dependentId)) {
          const depDepth = computeDepth(dependentId, visited);
          maxDepth = Math.max(maxDepth, depDepth + 1);
        }
      }
      
      depths.set(elementId, maxDepth);
      visited.delete(elementId);
      
      return maxDepth;
    };
    
    // Compute depths for all elements
    for (const elementId of allElements) {
      computeDepth(elementId, new Set());
    }
    
    // Sort by depth descending (higher depth = has more dependents = delete first)
    return Array.from(allElements).sort((a, b) => {
      const depthA = depths.get(a) || 0;
      const depthB = depths.get(b) || 0;
      return depthB - depthA; // Descending order
    });
  }

  /**
   * Get dependency edges for a specific action
   * 
   * @param actionId - Action ID to query
   * @returns Array of dependency edges created by this action
   */
  getActionDependencies(actionId: string): DependencyEdge[] {
    const edges: DependencyEdge[] = [];
    
    this.traverseTree(this.processTree.root, (node: ProcessNode) => {
      if (node.type === 'action' && node.id === actionId) {
        const action = node as ActionNode;
        for (const inputId of action.inputs) {
          for (const outputId of action.outputs) {
            edges.push({
              fromElementId: inputId,
              toElementId: outputId,
              actionId: action.id
            });
          }
        }
      }
    });
    
    return edges;
  }

  /**
   * Get full dependency information for an element
   * 
   * @param elementId - Element to query
   * @returns Complete dependency information
   */
  getElementDependencies(elementId: string): ElementDependencies {
    return {
      dependencies: this.getDependencies(elementId),
      dependents: this.getDependents(elementId)
    };
  }

  /**
   * Invalidate realizations for an element and all its dependents
   * Used when an element changes to trigger parametric updates
   * 
   * @param elementId - Element that changed
   * @param invalidateCallback - Function to invalidate realization cache for each element
   */
  invalidateCascade(elementId: string, invalidateCallback: (id: string) => void): void {
    console.log(`[DependencyService.invalidateCascade] Starting from: ${elementId}`);
    
    // Invalidate the changed element
    console.log(`[DependencyService.invalidateCascade]   [0] Invalidating: ${elementId} (source)`);
    invalidateCallback(elementId);
    
    // Get all transitive dependents
    const allDependents = this.getAllDependents(elementId);
    console.log(`[DependencyService.invalidateCascade]   Found ${allDependents.length} dependent(s) to invalidate`);
    
    // Invalidate each dependent with depth tracking
    const visited = new Set<string>([elementId]);
    const queue: { id: string; depth: number }[] = [{ id: elementId, depth: 0 }];
    
    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;
      const directDependents = Array.from(this.dependentsMap.get(id) || []);
      
      for (const dependentId of directDependents) {
        if (!visited.has(dependentId)) {
          visited.add(dependentId);
          console.log(`[DependencyService.invalidateCascade]   [${depth + 1}] Invalidating: ${dependentId} (depends on ${id})`);
          invalidateCallback(dependentId);
          queue.push({ id: dependentId, depth: depth + 1 });
        }
      }
    }
    
    console.log(`[DependencyService.invalidateCascade] Complete. Total invalidated: ${visited.size}`);
  }

  /**
   * Trace invalidation propagation from a changed element
   * Shows the cascading invalidation path through the dependency graph
   * 
   * @param elementId - Element that changed
   * @returns Array of invalidation layers showing the propagation order
   */
  traceInvalidation(elementId: string): { elementId: string; depth: number }[] {
    console.log('=== INVALIDATION PROPAGATION TRACE ===');
    console.log(`Starting from: ${elementId}`);
    console.log('');
    
    const trace: { elementId: string; depth: number }[] = [];
    const visited = new Set<string>();
    const queue: { id: string; depth: number }[] = [{ id: elementId, depth: 0 }];
    
    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;
      
      if (visited.has(id)) continue;
      visited.add(id);
      
      const indent = '  '.repeat(depth);
      const dependents = Array.from(this.dependentsMap.get(id) || []);
      
      console.log(`${indent}[Depth ${depth}] ${id}`);
      if (dependents.length > 0) {
        console.log(`${indent}  → Invalidates ${dependents.length} dependent(s):`);
        dependents.forEach(depId => {
          console.log(`${indent}    • ${depId}`);
        });
      } else {
        console.log(`${indent}  → (leaf element - no dependents)`);
      }
      
      trace.push({ elementId: id, depth });
      
      // Add dependents to queue for next level
      for (const depId of dependents) {
        if (!visited.has(depId)) {
          queue.push({ id: depId, depth: depth + 1 });
        }
      }
    }
    
    console.log('');
    console.log(`Total elements invalidated: ${trace.length}`);
    console.log('=== END INVALIDATION TRACE ===');
    
    return trace;
  }

  /**
   * Dump the full dependency graph to console
   * Useful for debugging dependency tracking issues
   * 
   * @param filterPrefix - Optional prefix to filter element IDs (e.g., "proj_plane_" to see only projection planes)
   */
  dumpDependencyGraph(filterPrefix?: string): void {
    console.log('=== DEPENDENCY GRAPH ===');
    console.log(`Total elements tracked: ${this.dependenciesMap.size}`);
    console.log('');
    
    // Sort element IDs for consistent output
    const allElementIds = Array.from(new Set([
      ...this.dependenciesMap.keys(),
      ...this.dependentsMap.keys()
    ])).sort();
    
    const filtered = filterPrefix 
      ? allElementIds.filter(id => id.startsWith(filterPrefix))
      : allElementIds;
    
    for (const elementId of filtered) {
      const dependencies = Array.from(this.dependenciesMap.get(elementId) || []).sort();
      const dependents = Array.from(this.dependentsMap.get(elementId) || []).sort();
      
      console.log(`Element: ${elementId}`);
      if (dependencies.length > 0) {
        console.log(`  Depends on (${dependencies.length}):`);
        dependencies.forEach(dep => console.log(`    <- ${dep}`));
      } else {
        console.log(`  Depends on: (none - base element)`);
      }
      
      if (dependents.length > 0) {
        console.log(`  Depended on by (${dependents.length}):`);
        dependents.forEach(dep => console.log(`    -> ${dep}`));
      } else {
        console.log(`  Depended on by: (none - leaf element)`);
      }
      console.log('');
    }
    
    console.log('=== END DEPENDENCY GRAPH ===');
  }

  /**
   * Traverse process tree depth-first, calling visitor for each node
   * 
   * @param node - Current node
   * @param visitor - Function to call for each node
   */
  private traverseTree(node: ProcessNode, visitor: (node: ProcessNode) => void): void {
    // Skip null nodes (tombstones from removed actions)
    if (!node) return;
    
    visitor(node);
    
    if (node.type === 'subprocess') {
      const subprocess = node as Subprocess;
      for (const child of subprocess.children) {
        this.traverseTree(child, visitor);
      }
    } else if (node.type === 'actionGroup') {
      const group = node as ActionGroup;
      for (const action of group.children) {
        // Skip null entries (tombstones)
        if (action) {
          visitor(action);
        }
      }
    }
  }
}

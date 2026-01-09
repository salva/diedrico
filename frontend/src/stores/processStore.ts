import { defineStore } from 'pinia';
import type { Process } from '../domain/processTree/Process';




































































































}  }    return this.graph.wouldCreateCycle(fromId, toId);  wouldCreateCycle(fromId: string, toId: string): boolean {   */   * Check if adding an edge would create a cycle  /**  }    this.graph.clearInfeasibility(elementId);  clearInfeasibility(elementId: string): void {   */   * Clear infeasibility from an element and its dependents  /**  }    return this.graph.propagateInfeasibility(elementId);  propagateInfeasibility(elementId: string): string[] {   */   * Propagate infeasibility from an element to its dependents  /**  }    return this.graph.getAncestors(elementId);  getDependencies(elementId: string): string[] {   */   * Get all elements that a given element depends on (direct and indirect)  /**  }    return this.graph.getDescendants(elementId);  getDependents(elementId: string): string[] {   */   * Get all elements that depend on a given element (direct and indirect)  /**  }    }      return Err('Dependency graph contains cycles or invalid structure');    } catch (error) {      return Ok(undefined);      this.graph.topologicalSort(allNodeIds);      const allNodeIds = Array.from(this.graph['nodes'].keys());      // If we can get all nodes and they're in the graph, it's valid    try {    // This is a simplified version that checks if the graph structure is valid    // For a full validation, we'd need to check all edges  validateDependencies(): Result<void, string> {   */   * Validate that dependencies don't contain cycles  /**  }    }      return Err(error instanceof Error ? error.message : 'Failed to compute recomputation order');    } catch (error) {      return Ok(order);      const order = this.graph.topologicalSort(affectedIds);    try {  getRecomputationOrder(affectedIds: string[]): Result<string[], string> {   */   * Get recomputation order for affected elements  /**  }    return this.graph.getDescendants(changedElementId);  recomputeAffected(changedElementId: string): string[] {   */   * Get elements that need recomputation when an element changes  /**  }    }      return Err(error instanceof Error ? error.message : 'Unknown error');    } catch (error) {      return Ok(undefined);      this.graph.addEdge(fromId, toId);            }        return Err(`Adding edge from ${fromId} to ${toId} would create a cycle`);      if (this.graph.wouldCreateCycle(fromId, toId)) {      // Check for cycle before adding    try {  addDependency(fromId: string, toId: string): Result<void, string> {   */   * Add a dependency edge with cycle detection  /**  }    this.graph = graph;  constructor(graph: DependencyGraph) {  private graph: DependencyGraph;export class DependencyService { */ * Service for managing dependencies and recomputation logic/**import { Ok, Err } from '../types/ResultTypes';import type { Subprocess } from '../domain/processTree/Subprocess';
import type { ActionGroup } from '../domain/processTree/ActionGroup';
import type { ConstructiveAction } from '../domain/processTree/Action';
import { createProcess } from '../domain/processTree/Process';
import { CommandStack } from '../commands/CommandStack';

interface ProcessState {
  root: Process;
  commandHistory: CommandStack;
}

export const useProcessStore = defineStore('process', {
  state: (): ProcessState => ({
    root: createProcess(),
    commandHistory: new CommandStack()
  }),

  getters: {
    /**
     * Get node by path (e.g., "/subprocess/sp1/actionGroup/ag1")
     */
    getNodeByPath: (state) => (path: string): Subprocess | ActionGroup | ConstructiveAction | null => {
      const parts = path.split('/').filter(Boolean);
      let current: any = state.root;

      for (let i = 0; i < parts.length; i += 2) {
        const type = parts[i];
        const id = parts[i + 1];

        if (type === 'subprocess') {
          current = current.children?.find((c: any) => c.id === id);
        } else if (type === 'actionGroup') {
          current = current.children?.find((c: any) => c.id === id);
        } else if (type === 'action') {
          current = current.children?.find((c: any) => c.id === id);
        }

        if (!current) return null;
      }

      return current;
    },

    /**
     * Get all visible subprocesses (recursive)
     */
    visibleSubprocesses: (state) => {
      const result: Subprocess[] = [];
      const traverse = (subprocess: Subprocess) => {
        if (subprocess.visible) {
          result.push(subprocess);
          subprocess.children.forEach(child => {
            if ('visible' in child) {
              traverse(child as Subprocess);
            }
          });
        }
      };
      state.root.children.forEach(child => {
        if ('visible' in child) {
          traverse(child as Subprocess);
        }
      });
      return result;
    },

    /**
     * Get all actions (flat array)
     */
    allActions: (state) => {
      const result: ConstructiveAction[] = [];
      const traverse = (node: Subprocess | ActionGroup) => {
        node.children.forEach(child => {
          if ('type' in child && child.type === 'action') {
            result.push(child as ConstructiveAction);
          } else if ('children' in child) {
            traverse(child as Subprocess | ActionGroup);
          }
        });
      };
      // Start from root's children (which are Subprocess or ActionGroup)
      state.root.children.forEach(child => {
        if ('children' in child) {
          traverse(child as Subprocess | ActionGroup);
        }
      });
      return result;
    }
  },

  actions: {
    /**
     * Add subprocess to parent path
     */
    addSubprocess(parentPath: string, subprocess: Subprocess): void {
      const parent = this.getNodeByPath(parentPath) as Subprocess;
      if (parent && 'children' in parent) {
        parent.children.push(subprocess);
      } else if (parentPath === '/') {
        this.root.children.push(subprocess);
      }
    },

    /**
     * Add action group to subprocess
     */
    addActionGroup(subprocessPath: string, actionGroup: ActionGroup): void {
      const subprocess = this.getNodeByPath(subprocessPath) as Subprocess;
      if (subprocess && 'children' in subprocess) {
        subprocess.children.push(actionGroup);
      }
    },

    /**
     * Add action to action group
     */
    addAction(actionGroupPath: string, action: ConstructiveAction): void {
      const actionGroup = this.getNodeByPath(actionGroupPath) as ActionGroup;
      if (actionGroup && 'children' in actionGroup) {
        actionGroup.children.push(action);
      }
    },

    /**
     * Remove subprocess by path
     */
    removeSubprocess(subprocessPath: string): Subprocess | null {
      const parts = subprocessPath.split('/').filter(Boolean);
      const id = parts[parts.length - 1];
      const parentPath = '/' + parts.slice(0, -2).join('/');

      const parent = parentPath === '/' ? this.root : this.getNodeByPath(parentPath) as Subprocess;
      if (parent && 'children' in parent) {
        const index = parent.children.findIndex((c: any) => c.id === id);
        if (index !== -1) {
          const removed = parent.children.splice(index, 1)[0];
          return removed as Subprocess;
        }
      }
      return null;
    },

    /**
     * Remove action group by path
     */
    removeActionGroup(actionGroupPath: string): ActionGroup | null {
      const parts = actionGroupPath.split('/').filter(Boolean);
      const id = parts[parts.length - 1];
      const parentPath = '/' + parts.slice(0, -2).join('/');

      const parent = this.getNodeByPath(parentPath) as Subprocess;
      if (parent && 'children' in parent) {
        const index = parent.children.findIndex((c: any) => c.id === id);
        if (index !== -1) {
          const removed = parent.children.splice(index, 1)[0];
          return removed as ActionGroup;
        }
      }
      return null;
    },

    /**
     * Remove action by path
     */
    removeAction(actionPath: string): ConstructiveAction | null {
      const parts = actionPath.split('/').filter(Boolean);
      const id = parts[parts.length - 1];
      const parentPath = '/' + parts.slice(0, -2).join('/');

      const parent = this.getNodeByPath(parentPath) as ActionGroup;
      if (parent && 'children' in parent) {
        const index = parent.children.findIndex((c: any) => c.id === id);
        if (index !== -1) {
          const removed = parent.children.splice(index, 1)[0];
          return removed as ConstructiveAction;
        }
      }
      return null;
    },

    /**
     * Clear process tree (for testing or reset)
     */
    clear(): void {
      this.root = createProcess();
      this.commandHistory.clear();
    }
  }
});

/**
 * processTreeStore — Centralized collapse state for the process tree
 * 
 * Phase 118: Fixes the bug where adding elements expands all subprocesses.
 * Collapse state is stored externally (keyed by node ID) so it survives
 * Vue component recreation during tree mutations.
 * 
 * Behavior:
 * - "World Initialization" subprocess defaults to collapsed
 * - All other subprocesses default to expanded
 * - User toggles are preserved across tree mutations
 * - When a new element is added, only the receiving subprocess is ensured expanded
 */

import { ref } from 'vue';

/** Set of node IDs that are currently collapsed */
const collapsedNodes = ref(new Set<string>());

/** Nodes whose collapse state has been explicitly set by user or system */
const explicitlySet = ref(new Set<string>());

export function useProcessTreeStore() {
  /**
   * Check if a node is collapsed.
   * Nodes that haven't been explicitly toggled use the default:
   * - "World Initialization" → collapsed
   * - Everything else → expanded
   */
  function isCollapsed(nodeId: string, nodeName?: string): boolean {
    if (explicitlySet.value.has(nodeId)) {
      return collapsedNodes.value.has(nodeId);
    }
    // Default: only "World Initialization" starts collapsed
    return nodeName === 'World Initialization';
  }

  /**
   * Toggle collapse state for a node.
   */
  function toggleCollapse(nodeId: string): void {
    explicitlySet.value.add(nodeId);
    if (collapsedNodes.value.has(nodeId)) {
      collapsedNodes.value.delete(nodeId);
    } else {
      collapsedNodes.value.add(nodeId);
    }
    // Trigger reactivity
    collapsedNodes.value = new Set(collapsedNodes.value);
    explicitlySet.value = new Set(explicitlySet.value);
  }

  /**
   * Reset all collapse state (for testing or re-initialization).
   */
  function reset(): void {
    collapsedNodes.value = new Set<string>();
    explicitlySet.value = new Set<string>();
  }

  return {
    isCollapsed,
    toggleCollapse,
    reset,
  };
}

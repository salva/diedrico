<template>
  <aside class="actions-panel">
    <header class="panel-header">
      <h2 class="panel-title">Construction History</h2>
      <div class="header-controls">
        <!-- Stack management buttons -->
        <div class="stack-controls">
          <button 
            class="stack-btn stack-pop-btn"
            :disabled="!canPop"
            @click="popSubprocess"
            :title="canPop ? 'Close current subprocess (Ctrl+Shift+[)' : 'Cannot close root'"
            aria-label="Pop subprocess from stack"
          >
            &lt;
          </button>
          <button 
            class="stack-btn stack-push-btn"
            @click="pushSubprocess"
            title="Create and enter new subprocess (Ctrl+Shift+])"
            aria-label="Push subprocess to stack"
          >
            &gt;
          </button>
        </div>
      </div>
    </header>

    <!-- Process Tree -->
    <div class="process-tree" ref="treeContainer">
      <ProcessTreeNode
        :node="processTree.value.root"
        :data-version="treeVersion"
        :selected-node-id="selectedNodeId"
        :active-subprocess-id="activeSubprocessId"
        :related-action-ids="relatedActionIds"
        @select-node="handleNodeSelect"
        @toggle-encapsulate="handleToggleEncapsulate"
        @toggle-output="handleToggleOutput"
        @highlight-elements="(...args) => emit('highlightElements', ...args)"
        @clear-highlight="emit('clearHighlight')"
        @rename-node="handleRenameNode"
      />
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed, inject, onMounted, onUnmounted, watch, nextTick } from 'vue';
import type { World } from '@/domain/world/World';
import type { ProcessTreeNode as ProcessTreeNodeType } from '@/domain/processTree/ProcessTreeNode';
import type { CommandStack } from '@/commands/CommandStack';
import { Command } from '@/commands/Command';
import { PushSubprocessOp } from '@/commands/operations/processTree/PushSubprocessOp';
import { PopSubprocessOp } from '@/commands/operations/processTree/PopSubprocessOp';
import { RenameSubprocessOp } from '@/commands/operations/processTree/RenameSubprocessOp';
import { ToggleEncapsulationOp } from '@/commands/operations/processTree/ToggleEncapsulationOp';
import { ToggleOutputOp } from '@/commands/operations/processTree/ToggleOutputOp';
import ProcessTreeNode from './ProcessTreeNode.vue';
import { useSelectionStore } from '@/stores/selectionStore';

// Emits
const emit = defineEmits<{
  highlightElements: [elementIds: string[], temporary: boolean];
  clearHighlight: [];
}>();

// Injected dependencies
const world = inject<World>('world')!;
const commandStack = inject<CommandStack>('commandStack')!;

// Selection store
const selectionStore = useSelectionStore();

// Local state
const treeContainer = ref<HTMLElement | null>(null);
const selectedNodeId = ref<string | null>(null);
const relatedActionIds = ref<Set<string>>(new Set());
const stackVersion = ref(0); // Track stack changes
const lastNodeCount = ref(0); // Track number of nodes for auto-scroll
const worldVersion = ref(0); // Track world changes (for processTree re-fetching)

// Get current ProcessTree (reactive to world changes)
// We use a computed to get fresh ProcessTree after world.clear()
const processTree = computed(() => {
  worldVersion.value; // Depend on world version to re-fetch after clear()
  return world.getProcessTree();
});

// Stack management computed properties
const canPop = computed(() => {
  stackVersion.value; // Depend on stack changes
  return processTree.value.getStackDepth() > 1;
});
const activeSubprocessId = computed(() => {
  stackVersion.value; // Depend on stack changes
  return processTree.value.getCurrentSubprocess().id;
});

// Watch ProcessTree version for reactivity, triggered by stackVersion changes
const treeVersion = computed(() => {
  // Depend on stackVersion to trigger updates when push/pop occurs
  stackVersion.value;
  worldVersion.value; // Also depend on world version
  return processTree.value.getVersion();
});

// Keyboard shortcuts for stack management
function handleKeyDown(event: KeyboardEvent) {
  if (event.ctrlKey && event.shiftKey) {
    if (event.key === '[') {
      event.preventDefault();
      popSubprocess();
    } else if (event.key === ']') {
      event.preventDefault();
      pushSubprocess();
    }
  }
}

// Subscription cleanup
let unsubscribeTree: (() => void) | null = null;

function scrollToBottom() {
  if (treeContainer.value) {
    treeContainer.value.scrollTop = treeContainer.value.scrollHeight;
  }
}

onMounted(() => {
  console.log('[ActionsPanel] Mounted, processTree.value.root:', processTree.value.root);
  console.log('[ActionsPanel] Root children count:', processTree.value.root.children.length);
  
  // Register keyboard shortcuts
  window.addEventListener('keydown', handleKeyDown);
  
  // Subscribe to world changes to detect when clear() creates new ProcessTree
  world.subscribe(() => {
    console.log('[ActionsPanel] World changed, incrementing worldVersion');
    worldVersion.value++;
  });
});

// Watch worldVersion to re-subscribe when ProcessTree changes (after world.clear())
watch(
  worldVersion,
  () => {
    console.log('[ActionsPanel] worldVersion changed, re-subscribing to ProcessTree');
    
    // Unsubscribe from old tree
    if (unsubscribeTree) {
      unsubscribeTree();
    }
    
    // Get fresh ProcessTree reference
    const tree = processTree.value;
    
    // Initialize node count
    lastNodeCount.value = countNodes(tree.root);
    
    // Subscribe to new tree
    unsubscribeTree = tree.subscribe(() => {
      console.log('[ActionsPanel] ProcessTree changed! New root children:', tree.root.children.length);
      // Check if structure grew
      const currentCount = countNodes(tree.root);
      const shouldScroll = currentCount > lastNodeCount.value;
      lastNodeCount.value = currentCount;

      stackVersion.value++;
      console.log('[ActionsPanel] stackVersion incremented to:', stackVersion.value);

      if (shouldScroll) {
        nextTick(() => {
          scrollToBottom();
        });
      }
    });
  },
  { immediate: true }  // Subscribe immediately on mount
);

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
  if (unsubscribeTree) {
    unsubscribeTree();
  }
});

// Watch selection changes and find related actions
watch(
  () => selectionStore.selectedIdsArray,
  (selectedIds) => {
    if (selectedIds.length === 0) {
      // No selection, clear related actions
      relatedActionIds.value.clear();
    } else {
      // Find actions related to selected elements
      findRelatedActions(selectedIds);
    }
  },
  { immediate: true }
);

/**
 * Find actions that have any of the selected element IDs in their inputs or outputs
 */
function findRelatedActions(selectedIds: string[]): void {
  const related = new Set<string>();
  const selectedIdSet = new Set(selectedIds);

  // Get all actions from process tree
  const allActions = processTree.value.getAllActions();

  // Check each action's elementId and dependencies (Phase 92)
  for (const action of allActions) {
    // Check if action produces any selected element
    const producesSelected = selectedIdSet.has(action.elementId);
    
    // Check if action depends on any selected element
    // Dependencies are now in DependencyService, accessible via element
    const dependsOnSelected = world && world.dependencyService 
      ? world.dependencyService.getDependencies(action.elementId).some(depId => selectedIdSet.has(depId))
      : false;

    if (producesSelected || dependsOnSelected) {
      related.add(action.id);
    }
  }

  relatedActionIds.value = related;
}

/**
 * Recursively count total nodes in the tree
 */
function countNodes(node: ProcessTreeNodeType): number {
  let count = 1;
  if (node.children) {
    for (const child of node.children) {
      if (child) {
        count += countNodes(child);
      }
    }
  }
  return count;
}

// Stack management handlers
function pushSubprocess() {
  const subprocessName = `Subprocess ${Date.now()}`;
  const cmd = new Command('Push subprocess', world);
  cmd.addAndExecute(new PushSubprocessOp(subprocessName));
  cmd.commit();
  commandStack.push(cmd);
  stackVersion.value++; // Trigger UI update
}

function popSubprocess() {
  if (canPop.value) {
    const cmd = new Command('Pop subprocess', world);
    cmd.addAndExecute(new PopSubprocessOp());
    cmd.commit();
    commandStack.push(cmd);
    stackVersion.value++; // Trigger UI update
  }
}

// Handle node selection
function handleNodeSelect(nodeId: string) {
  selectedNodeId.value = nodeId === selectedNodeId.value ? null : nodeId;
}

// Handle encapsulation toggle
function handleToggleEncapsulate(nodeId: string) {
  const cmd = new Command('Toggle subprocess encapsulation', world);
  cmd.addAndExecute(new ToggleEncapsulationOp(nodeId));
  cmd.commit();
  commandStack.push(cmd);
  stackVersion.value++; // Force UI update
}

// Handle output toggle
function handleToggleOutput(nodeId: string) {
  const cmd = new Command('Toggle output status', world);
  cmd.addAndExecute(new ToggleOutputOp(nodeId));
  cmd.commit();
  commandStack.push(cmd);
  stackVersion.value++; // Force UI update
}

// Handle subprocess rename
function handleRenameNode(nodeId: string, newName: string) {
  const cmd = new Command('Rename subprocess', world);
  cmd.addAndExecute(new RenameSubprocessOp(nodeId, newName));
  cmd.commit();
  commandStack.push(cmd);
  stackVersion.value++; // Force UI update
}
</script>


<style scoped>
.actions-panel {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #f8f9fa;
  border-right: 1px solid #dee2e6;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  background-color: #fff;
  border-bottom: 1px solid #dee2e6;
}

.panel-title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #212529;
}

.header-controls {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.stack-controls {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 0.125rem;
}

.stack-btn {
  width: 28px;
  height: 28px;
  padding: 0;
  background: #fff;
  color: #4f46e5;
  border: 1px solid #dee2e6;
  border-radius: 3px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
  line-height: 1;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stack-btn:hover:not(:disabled) {
  background: #4f46e5;
  color: white;
  border-color: #4f46e5;
}

.stack-btn:active:not(:disabled) {
  transform: scale(0.95);
}

.stack-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  color: #6c757d;
}

.process-tree {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}
</style>

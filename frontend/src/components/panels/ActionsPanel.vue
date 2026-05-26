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
        v-if="processTree"
        :node="processTree.root"
        :world="world"
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
import type { ProcessNode as ProcessTreeNodeType } from '@/domain/processTree/ProcessTree';
import { createProcessHistoryController } from '@/application/processHistory/ProcessHistoryController';
import ProcessTreeNode from './ProcessTreeNode.vue';
import { useSelectionStore } from '@/stores/selectionStore';
import { useProcessTreeStore } from '@/stores/processTreeStore';

// Emits
const emit = defineEmits<{
  highlightElements: [elementIds: string[], temporary: boolean];
  clearHighlight: [];
}>();

// Injected dependencies
const world = inject<World>('world')!;
const processHistoryController = createProcessHistoryController({
  world,
  commandStack: inject<unknown>('commandStack')
});

// Selection store
const selectionStore = useSelectionStore();
const processTreeStore = useProcessTreeStore();

// Local state
const treeContainer = ref<HTMLElement | null>(null);
const selectedNodeId = ref<string | null>(null);
const relatedActionIds = ref<Set<string>>(new Set());
const stackVersion = ref(0); // Track stack changes
const lastNodeCount = ref(0); // Track number of nodes for auto-scroll

// Get current ProcessTree - use reactive ref that we update when World changes
const processTree = ref(world.getProcessTree());

// Stack management computed properties
const canPop = computed(() => {
  stackVersion.value; // Depend on stack changes
  return processHistoryController.getState().canPop;
});
const activeSubprocessId = computed(() => {
  stackVersion.value; // Depend on stack changes
  return processHistoryController.getState().activeSubprocessId;
});

// Watch ProcessTree version for reactivity, triggered by stackVersion changes
const treeVersion = computed(() => {
  // Depend on stackVersion to trigger updates when push/pop occurs
  stackVersion.value;
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
let unsubscribeWorld: (() => void) | null = null;

function scrollToBottom() {
  if (treeContainer.value) {
    treeContainer.value.scrollTop = treeContainer.value.scrollHeight;
  }
}

function refreshAfterTreeChange(ensureExpandedForActiveSubprocess: boolean) {
  const currentCount = countNodes(processTree.value.root);
  const shouldScroll = currentCount > lastNodeCount.value;
  lastNodeCount.value = currentCount;

  stackVersion.value++;

  if (shouldScroll && ensureExpandedForActiveSubprocess) {
    processTreeStore.ensureExpanded(processTree.value.getCurrentSubprocess().id);
  }

  if (shouldScroll) {
    nextTick(() => {
      scrollToBottom();
    });
  }
}

function subscribeToCurrentProcessTree(ensureExpandedForActiveSubprocess: boolean) {
  unsubscribeTree = processTree.value.subscribe(() => {
    refreshAfterTreeChange(ensureExpandedForActiveSubprocess);
  });
}

function handleWorldChange() {
  if (unsubscribeTree) {
    unsubscribeTree();
  }

  processTree.value = world.getProcessTree();
  lastNodeCount.value = countNodes(processTree.value.root);
  subscribeToCurrentProcessTree(false);
  stackVersion.value++;
}

onMounted(() => {
  // Register keyboard shortcuts
  window.addEventListener('keydown', handleKeyDown);

  // Initialize node count
  lastNodeCount.value = countNodes(processTree.value.root);

  // Subscribe to ProcessTree changes
  subscribeToCurrentProcessTree(true);

  // Subscribe to World changes to detect when clear() creates new ProcessTree
  world.subscribeToChanges(handleWorldChange);
  unsubscribeWorld = () => world.unsubscribeFromChanges(handleWorldChange);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
  if (unsubscribeTree) {
    unsubscribeTree();
  }
  if (unsubscribeWorld) {
    unsubscribeWorld();
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
    const dependsOnSelected = world
      .getDependencyService()
      .getDependencies(action.elementId)
      .some(depId => selectedIdSet.has(depId));

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
  if (node.type === 'action') {
    return count;
  }

  for (const child of node.children) {
    if (child) {
      count += countNodes(child);
    }
  }
  return count;
}

function refreshAfterIntent() {
  stackVersion.value++;
}

// Stack management handlers
function pushSubprocess() {
  processHistoryController.pushSubprocess();
  refreshAfterIntent();
}

function popSubprocess() {
  if (canPop.value) {
    processHistoryController.popSubprocess();
    refreshAfterIntent();
  }
}

// Handle node selection
function handleNodeSelect(nodeId: string) {
  selectedNodeId.value = nodeId === selectedNodeId.value ? null : nodeId;
}

// Handle encapsulation toggle
function handleToggleEncapsulate(nodeId: string) {
  processHistoryController.toggleEncapsulation({ nodeId });
  refreshAfterIntent();
}

// Handle output toggle
function handleToggleOutput(nodeId: string) {
  processHistoryController.toggleOutput({ nodeId });
  refreshAfterIntent();
}

// Handle subprocess rename
function handleRenameNode(nodeId: string, newName: string) {
  processHistoryController.renameSubprocess({ nodeId, newName });
  refreshAfterIntent();
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

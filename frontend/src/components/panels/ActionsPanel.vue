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
        :data-version="stackVersion"
        :selected-node-id="selectedNodeId"
        :active-subprocess-id="activeSubprocessId"
        :related-action-ids="relatedActionIds"
        @select-node="handleNodeSelect"
        @toggle-encapsulate="handleToggleEncapsulate"
        @toggle-output="handleToggleOutput"
        @rename-node="handleRenameNode"
      />
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed, inject, onMounted, onUnmounted, watch } from 'vue';
import { ProcessHistoryCommandInjectionKey, ProcessTreeReadInjectionKey } from '@/application/appShell/RuntimeInjectionKeys';
import ProcessTreeNode from './ProcessTreeNode.vue';
import { useSelectionStore } from '@/stores/selectionStore';

// Injected dependencies
const processTreeReadPort = inject(ProcessTreeReadInjectionKey);
if (!processTreeReadPort) {
  throw new Error('Process tree read port not provided');
}

const processTreeReadPortRequired = processTreeReadPort;const injectedProcessHistoryController = inject(ProcessHistoryCommandInjectionKey);
if (!injectedProcessHistoryController) {
  throw new Error('Process history command port not provided');
}
const processHistoryController = injectedProcessHistoryController;

// Selection store
const selectionStore = useSelectionStore();

// Local state
const selectedNodeId = ref<string | null>(null);
const relatedActionIds = ref<Set<string>>(new Set());
const stackVersion = ref(0);

// Get current ProcessTree - use reactive ref that we update when World changes
const processTree = ref(processTreeReadPortRequired.getTree());

// Stack management computed properties
const canPop = computed(() => {
  stackVersion.value; // Depend on stack changes
  return processHistoryController.getState().canPop;
});
const activeSubprocessId = computed(() => {
  stackVersion.value; // Depend on stack changes
  return processHistoryController.getState().activeSubprocessId;
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
let unsubscribeWorld: (() => void) | null = null;

function handleWorldChange() {
  processTree.value = processTreeReadPortRequired.getTree();
  stackVersion.value++;
}

onMounted(() => {
  // Register keyboard shortcuts
  window.addEventListener('keydown', handleKeyDown);

  // Subscribe to World changes to detect when state changes (undo/redo, new actions, etc.)
  processTreeReadPortRequired.subscribeToChanges(handleWorldChange);
  unsubscribeWorld = () => processTreeReadPortRequired.unsubscribeFromChanges(handleWorldChange);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
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

function findRelatedActions(selectedIds: string[]): void {
  relatedActionIds.value = processTreeReadPortRequired.getRelatedActionIds(selectedIds);
}

// Stack management handlers
function pushSubprocess() {
  processHistoryController.pushSubprocess();
}

function popSubprocess() {
  if (canPop.value) {
    processHistoryController.popSubprocess();
  }
}

// Handle node selection
function handleNodeSelect(nodeId: string) {
  selectedNodeId.value = nodeId === selectedNodeId.value ? null : nodeId;
}

// Handle encapsulation toggle
function handleToggleEncapsulate(nodeId: string) {
  processHistoryController.toggleEncapsulation({ nodeId });
}

// Handle output toggle
function handleToggleOutput(nodeId: string) {
  processHistoryController.toggleOutput({ nodeId });
}

// Handle subprocess rename
function handleRenameNode(nodeId: string, newName: string) {
  processHistoryController.renameSubprocess({ nodeId, newName });
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

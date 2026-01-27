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
          <div class="stack-info" :title="stackPathTooltip">
            {{ stackDepth }}
          </div>
          <button 
            class="stack-btn stack-push-btn"
            @click="pushSubprocess"
            title="Create and enter new subprocess (Ctrl+Shift+])"
            aria-label="Push subprocess to stack"
          >
            &gt;
          </button>
        </div>
        <button 
          class="add-subprocess-btn"
          @click="showAddSubprocessDialog = true"
          title="Add new subprocess"
        >
          + Subprocess
        </button>
      </div>
    </header>

    <!-- Process Tree -->
    <div class="process-tree" :key="treeVersion + forceUpdate">
      <ProcessTreeNode
        :node="processTree.root"
        :selected-node-id="selectedNodeId"
        :active-subprocess-id="activeSubprocessId"
        :related-action-ids="relatedActionIds"
        @select-node="handleNodeSelect"
        @toggle-visibility="handleToggleVisibility"
        @highlight-elements="(...args) => emit('highlightElements', ...args)"
        @clear-highlight="emit('clearHighlight')"
      />
    </div>

    <!-- Add Subprocess Dialog -->
    <dialog v-if="showAddSubprocessDialog" class="add-subprocess-dialog" open>
      <h3>New Subprocess</h3>
      <input
        v-model="newSubprocessName"
        type="text"
        placeholder="Subprocess name"
        @keyup.enter="addSubprocess"
      />
      <div class="dialog-actions">
        <button @click="addSubprocess">Create</button>
        <button @click="showAddSubprocessDialog = false">Cancel</button>
      </div>
    </dialog>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed, inject, onMounted, onUnmounted, watch } from 'vue';
import type { World } from '@/domain/world/World';
import type { CommandStack } from '@/commands/CommandStack';
import { Command } from '@/commands/Command';
import { PushSubprocessOp } from '@/commands/operations/processTree/PushSubprocessOp';
import { PopSubprocessOp } from '@/commands/operations/processTree/PopSubprocessOp';
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
const processTree = world.getProcessTree();

// Selection store
const selectionStore = useSelectionStore();

// Local state
const selectedNodeId = ref<string | null>(null);
const showAddSubprocessDialog = ref(false);
const newSubprocessName = ref('');
const relatedActionIds = ref<Set<string>>(new Set());

// Stack management computed properties
const stackDepth = computed(() => processTree.getStackDepth());
const canPop = computed(() => stackDepth.value > 1);
const stackPath = computed(() => processTree.getStackPath());
const stackPathTooltip = computed(() => stackPath.value.join(' / '));
const activeSubprocessId = computed(() => processTree.getCurrentSubprocess().id);

// Watch ProcessTree version for reactivity
const treeVersion = computed(() => processTree.getVersion());

// Force re-render when tree changes by polling version
let intervalId: number | null = null;
const forceUpdate = ref(0);
let lastVersion = processTree.getVersion();
let isUpdating = false;

onMounted(() => {
  intervalId = window.setInterval(() => {
    // Skip update if already in progress to avoid race conditions
    if (isUpdating) {
      return;
    }
    
    // Check if tree version actually changed
    const currentVersion = processTree.getVersion();
    if (currentVersion !== lastVersion) {
      lastVersion = currentVersion;
      isUpdating = true;
      
      // Use nextTick to ensure DOM is stable before triggering re-render
      Promise.resolve().then(() => {
        forceUpdate.value++;
        isUpdating = false;
      });
    }
  }, 100);
  
  // Register keyboard shortcuts
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
  
  // Unregister keyboard shortcuts
  window.removeEventListener('keydown', handleKeyDown);
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
  const allActions = processTree.getAllActions();

  // Check each action's inputs and outputs
  for (const action of allActions) {
    const hasRelatedInput = action.inputs.some(inputId => selectedIdSet.has(inputId));
    const hasRelatedOutput = action.outputs.some(outputId => selectedIdSet.has(outputId));

    if (hasRelatedInput || hasRelatedOutput) {
      related.add(action.id);
    }
  }

  relatedActionIds.value = related;
}

// Handle subprocess creation
function addSubprocess() {
  if (newSubprocessName.value.trim()) {
    processTree.addSubprocess(newSubprocessName.value.trim());
    newSubprocessName.value = '';
    showAddSubprocessDialog.value = false;
  }
}

// Stack management handlers
function pushSubprocess() {
  const subprocessName = `Subprocess ${Date.now()}`;
  const cmd = new Command('Push subprocess', world);
  cmd.addAndExecute(new PushSubprocessOp(subprocessName));
  cmd.commit();
  commandStack.push(cmd);
}

function popSubprocess() {
  if (canPop.value) {
    const cmd = new Command('Pop subprocess', world);
    cmd.addAndExecute(new PopSubprocessOp());
    cmd.commit();
    commandStack.push(cmd);
  }
}

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

// Handle node selection
function handleNodeSelect(nodeId: string) {
  selectedNodeId.value = nodeId === selectedNodeId.value ? null : nodeId;
}

// Handle visibility toggle
function handleToggleVisibility(nodeId: string) {
  processTree.toggleSubprocessVisibility(nodeId);
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

.stack-info {
  padding: 0 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #495057;
  min-width: 1.5rem;
  text-align: center;
  cursor: help;
}

.add-subprocess-btn {
  padding: 0.5rem 1rem;
  background: #4f46e5;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: background 0.2s;
}

.add-subprocess-btn:hover {
  background: #4338ca;
}

.process-tree {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

.add-subprocess-dialog {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  border: 1px solid #ccc;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  min-width: 300px;
}

.add-subprocess-dialog h3 {
  margin: 0 0 16px 0;
  font-size: 1.125rem;
}

.add-subprocess-dialog input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
  margin-bottom: 16px;
}

.dialog-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.dialog-actions button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.dialog-actions button:first-child {
  background: #4f46e5;
  color: white;
}

.dialog-actions button:first-child:hover {
  background: #4338ca;
}

.dialog-actions button:last-child {
  background: #e5e7eb;
  color: #374151;
}

.dialog-actions button:last-child:hover {
  background: #d1d5db;
}
</style>

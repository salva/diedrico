<template>
  <aside class="actions-panel">
    <header class="panel-header">
      <h2 class="panel-title">Construction History</h2>
      <button 
        class="add-subprocess-btn"
        @click="showAddSubprocessDialog = true"
        title="Add new subprocess"
      >
        + Subprocess
      </button>
    </header>

    <!-- Process Tree -->
    <div class="process-tree" :key="treeVersion + forceUpdate">
      <ProcessTreeNode
        :node="processTree.root"
        :selected-node-id="selectedNodeId"
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
import { ref, computed, inject, onMounted, onUnmounted } from 'vue';
import type { World } from '@/domain/world/World';
import ProcessTreeNode from './ProcessTreeNode.vue';

// Emits
const emit = defineEmits<{
  highlightElements: [elementIds: string[], temporary: boolean];
  clearHighlight: [];
}>();

// Injected dependencies
const world = inject<World>('world')!;
const processTree = world.getProcessTree();

// Local state
const selectedNodeId = ref<string | null>(null);
const showAddSubprocessDialog = ref(false);
const newSubprocessName = ref('');

// Watch ProcessTree version for reactivity
const treeVersion = computed(() => processTree.getVersion());

// Force re-render when tree changes by polling version
let intervalId: number | null = null;
const forceUpdate = ref(0);
onMounted(() => {
  intervalId = window.setInterval(() => {
    // Check if tree version changed
    const currentVersion = processTree.getVersion();
    if (currentVersion !== treeVersion.value) {
      forceUpdate.value++;
    }
  }, 100); // Check more frequently for better responsiveness
});

onUnmounted(() => {
  if (intervalId !== null) {
    clearInterval(intervalId);
  }
});

// Handle subprocess creation
function addSubprocess() {
  if (newSubprocessName.value.trim()) {
    processTree.addSubprocess(newSubprocessName.value.trim());
    newSubprocessName.value = '';
    showAddSubprocessDialog.value = false;
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

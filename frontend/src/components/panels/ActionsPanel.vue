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

    <!-- Filter Controls -->
    <div class="panel-controls">
      <select
        v-model="filterType"
        class="filter-dropdown"
        aria-label="Filter by action type"
      >
        <option value="all">All Types</option>
        <option value="CreateFreePoint">Free Points</option>
        <option value="CreatePointOnElement">Points on Element</option>
        <option value="CreateIntersectionPoint">Intersection Points</option>
        <option value="CreateLine">Lines</option>
        <option value="CreateSegment">Segments</option>
        <option value="CreateCircle">Circles</option>
        <option value="CreateGuide">Guides</option>
        <option value="TransportPoint">Point Transport</option>
      </select>
    </div>

    <!-- Process Tree -->
    <div class="process-tree">
      <ProcessTreeNode
        :node="processTree.root"
        :filter-type="filterType"
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
import { ref, inject, onMounted, onUnmounted } from 'vue';
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
const filterType = ref<string>('all');
const selectedNodeId = ref<string | null>(null);
const showAddSubprocessDialog = ref(false);
const newSubprocessName = ref('');
const refreshTrigger = ref(0);

// Force reactivity by polling ProcessTree changes
let intervalId: number | null = null;
onMounted(() => {
  intervalId = window.setInterval(() => {
    refreshTrigger.value++;
  }, 500);
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
    refreshTrigger.value++; // Force update
  }
}

// Handle node selection
function handleNodeSelect(nodeId: string) {
  selectedNodeId.value = nodeId === selectedNodeId.value ? null : nodeId;
}

// Handle visibility toggle
function handleToggleVisibility(nodeId: string) {
  processTree.toggleSubprocessVisibility(nodeId);
  refreshTrigger.value++; // Force update
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

.panel-controls {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  background-color: #fff;
  border-bottom: 1px solid #dee2e6;
}

.filter-dropdown {
  padding: 0.5rem;
  border: 1px solid #ced4da;
  border-radius: 0.25rem;
  font-size: 0.875rem;
}

.filter-dropdown:focus {
  outline: none;
  border-color: #0d6efd;
  box-shadow: 0 0 0 0.2rem rgba(13, 110, 253, 0.25);
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

}
</style>

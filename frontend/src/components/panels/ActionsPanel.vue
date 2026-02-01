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
        :node="processTree.root"
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
const processTree = world.getProcessTree();

// Selection store
const selectionStore = useSelectionStore();

// Local state
const treeContainer = ref<HTMLElement | null>(null);
const selectedNodeId = ref<string | null>(null);
const relatedActionIds = ref<Set<string>>(new Set());
const stackVersion = ref(0); // Track stack changes
const lastNodeCount = ref(0); // Track number of nodes for auto-scroll

// Stack management computed properties
const canPop = computed(() => {
  stackVersion.value; // Depend on stack changes
  return processTree.getStackDepth() > 1;
});
const activeSubprocessId = computed(() => {
  stackVersion.value; // Depend on stack changes
  return processTree.getCurrentSubprocess().id;
});

// Watch ProcessTree version for reactivity, triggered by stackVersion changes
const treeVersion = computed(() => {
  // Depend on stackVersion to trigger updates when push/pop occurs
  stackVersion.value;
  return processTree.getVersion();
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
  // Register keyboard shortcuts
  window.addEventListener('keydown', handleKeyDown);
  
  // Initialize node count
  lastNodeCount.value = countNodes(processTree.root);

  // Subscribe to ProcessTree changes
  unsubscribeTree = processTree.subscribe(() => {
    // Check if structure grew
    const currentCount = countNodes(processTree.root);
    const shouldScroll = currentCount > lastNodeCount.value;
    lastNodeCount.value = currentCount;

    stackVersion.value++;

    if (shouldScroll) {
      nextTick(() => {
        scrollToBottom();
      });
    }
  });
});

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

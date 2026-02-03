<template>
  <div class="tree-node">
    <!-- Subprocess Node -->
    <div
      v-if="node.type === 'subprocess'"
      class="subprocess-node"
      :class="{ 
        'node-selected': isSelected, 
        'subprocess-active': isActiveSubprocess,
        'faded': isFaded
      }"
    >
      <div class="subprocess-header">
        <span class="collapse-icon" @click.stop="toggleCollapse">{{ isCollapsed ? '▶' : '▼' }}</span>
        
        <span 
          v-if="!isEditing"
          class="subprocess-name" 
          @dblclick.stop="startEditing"
        >
          {{ node.name }}
        </span>
        <input
          v-else
          ref="nameInput"
          v-model="editName"
          class="subprocess-name-input"
          @blur="submitName"
          @keydown.enter="submitName"
          @keydown.esc="cancelEditing"
          @keydown.stop
          @click.stop
        />
        
        <span v-if="isActiveSubprocess" class="active-indicator" title="Current subprocess">●</span>

        <!-- Right Side Controls Matrix -->
        <div class="node-controls">
          <!-- Show Intermediates Toggle (Triangle Down) -->
          <!-- Was Encapsulate Toggle + Internal Button. Consolidated here. -->
          <button
            class="icon-btn internal-btn"
            :class="{ 'active': node.showIntermediates }"
            @click.stop="emit('toggleEncapsulate', node.id)"
            title="Show Intermediates"
          >
            {{ node.showIntermediates ? '▼' : '▽' }}
          </button>
          
          <!-- Output Selection (Triangle Up) -->
          <button
            class="icon-btn output-btn"
            :class="{ 'active': node.isOutput }"
            @click.stop="emit('toggleOutput', node.id)"
            title="Mark as Output"
          >
            {{ node.isOutput ? '▲' : '△' }}
          </button>
        </div>
      </div>

      <!-- Child nodes (when expanded) -->
      <div v-show="!isCollapsed" class="subprocess-children">
        <ProcessTreeNode
          v-for="child in allChildren"
          :key="child.id"
          :node="child"
          :data-version="dataVersion"
          :selected-node-id="selectedNodeId"
          :active-subprocess-id="activeSubprocessId"
          :related-action-ids="relatedActionIds"
          :is-parent-encapsulated="isEffectivelyEncapsulated"
          @select-node="emit('selectNode', $event)"
          @toggle-encapsulate="emit('toggleEncapsulate', $event)"
          @toggle-output="emit('toggleOutput', $event)"
          @highlight-elements="(...args) => emit('highlightElements', ...args)"
          @clear-highlight="emit('clearHighlight')"
          @rename-node="(...args) => emit('renameNode', ...args)"
        />
        
        <!-- Insertion Point Cursor -->
        <div v-if="isActiveSubprocess" class="insertion-point" title="Next action will be added here">
          <span class="insertion-arrow">➤</span>
          <span class="insertion-line"></span>
        </div>
      </div>
    </div>

    <!-- ActionGroup Node -->
    <div
      v-else-if="node.type === 'actionGroup'"
      class="actiongroup-node"
      :class="{ 
        'auxiliary': node.isAuxiliary,
        'faded': isFaded
      }"
    >
      <div class="actiongroup-header">
        <span v-if="node.isAuxiliary" class="auxiliary-icon" title="Auxiliary actions">⚙</span>

        <!-- Right Side Controls Matrix - REMOVED for ActionGroup to avoid button duplication -->
        <!-- User sees group+action as one unit, so we only show controls on the action itself -->
      </div>

      <!-- Child actions (always shown) -->
      <div class="actiongroup-children">
        <ProcessTreeNode
          v-for="child in allChildren"
          :key="child.id"
          :node="child"
          :data-version="dataVersion"
          :selected-node-id="selectedNodeId"
          :active-subprocess-id="activeSubprocessId"
          :related-action-ids="relatedActionIds"
          :is-parent-encapsulated="isEffectivelyEncapsulated"
          @select-node="emit('selectNode', $event)"
          @toggle-encapsulate="emit('toggleEncapsulate', $event)"
          @toggle-output="emit('toggleOutput', $event)"
          @highlight-elements="(...args) => emit('highlightElements', ...args)"
          @clear-highlight="emit('clearHighlight')"
          @rename-node="(...args) => emit('renameNode', ...args)"
        />
      </div>
    </div>

    <!-- Action Node (leaf) -->
    <div
      v-else-if="node.type === 'action'"
      class="action-node"
      :class="{ 
        'node-selected': isSelected,
        'action-infeasible': isInfeasible,
        'action-related': isRelated,
        'faded': isFaded
      }"
      @click="handleActionClick"
      @mouseenter="handleActionHover(true)"
      @mouseleave="handleActionHover(false)"
    >
      <div class="action-main">
        <span class="action-status">{{ statusIcon }}</span>
        <span class="action-description">{{ node.description }}</span>
        <span v-if="isRelated && !isSelected" class="related-indicator" title="Related to selected elements">🔗</span>

        <!-- Right Side Controls Matrix -->
        <div class="node-controls">
          <!-- Spacer for Show Intermediates (Down) column -->
          <div class="icon-spacer"></div>

          <!-- Output Selection (Triangles) -->
          <button
            class="icon-btn output-btn"
            :class="{ 'active': node.isOutput }"
            @click.stop="emit('toggleOutput', node.id)"
            title="Toggle Output"
          >
            {{ node.isOutput ? '▲' : '△' }}
          </button>
        </div>
      </div>

      <!-- Action Details (when selected) -->
      <div v-if="isSelected" class="action-details">
        <div v-if="node.inputs && node.inputs.length > 0" class="action-io">
          <strong>In:</strong> {{ node.inputs.join(', ') }}
        </div>
        <div v-if="node.outputs && node.outputs.length > 0" class="action-io">
          <strong>Out:</strong> {{ node.outputs.join(', ') }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue';
import type { ProcessNode } from '@/domain/processTree/ProcessTree';

// Props
const props = withDefaults(defineProps<{
  node: ProcessNode;
  selectedNodeId: string | null;
  activeSubprocessId?: string;
  relatedActionIds?: Set<string>;
  isParentEncapsulated?: boolean;
  dataVersion?: number;
}>(), {
  isParentEncapsulated: false,
  dataVersion: 0
});

// Emits
const emit = defineEmits<{
  selectNode: [nodeId: string];
  toggleEncapsulate: [nodeId: string];
  toggleOutput: [nodeId: string];
  highlightElements: [elementIds: string[], temporary: boolean];
  clearHighlight: [];
  renameNode: [nodeId: string, newName: string];
}>();

// Local state
const isCollapsed = ref(
  props.node.type === 'subprocess' && props.node.name === 'World Initialization'
);
const isEditing = ref(false);
const editName = ref('');
const nameInput = ref<HTMLInputElement | null>(null);

// Computed
const isSelected = computed(() => props.selectedNodeId === props.node.id);

const isActiveSubprocess = computed(() => {
  if (props.node.type !== 'subprocess') return false;
  return props.activeSubprocessId === props.node.id;
});

const isRelated = computed(() => {
  if (props.node.type !== 'action') return false;
  if (!props.relatedActionIds) return false;
  return props.relatedActionIds.has(props.node.id);
});

// Determine if this node is legally hidden by encryption logic (faded in UI)
const isFaded = computed(() => {
  // Use dataVersion to force update when node properties change
  props.dataVersion;
  
  // If we are NOT in an encapsulated scope, everything is clearly visible
  if (!props.isParentEncapsulated) return false;

  // If this node ITSELF is an output, it is fully visible (punches through encapsulation)
  if (props.node.isOutput) return false;

  // IMPORTANT: If this is a container (Group/Subprocess) that contains visible descendants,
  // we must NOT fade it, otherwise the visible descendants inside will also look faded
  // due to CSS opacity inheritance.
  if (hasVisibleDescendant(props.node)) return false;

  // Otherwise, we are an internal detail (hidden/faded).
  return true;
});

// Helper to check for visible descendants recursively (structural check)
function hasVisibleDescendant(node: ProcessNode): boolean {
  if (node.type === 'action') {
    return false; // Leaf node cannot have descendants
  }
  
  if (node.type === 'actionGroup') {
    // ActionGroup has ActionNode | null children
    return node.children.some(child => child !== null && child.isOutput);
  }
  
  if (node.type === 'subprocess') {
    // Subprocess has Subprocess | ActionGroup children
    return node.children.some(child => child.isOutput || hasVisibleDescendant(child));
  }
  
  return false;
}

// Determine if the children of this node should be considered encapsulated
const isEffectivelyEncapsulated = computed(() => {
  // Use dataVersion to force update when node properties change
  props.dataVersion;
  // If we are already deep in an encapsulated scope, children are too.
  if (props.isParentEncapsulated) return true;
  
  // If we are a subprocess starting a new encapsulation scope
  if (props.node.type === 'subprocess' && !props.node.showIntermediates) {
    return true;
  }
  
  return false;
});


const allChildren = computed(() => {
  // Use dataVersion/node to ensure reactivity when structure changes
  props.dataVersion; 
  if (!('children' in props.node)) return [];
  return props.node.children.filter(child => child !== null);
});

const isInfeasible = computed(() => {
  // TODO: Check if action produces infeasible elements
  return false;
});

const statusIcon = computed(() => {
  return isInfeasible.value ? '⚠️' : '✓';
});

// Methods
function toggleCollapse() {
  isCollapsed.value = !isCollapsed.value;
}

function handleActionClick() {
  if (props.node.type !== 'action') return;
  
  emit('selectNode', props.node.id);
  
  // Phase 93: Actions only have elementId (single output element)
  // For inputs, we'd need to query DependencyService (future enhancement)
  const elementIds = [props.node.elementId];
  if (elementIds.length > 0) {
    emit('highlightElements', elementIds, false);
  }
}

function handleActionHover(isHovering: boolean) {
  if (props.node.type !== 'action') return;
  
  if (isHovering && !isSelected.value) {
    // Phase 93: Actions only have elementId (single output element)
    const elementIds = [props.node.elementId];
    if (elementIds.length > 0) {
      emit('highlightElements', elementIds, true);
    }
  } else if (!isHovering && !isSelected.value) {
    emit('clearHighlight');
  }
}

async function startEditing() {
  if (props.node.type !== 'subprocess') return;
  editName.value = props.node.name;
  isEditing.value = true;
  await nextTick();
  nameInput.value?.focus();
}

function submitName() {
  if (!isEditing.value) return;
  
  const trimmedName = editName.value.trim();
  if (trimmedName && trimmedName !== props.node.name) {
    emit('renameNode', props.node.id, trimmedName);
  }
  
  isEditing.value = false;
}

function cancelEditing() {
  isEditing.value = false;
  editName.value = props.node.name;
}

function formatActionType(type: string): string {
  return type
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .replace(/^Create /, '');
}

function formatTime(timestamp: number | Date): string {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatParameterValue(value: any): string {
  if (typeof value === 'number') {
    return value.toFixed(2);
  }
  if (typeof value === 'object' && value !== null) {
    if ('x' in value && 'y' in value) {
      return `(${value.x.toFixed(2)}, ${value.y.toFixed(2)})`;
    }
    return JSON.stringify(value);
  }
  return String(value);
}
</script>

<style scoped>
.tree-node {
  margin: 0;
  padding: 0;
}

/* Subprocess Styling */
.subprocess-node {
  margin: 4px 0;
}

.subprocess-header {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 6px;
  background: #f8f8f8;
  border-radius: 3px;
  cursor: pointer;
  transition: background 0.2s;
  font-size: 13px;
}

.subprocess-header:hover {
  background: #f0f0f0;
}

.subprocess-node.node-selected .subprocess-header {
  background: #e0e7ff;
}

.subprocess-node.subprocess-active .subprocess-header {
  background: #E3F2FD;
  border-left: 3px solid #4f46e5;
  padding-left: 3px;
}

.active-indicator {
  color: #4f46e5;
  font-size: 10px;
  margin-left: auto;
  animation: pulse 2s infinite;
  margin-right: 8px; /* Spacing before icons */
}

/* Right Side Controls Matrix Layout */
.node-controls {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-left: 8px;
  /* Ensure controls stay on the right even if name is short */
  /* For subprocess header, 'subprocess-name' has flex:1 so margin-left: auto isn't needed here if placed after it */
}

/* Spacer for alignment in rows without encapsulation button */
.icon-spacer {
  width: 20px;
  height: 20px;
}

/* Action node layout adjustment */
.action-main {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
}

.action-description {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1; /* Push controls to right */
}

/* Specific overrides for action node to ensure right alignment */
.action-node .node-controls,
.actiongroup-header .node-controls {
  margin-left: auto;
}

/* For subprocess header, since name has flex:1, node-controls naturally goes to right */


.insertion-point {
  display: flex;
  align-items: center;
  padding: 4px 0 4px 6px;
  margin-top: 2px;
}

.insertion-arrow {
  color: #4f46e5;
  font-size: 10px;
  margin-right: 6px;
  animation: pulse-arrow 1.5s infinite; 
}

.insertion-line {
  flex: 1;
  height: 1px;
  border-bottom: 1px dashed rgba(79, 70, 229, 0.3);
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

@keyframes pulse-arrow {
  0%, 100% { transform: translateX(0); opacity: 1; }
  50% { transform: translateX(3px); opacity: 0.6; }
}

.collapse-icon {
  font-size: 10px;
  color: #666;
  width: 12px;
  display: inline-block;
}

.icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: #444; /* Constant color for all states, reliance on fill for status */
  opacity: 1;
  transition: opacity 0.2s, background-color 0.2s;
  border-radius: 3px;
}

.icon-btn:hover {
  background-color: rgba(0,0,0,0.05);
}

.icon-btn.active {
  /* No color change, relying on icon geometry (filled vs empty) */
}
/* Replaced specific color rules with unified one */

/* Removed redundant .icon-btn.active block */

/* Special placement for action output toggle */
.action-output-toggle {
  margin-right: 4px;
}

.faded {
  opacity: 0.5;
  filter: grayscale(0.5);
}

.faded:hover {
  opacity: 0.8;
}

.subprocess-name {
  font-weight: 600;
  color: #333;
  flex: 1;
}

.subprocess-name-input {
  flex: 1;
  font-family: inherit;
  font-size: inherit;
  font-weight: inherit;
  padding: 1px 4px;
  border: 1px solid #4f46e5;
  border-radius: 2px;
  outline: none;
  margin: -2px 0;
}

.subprocess-children {
  padding-left: 12px;
  border-left: 1px solid #ddd;
  margin-left: 8px;
  margin-top: 2px;
}

/* ActionGroup Styling */
.actiongroup-node {
  margin: 3px 0;
  padding: 4px;
  border: 1px solid #e0e0e0;
  border-radius: 3px;
  background: #fafafa;
}

.actiongroup-node.auxiliary {
  background: #f5f5f5;
  border-color: #d0d0d0;
  border-style: dashed;
}

.actiongroup-header {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  margin-bottom: 2px;
  font-size: 11px;
}

.auxiliary-icon {
  font-size: 12px;
  color: #888;
}

.actiongroup-children {
  padding-left: 8px;
}

/* Action Styling */
.action-node {
  padding: 4px 6px;
  margin: 1px 0;
  border-radius: 2px;
  cursor: pointer;
  transition: background 0.2s;
  font-size: 12px;
}

.action-node:hover {
  background: #f5f5f5;
}

.action-node.node-selected {
  background: #e0e7ff;
  border-left: 3px solid #4f46e5;
  padding-left: 3px;
}

.action-node.action-infeasible {
  background: #fff3cd;
}

.action-node.action-related {
  background: #fef3c7;
  border-left: 2px solid #fbbf24;
  padding-left: 4px;
}

.action-node.action-related:hover {
  background: #fde68a;
}

.related-indicator {
  font-size: 11px;
  color: #d97706;
  margin-left: auto;
}

.action-main {
  display: flex;
  align-items: center;
  gap: 4px;
}

.action-status {
  font-size: 10px;
  flex-shrink: 0;
}

.action-description {
  font-size: 12px;
  color: #333;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.action-details {
  margin-top: 4px;
  padding-top: 4px;
  border-top: 1px solid #e0e0e0;
  font-size: 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.action-io {
  color: #555;
}

.action-io strong {
  color: #888;
  font-size: 9px;
  text-transform: uppercase;
}
</style>

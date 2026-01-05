<template>
  <div class="tree-node">
    <!-- Subprocess Node -->
    <div
      v-if="node.type === 'subprocess'"
      class="subprocess-node"
      :class="{ 'node-selected': isSelected }"
    >
      <div class="subprocess-header" @click="toggleCollapse">
        <span class="collapse-icon">{{ isCollapsed ? '▶' : '▼' }}</span>
        <button
          class="visibility-icon"
          :class="{ 'invisible': !node.visible }"
          @click.stop="emit('toggleVisibility', node.id)"
          title="Toggle drawing visibility"
        >
          {{ node.visible ? '👁' : '👁‍🗨' }}
        </button>
        <span class="subprocess-name">{{ node.name }}</span>
      </div>

      <!-- Child nodes (when expanded) -->
      <div v-if="!isCollapsed" class="subprocess-children">
        <ProcessTreeNode
          v-for="child in filteredChildren"
          :key="child.id"
          :node="child"
          :filter-type="filterType"
          :selected-node-id="selectedNodeId"
          @select-node="emit('selectNode', $event)"
          @toggle-visibility="emit('toggleVisibility', $event)"
          @highlight-elements="(...args) => emit('highlightElements', ...args)"
          @clear-highlight="emit('clearHighlight')"
        />
      </div>
    </div>

    <!-- ActionGroup Node -->
    <div
      v-else-if="node.type === 'actionGroup'"
      class="actiongroup-node"
      :class="{ 'auxiliary': node.isAuxiliary }"
    >
      <div class="actiongroup-header" @click="toggleCollapse">
        <span class="collapse-icon">{{ isCollapsed ? '▶' : '▼' }}</span>
        <span v-if="node.isAuxiliary" class="auxiliary-icon" title="Auxiliary actions">⚙</span>
      </div>

      <!-- Child actions (when expanded) -->
      <div v-if="!isCollapsed" class="actiongroup-children">
        <ProcessTreeNode
          v-for="child in filteredChildren"
          :key="child.id"
          :node="child"
          :filter-type="filterType"
          :selected-node-id="selectedNodeId"
          @select-node="emit('selectNode', $event)"
          @toggle-visibility="emit('toggleVisibility', $event)"
          @highlight-elements="(...args) => emit('highlightElements', ...args)"
          @clear-highlight="emit('clearHighlight')"
        />
      </div>
    </div>

    <!-- Action Node (leaf) -->
    <div
      v-else-if="node.type === 'action'"
      class="action-node"
      :class="{ 
        'node-selected': isSelected,
        'action-infeasible': isInfeasible
      }"
      @click="handleActionClick"
      @mouseenter="handleActionHover(true)"
      @mouseleave="handleActionHover(false)"
    >
      <span class="action-status">{{ statusIcon }}</span>
      <span class="action-description">{{ node.description }}</span>
      <div class="action-metadata">
        <span class="action-type">{{ formatActionType(node.actionType) }}</span>
        <span class="action-time">{{ formatTime(node.timestamp) }}</span>
      </div>

      <!-- Action Details (when selected) -->
      <div v-if="isSelected" class="action-details">
        <div v-if="node.inputs.length > 0" class="action-io">
          <strong>Inputs:</strong> {{ node.inputs.join(', ') }}
        </div>
        <div v-if="node.outputs.length > 0" class="action-io">
          <strong>Outputs:</strong> {{ node.outputs.join(', ') }}
        </div>
        <div v-if="Object.keys(node.parameters).length > 0" class="action-params">
          <strong>Parameters:</strong>
          <ul>
            <li v-for="(value, key) in node.parameters" :key="key">
              {{ key }}: {{ formatParameterValue(value) }}
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { ProcessNode } from '@/domain/processTree/ProcessTree';

// Props
const props = defineProps<{
  node: ProcessNode;
  filterType: string;
  selectedNodeId: string | null;
}>();

// Emits
const emit = defineEmits<{
  selectNode: [nodeId: string];
  toggleVisibility: [nodeId: string];
  highlightElements: [elementIds: string[], temporary: boolean];
  clearHighlight: [];
}>();

// Local state
const isCollapsed = ref(false);

// Computed
const isSelected = computed(() => props.selectedNodeId === props.node.id);

const filteredChildren = computed(() => {
  if (!('children' in props.node)) return [];
  
  if (props.filterType === 'all') {
    return props.node.children;
  }

  // Filter recursively
  return props.node.children.filter(child => matchesFilter(child, props.filterType));
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
  
  const elementIds = [...props.node.inputs, ...props.node.outputs];
  if (elementIds.length > 0) {
    emit('highlightElements', elementIds, false);
  }
}

function handleActionHover(isHovering: boolean) {
  if (props.node.type !== 'action') return;
  
  if (isHovering && !isSelected.value) {
    const elementIds = [...props.node.inputs, ...props.node.outputs];
    if (elementIds.length > 0) {
      emit('highlightElements', elementIds, true);
    }
  } else if (!isHovering && !isSelected.value) {
    emit('clearHighlight');
  }
}

function matchesFilter(node: ProcessNode, filterType: string): boolean {
  if (node.type === 'action') {
    return node.actionType === filterType;
  }
  
  if ('children' in node) {
    return node.children.some(child => matchesFilter(child, filterType));
  }
  
  return false;
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
  margin: 8px 0;
}

.subprocess-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px;
  background: #f8f8f8;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

.subprocess-header:hover {
  background: #f0f0f0;
}

.subprocess-node.node-selected .subprocess-header {
  background: #e0e7ff;
}

.collapse-icon {
  font-size: 10px;
  color: #666;
  width: 12px;
  display: inline-block;
}

.visibility-icon {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  padding: 0;
  line-height: 1;
  transition: opacity 0.2s;
}

.visibility-icon.invisible {
  opacity: 0.4;
}

.subprocess-name {
  font-weight: 600;
  color: #333;
  flex: 1;
}

.subprocess-children {
  padding-left: 16px;
  border-left: 2px solid #ddd;
  margin-left: 10px;
  margin-top: 4px;
}

/* ActionGroup Styling */
.actiongroup-node {
  margin: 6px 0;
  padding: 8px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
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
  gap: 6px;
  cursor: pointer;
  margin-bottom: 4px;
}

.auxiliary-icon {
  font-size: 14px;
  color: #888;
}

.actiongroup-children {
  padding-left: 12px;
}

/* Action Styling */
.action-node {
  padding: 8px;
  margin: 2px 0;
  border-radius: 3px;
  cursor: pointer;
  transition: background 0.2s;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.action-node:hover {
  background: #f5f5f5;
}

.action-node.node-selected {
  background: #e0e7ff;
  border-left: 3px solid #4f46e5;
}

.action-node.action-infeasible {
  background: #fff3cd;
}

.action-status {
  font-size: 12px;
  margin-right: 6px;
}

.action-description {
  font-size: 13px;
  color: #333;
  font-weight: 500;
}

.action-metadata {
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: #666;
}

.action-type {
  color: #4f46e5;
  font-weight: 500;
}

.action-time {
  color: #888;
}

.action-details {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #e0e0e0;
  font-size: 12px;
}

.action-io, .action-params {
  margin: 4px 0;
  color: #555;
}

.action-params ul {
  margin: 4px 0 0 16px;
  padding: 0;
}

.action-params li {
  margin: 2px 0;
}
</style>

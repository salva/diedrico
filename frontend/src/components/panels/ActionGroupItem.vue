<template>
  <div class="action-group-item">
    <!-- Subprocess -->
    <div v-if="node.type === 'subprocess'" class="subprocess-item">
      <div class="subprocess-header" @click="toggleExpanded">
        <span class="expand-icon" :class="{ expanded: isExpanded }">▶</span>
        <span class="subprocess-name">{{ node.name }}</span>
        <span class="subprocess-count">({{ childCount }})</span>
      </div>
      <div v-if="isExpanded" class="subprocess-children">
        <ActionGroupItem
          v-for="child in node.children"
          :key="child.id"
          :node="child"
        />
      </div>
    </div>

    <!-- Action Group -->
    <div v-else-if="node.type === 'actionGroup'" class="action-group">
      <div class="action-group-header" @click="toggleExpanded">
        <span class="expand-icon" :class="{ expanded: isExpanded }">▶</span>
        <span class="action-group-label">Group</span>
        <span class="action-count">({{ node.children.length }} actions)</span>
        <span class="timestamp">{{ formatTime(node.created) }}</span>
      </div>
      <div v-if="isExpanded" class="action-group-children">
        <ActionItem
          v-for="action in node.children"
          :key="action.id"
          :action="action"
        />
      </div>
    </div>

    <!-- Single Action (if passed directly) -->
    <ActionItem
      v-else-if="node.type === 'action'"
      :action="node"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Subprocess } from '../../domain/processTree/Subprocess';
import type { ActionGroup } from '../../domain/processTree/ActionGroup';
import type { ConstructiveAction } from '../../domain/processTree/Action';
import ActionItem from './ActionItem.vue';

// Allow recursive component
import ActionGroupItem from './ActionGroupItem.vue';

interface Props {
  node: Subprocess | ActionGroup | ConstructiveAction;
}

const props = defineProps<Props>();

const isExpanded = ref(true);

/**
 * Count children for subprocess
 */
const childCount = computed(() => {
  if (props.node.type === 'subprocess') {
    return props.node.children.length;
  }
  return 0;
});

/**
 * Toggle expanded/collapsed state
 */
function toggleExpanded() {
  isExpanded.value = !isExpanded.value;
}

/**
 * Format timestamp to time string
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}
</script>

<style scoped>
.action-group-item {
  width: 100%;
}

/* Subprocess styling */
.subprocess-item {
  margin-bottom: 8px;
}

.subprocess-header {
  display: flex;
  align-items: center;
  padding: 6px 8px;
  background-color: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  cursor: pointer;
  user-select: none;
}

.subprocess-header:hover {
  background-color: var(--color-background-mute);
}

.subprocess-name {
  flex: 1;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-heading);
}

.subprocess-count {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-left: 4px;
}

.subprocess-children {
  margin-top: 4px;
  margin-left: 16px;
  padding-left: 8px;
  border-left: 2px solid var(--color-border);
}

/* Action Group styling */
.action-group {
  margin-bottom: 4px;
}

.action-group-header {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  background-color: var(--color-background);
  border: 1px solid var(--color-border-hover);
  border-radius: 3px;
  cursor: pointer;
  user-select: none;
}

.action-group-header:hover {
  background-color: var(--color-background-soft);
}

.action-group-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text);
  margin-right: 4px;
}

.action-count {
  font-size: 11px;
  color: var(--color-text-muted);
  margin-right: 8px;
}

.timestamp {
  font-size: 11px;
  color: var(--color-text-muted);
  margin-left: auto;
  font-family: monospace;
}

.action-group-children {
  margin-top: 2px;
  margin-left: 16px;
  padding-left: 8px;
  border-left: 1px solid var(--color-border-hover);
}

/* Expand icon */
.expand-icon {
  display: inline-block;
  margin-right: 6px;
  font-size: 10px;
  transition: transform 0.2s ease;
  color: var(--color-text-muted);
}

.expand-icon.expanded {
  transform: rotate(90deg);
}
</style>

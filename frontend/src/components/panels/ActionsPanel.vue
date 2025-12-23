<template>
  <div class="actions-panel">
    <div class="panel-header">
      <h3>Construction History</h3>
    </div>
    <div class="panel-content">
      <div v-if="allActions.length === 0" class="empty-state">
        <p>No actions yet. Start constructing!</p>
      </div>
      <div v-else class="actions-list">
        <ActionGroupItem
          v-for="node in rootChildren"
          :key="node.id"
          :node="node"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useProcessStore } from '../../stores/processStore';
import ActionGroupItem from './ActionGroupItem.vue';

const processStore = useProcessStore();

/**
 * Get the root process tree
 */
const rootProcess = computed(() => processStore.root);

/**
 * Get all children of the root process
 * (subprocesses and action groups)
 */
const rootChildren = computed(() => rootProcess.value.children);

/**
 * Get all actions (flattened from the tree) using the getter
 */
const allActions = computed(() => processStore.allActions);
</script>

<style scoped>
.actions-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--color-background);
  border-right: 1px solid var(--color-border);
}

.panel-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border);
  background-color: var(--color-background-soft);
}

.panel-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-heading);
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.empty-state {
  padding: 24px 16px;
  text-align: center;
  color: var(--color-text-muted);
}

.empty-state p {
  margin: 0;
  font-size: 13px;
}

.actions-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
</style>

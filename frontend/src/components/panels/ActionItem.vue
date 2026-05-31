<template>
  <div
    class="action-item"

  >
    <!-- Phase 92: Display elementId instead of outputs array -->
    <div v-if="action.elementId" class="action-outputs">
      <span class="label">Element:</span>
      <span class="outputs">{{ action.elementId }}</span>
    </div>
    <div class="action-description">
      <span class="description">{{ action.description }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Action } from '../../domain/processTree/Action';

interface Props {
  action: Action;
}

defineProps<Props>();

</script>

<style scoped>
.action-item {
  padding: 6px 8px;
  background-color: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 3px;
  margin-bottom: 2px;
  font-size: 12px;
  transition: background-color 0.2s ease;
}

.action-item:hover {
  background-color: var(--color-background-soft);
}

.action-item.infeasible {
  border-color: var(--color-error);
  background-color: rgba(255, 0, 0, 0.05);
}

.action-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.action-type {
  font-weight: 600;
  color: var(--color-heading);
}

.action-item.infeasible .action-type {
  color: var(--color-error);
}

.timestamp {
  font-size: 11px;
  color: var(--color-text-muted);
  font-family: monospace;
}

.action-outputs,
.action-inputs {
  display: flex;
  gap: 4px;
  font-size: 11px;
  margin-top: 2px;
}

.label {
  color: var(--color-text-muted);
  font-weight: 500;
}

.outputs,
.inputs {
  color: var(--color-text);
  font-family: monospace;
}
</style>

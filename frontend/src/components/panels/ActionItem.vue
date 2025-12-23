<template>
  <div
    class="action-item"
    :class="{
      'infeasible': action.infeasible
    }"
    :title="action.infeasible ? `Infeasible: ${action.infeasibilityReason || 'Constraint violation'}` : ''"
  >
    <div class="action-header">
      <span class="action-type">{{ formatActionType(action.actionType) }}</span>
      <span class="timestamp">{{ formatTime(action.timestamp) }}</span>
    </div>
    <div v-if="action.outputs.length > 0" class="action-outputs">
      <span class="label">Output:</span>
      <span class="outputs">{{ action.outputs.join(', ') }}</span>
    </div>
    <div v-if="action.inputs.length > 0" class="action-inputs">
      <span class="label">Inputs:</span>
      <span class="inputs">{{ action.inputs.join(', ') }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ConstructiveAction } from '../../domain/processTree/Action';
import { ActionType } from '../../domain/processTree/Action';

interface Props {
  action: ConstructiveAction;
}

const props = defineProps<Props>();

/**
 * Format ActionType enum to readable string
 */
function formatActionType(actionType: ActionType): string {
  // Convert CamelCase to Title Case with spaces
  return actionType
    .replace(/([A-Z])/g, ' $1')
    .trim();
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

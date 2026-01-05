<template>
  <aside class="actions-panel">
    <header class="panel-header">
      <h2 class="panel-title">Construction History</h2>
      <span class="action-count">({{ filteredActions.length }})</span>
    </header>

    <!-- Search and Filter Controls -->
    <div class="panel-controls">
      <input
        v-model="searchQuery"
        type="text"
        class="search-input"
        placeholder="Search actions..."
        aria-label="Search actions"
      />
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

    <!-- Actions List -->
    <div class="actions-list">
      <div
        v-for="action in filteredActions"
        :key="action.id"
        class="action-item"
        :class="{ 
          'action-selected': selectedActionId === action.id,
          'action-infeasible': isInfeasible(action)
        }"
        @click="handleActionClick(action)"
        @mouseenter="handleActionHover(action, true)"
        @mouseleave="handleActionHover(action, false)"
      >
        <!-- Action Status Icon -->
        <span class="action-status-icon" :title="getStatusTitle(action)">
          {{ getStatusIcon(action) }}
        </span>

        <!-- Action Description -->
        <div class="action-content">
          <div class="action-description">
            {{ action.description }}
          </div>
          <div class="action-metadata">
            <span class="action-type">{{ formatActionType(action.actionType) }}</span>
            <span class="action-time">{{ formatTime(action.timestamp) }}</span>
          </div>

          <!-- Action Details (collapsible) -->
          <div v-if="selectedActionId === action.id" class="action-details">
            <div v-if="action.inputs.length > 0" class="action-io">
              <strong>Inputs:</strong> {{ action.inputs.join(', ') }}
            </div>
            <div v-if="action.outputs.length > 0" class="action-io">
              <strong>Outputs:</strong> {{ action.outputs.join(', ') }}
            </div>
            <div v-if="Object.keys(action.parameters).length > 0" class="action-params">
              <strong>Parameters:</strong>
              <ul>
                <li v-for="(value, key) in action.parameters" :key="key">
                  {{ key }}: {{ formatParameterValue(value) }}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="filteredActions.length === 0" class="empty-state">
        <p v-if="searchQuery || filterType !== 'all'">
          No actions match your filters
        </p>
        <p v-else>
          No construction actions yet. Start creating geometry!
        </p>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
/**
 * ActionsPanel - Display construction history from ProcessTree
 * 
 * Shows all construction actions in chronological order with:
 * - Action type and description
 * - Status indicators (complete, infeasible)
 * - Filtering by action type
 * - Search by description/parameters
 * - Click to select and highlight related elements
 * - Hover to preview highlighting
 * 
 * @see specs/001-dihedral-learning-mvp/ui-spec.md#actions-panel-left-sidebar
 */

import { ref, computed, watch, inject } from 'vue';
import type { Action } from '@/domain/processTree/Action';
import type { World } from '@/domain/world/World';

// Emit events for interaction with canvas
const emit = defineEmits<{
  highlightElements: [elementIds: string[], temporary: boolean];
  clearHighlight: [];
}>();

// Inject World instance from parent (SvgCanvas provides it)
const world = inject<World>('world');
if (!world) {
  throw new Error('World not provided');
}

// Component state
const searchQuery = ref('');
const filterType = ref<string>('all');
const selectedActionId = ref<string | null>(null);

/**
 * Get all actions from ProcessTree
 */
const allActions = computed<Action[]>(() => {
  const processTree = world.getProcessTree();
  return processTree.getAllActions();
});

/**
 * Filter actions based on search query and type filter
 */
const filteredActions = computed<Action[]>(() => {
  let actions = allActions.value;

  // Apply type filter
  if (filterType.value !== 'all') {
    actions = actions.filter(action => action.actionType === filterType.value);
  }

  // Apply search filter
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase();
    actions = actions.filter(action => {
      // Search in description
      if (action.description.toLowerCase().includes(query)) {
        return true;
      }
      // Search in parameters
      const paramsString = JSON.stringify(action.parameters).toLowerCase();
      if (paramsString.includes(query)) {
        return true;
      }
      return false;
    });
  }

  return actions;
});

/**
 * Handle action click - select and highlight related elements
 */
function handleActionClick(action: Action) {
  if (selectedActionId.value === action.id) {
    // Deselect
    selectedActionId.value = null;
    emit('clearHighlight');
  } else {
    // Select
    selectedActionId.value = action.id;
    const elementIds = [...action.inputs, ...action.outputs];
    emit('highlightElements', elementIds, false);
  }
}

/**
 * Handle action hover - temporarily highlight related elements
 */
function handleActionHover(action: Action, isHovering: boolean) {
  if (isHovering && selectedActionId.value !== action.id) {
    const elementIds = [...action.inputs, ...action.outputs];
    emit('highlightElements', elementIds, true);
  } else if (!isHovering && selectedActionId.value !== action.id) {
    emit('clearHighlight');
  }
}

/**
 * Check if action produces infeasible elements
 */
function isInfeasible(action: Action): boolean {
  // Check if any output element is infeasible
  // In MVP, we don't have explicit infeasibility tracking yet
  // This is a placeholder for future implementation
  return false;
}

/**
 * Get status icon for action
 */
function getStatusIcon(action: Action): string {
  if (isInfeasible(action)) {
    return '⚠️';
  }
  return '✓';
}

/**
 * Get status title (tooltip) for action
 */
function getStatusTitle(action: Action): string {
  if (isInfeasible(action)) {
    return 'Infeasible construction';
  }
  return 'Complete';
}

/**
 * Format action type for display
 */
function formatActionType(actionType: string): string {
  // Convert camelCase to readable format
  return actionType.replace(/([A-Z])/g, ' $1').trim();
}

/**
 * Format timestamp for display
 */
function formatTime(timestamp: Date): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

/**
 * Format parameter value for display
 */
function formatParameterValue(value: any): string {
  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value);
  }
  return String(value);
}

/**
 * Clear selection when actions change
 */
watch(allActions, () => {
  selectedActionId.value = null;
  emit('clearHighlight');
});
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
  gap: 0.5rem;
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

.action-count {
  font-size: 0.875rem;
  color: #6c757d;
}

.panel-controls {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  background-color: #fff;
  border-bottom: 1px solid #dee2e6;
}

.search-input,
.filter-dropdown {
  padding: 0.5rem;
  border: 1px solid #ced4da;
  border-radius: 0.25rem;
  font-size: 0.875rem;
}

.search-input:focus,
.filter-dropdown:focus {
  outline: none;
  border-color: #0d6efd;
  box-shadow: 0 0 0 0.2rem rgba(13, 110, 253, 0.25);
}

.actions-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

.action-item {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  background-color: #fff;
  border: 1px solid #dee2e6;
  border-radius: 0.25rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-item:hover {
  background-color: #e9ecef;
  border-color: #adb5bd;
}

.action-item.action-selected {
  background-color: #cfe2ff;
  border-color: #0d6efd;
}

.action-item.action-infeasible {
  background-color: #fff3cd;
  border-color: #ffc107;
}

.action-status-icon {
  flex-shrink: 0;
  font-size: 1rem;
}

.action-content {
  flex: 1;
  min-width: 0;
}

.action-description {
  font-size: 0.875rem;
  font-weight: 500;
  color: #212529;
  margin-bottom: 0.25rem;
}

.action-metadata {
  display: flex;
  gap: 0.75rem;
  font-size: 0.75rem;
  color: #6c757d;
}

.action-type {
  font-style: italic;
}

.action-details {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid #dee2e6;
  font-size: 0.75rem;
}

.action-io,
.action-params {
  margin-bottom: 0.5rem;
  color: #495057;
}

.action-params ul {
  margin: 0.25rem 0 0 1rem;
  padding: 0;
  list-style-type: disc;
}

.action-params li {
  margin-bottom: 0.25rem;
}

.empty-state {
  padding: 2rem;
  text-align: center;
  color: #6c757d;
  font-size: 0.875rem;
}

.empty-state p {
  margin: 0;
}
</style>

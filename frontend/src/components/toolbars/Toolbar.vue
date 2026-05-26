<template>
  <div class="toolbar">
    <!-- File operation buttons -->
    <div class="file-controls">
      <button
        class="file-button"
        @click="handleNew"
        title="New Project (Ctrl+N)"
        aria-label="New Project"
        data-testid="toolbar-new-project"
      >
        <NewFileIcon class="button-icon" />
      </button>
      
      <button
        class="file-button"
        @click="handleOpen"
        title="Open Project (Ctrl+O)"
        aria-label="Open Project"
        data-testid="toolbar-open-project"
      >
        <OpenFileIcon class="button-icon" />
      </button>
    </div>
    
    <div class="toolbar-separator"></div>
    
    <!-- Undo/Redo buttons -->
    <div class="history-controls">
      <button
        class="history-button"
        :disabled="!canUndo"
        @click="handleUndo"
        title="Undo (Ctrl+Z)"
        aria-label="Undo"
        data-testid="toolbar-undo"
      >
        <UndoIcon class="button-icon" />
      </button>
      
      <button
        class="history-button"
        :disabled="!canRedo"
        @click="handleRedo"
        title="Redo (Ctrl+Y)"
        aria-label="Redo"
        data-testid="toolbar-redo"
      >
        <RedoIcon class="button-icon" />
      </button>
    </div>
    
    <div class="toolbar-separator"></div>

    <!-- Active Plane selector -->
    <PlaneSelector />
    
    <div class="toolbar-separator"></div>
    
    <!-- Navigation controls -->
    <div class="navigation-controls">
      <button
        class="nav-button"
        @click="handleToggleGrid"
        :class="{ active: gridVisible }"
        title="Toggle Grid (G)"
        aria-label="Toggle Grid"
        data-testid="toolbar-toggle-grid"
      >
        <GridIcon class="button-icon" />
      </button>

      <button
        class="nav-button"
        @click="handleToggleProjections"
        :class="{ active: showProjectedElements }"
        title="Toggle 3D Projections (D)"
        aria-label="Toggle 3D Projections"
        data-testid="toolbar-toggle-projections"
      >
        <ProjectionIcon class="button-icon" />
      </button>

      <button
        class="nav-button"
        @click="handleFitToView"
        title="Fit to View (Ctrl+0)"
        aria-label="Fit to View"
        data-testid="toolbar-fit-to-view"
      >
        <ZoomFitIcon class="button-icon" />
      </button>
    </div>
    
    <div class="toolbar-separator"></div>
    
    <!-- Tool buttons -->
    <!-- Phase 54.5: Selection Tool (standalone, not in family) -->
    <button
      class="tool-button"
      :class="{ active: toolStore.isToolActive('select') }"
      @click="selectTool('select')"
      title="Selection Tool - Pick, move, and edit objects (Esc)"
      aria-label="Selection Tool"
      data-testid="tool-select"
    >
      <SelectionToolIcon class="button-icon" />
    </button>
    
    <!-- Phase 67: Tool Family Buttons with Dropdowns -->
    <ToolFamilyButton
      v-for="family in TOOL_FAMILIES"
      :key="family.id"
      :family="family"
    />

    <!-- T406: Login Status Widget at far right -->
    <LoginStatusWidget
      @sign-in="handleSignIn"
      @sign-out="handleSignOut"
    />
  </div>
</template>

<script setup lang="ts">
import { inject, computed, onMounted, onUnmounted, ref } from 'vue';
import { useToolStore } from '@/stores/toolStore';
import { useViewStore } from '@/stores/viewStore';
import { createToolbarHistoryController } from '@/application/toolbar/ToolbarHistoryController';
import LoginStatusWidget from '@/components/LoginStatusWidget.vue';
import PlaneSelector from '@/components/toolbars/PlaneSelector.vue';
import ToolFamilyButton from '@/components/toolbars/ToolFamilyButton.vue';
import { TOOL_FAMILIES } from '@/config/toolFamilies';
import SelectionToolIcon from '@/components/icons/toolbar/SelectionToolIcon.vue';
import NewFileIcon from '@/components/icons/toolbar/NewFileIcon.vue';
import OpenFileIcon from '@/components/icons/toolbar/OpenFileIcon.vue';
import UndoIcon from '@/components/icons/toolbar/UndoIcon.vue';
import RedoIcon from '@/components/icons/toolbar/RedoIcon.vue';
import GridIcon from '@/components/icons/toolbar/GridIcon.vue';
import ProjectionIcon from '@/components/icons/toolbar/ProjectionIcon.vue';
import ZoomFitIcon from '@/components/icons/toolbar/ZoomFitIcon.vue';

/**
 * Toolbar.vue - Tool selection toolbar
 *
 * Provides buttons for selecting geometric construction tools (Point, Line, etc.),
 * file operations (New, Open), and history controls (Undo/Redo).
 * Manages active tool state via tool store.
 *
 */

interface Emits {
  (e: 'new-project'): void;
  (e: 'open-project'): void;
  (e: 'fit-to-view'): void;
  (e: 'sign-in'): void;
  (e: 'sign-out'): void;
}

const emit = defineEmits<Emits>();

const toolStore = useToolStore();
const viewStore = useViewStore();
const toolbarHistoryController = createToolbarHistoryController({
  commandStack: inject<unknown>('commandStack')
});

// Reactive trigger for history updates (Phase 91)
const historyUpdate = ref(0);
let unsubscribeHistory: (() => void) | undefined;

// Computed properties for undo/redo availability
const canUndo = computed(() => {
  historyUpdate.value; // Create dependency
  return toolbarHistoryController.getState().canUndo;
});

const canRedo = computed(() => {
  historyUpdate.value; // Create dependency
  return toolbarHistoryController.getState().canRedo;
});

// Grid visibility
const gridVisible = computed(() => viewStore.gridVisible.value);

// Phase 106: 3D element projection display
const showProjectedElements = computed(() => viewStore.showProjectedElements.value);

/**
 * Select a tool
 */
function selectTool(tool: 'select' | 'point' | 'line' | 'circle' | 'segment' | 'guide' | 'intersection') {
  toolStore.setTool(tool);
}

onMounted(() => {
  // Subscribe to history changes
  unsubscribeHistory = toolbarHistoryController.subscribe(() => {
    historyUpdate.value++;
  });
});

onUnmounted(() => {
  if (unsubscribeHistory) {
    unsubscribeHistory();
  }
});

/**
 * Handle undo action
 */
function handleUndo() {
  toolbarHistoryController.undo();
  historyUpdate.value++;
}

/**
 * Handle redo action
 */
function handleRedo() {
  toolbarHistoryController.redo();
  historyUpdate.value++;
}

/**
 * Handle new project button
 */
function handleNew() {
  emit('new-project');
}

/**
 * Handle open project button
 */
function handleOpen() {
  emit('open-project');
}

/**
 * Toggle grid visibility (T276)
 */
function handleToggleGrid() {
  viewStore.toggleGrid();
}

/**
 * Toggle 3D element projection display (Phase 106 - T1836)
 */
function handleToggleProjections() {
  viewStore.toggleProjectedElements();
}

/**
 * Fit viewport to show all elements (T274)
 */
function handleFitToView() {
  emit('fit-to-view');
}

/**
 * T406: Handle sign in request
 */
function handleSignIn() {
  emit('sign-in');
}

/**
 * T407: Handle sign out request
 */
function handleSignOut() {
  emit('sign-out');
}
</script>

<style scoped>
.toolbar {
  display: flex;
  gap: 8px;
  padding: 8px;
  background-color: #f5f5f5;
  border-bottom: 1px solid #ddd;
  align-items: center;
}

.file-controls {
  display: flex;
  gap: 4px;
}

.file-button {
  padding: 0;
  width: 40px;
  height: 40px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background-color: #fff;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.file-button:hover {
  background-color: #e8e8e8;
  border-color: #999;
}

.file-button .button-icon {
  width: 24px;
  height: 24px;
}

.history-controls {
  display: flex;
  gap: 4px;
}

.toolbar-separator {
  width: 1px;
  height: 32px;
  background-color: #ccc;
  margin: 0 4px;
}

.history-button {
  padding: 0;
  width: 40px;
  height: 40px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background-color: #fff;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.history-button:hover:not(:disabled) {
  background-color: #e8e8e8;
  border-color: #999;
}

.history-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.history-button .button-icon {
  width: 24px;
  height: 24px;
}

.navigation-controls {
  display: flex;
  gap: 4px;
}

.nav-button {
  padding: 0;
  width: 40px;
  height: 40px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background-color: #fff;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-button:hover {
  background-color: #e8e8e8;
  border-color: #999;
}

.nav-button.active {
  background-color: #4A90E2;
  color: #fff;
  border-color: #4A90E2;
}

.nav-button .button-icon {
  width: 24px;
  height: 24px;
}

.tool-button {
  padding: 0;
  width: 40px;
  height: 40px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background-color: #fff;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tool-button:hover {
  background-color: #e8e8e8;
  border-color: #999;
}

.tool-button.active {
  background-color: #4A90E2;
  color: #fff;
  border-color: #4A90E2;
}

.tool-button .button-icon {
  width: 24px;
  height: 24px;
}
</style>

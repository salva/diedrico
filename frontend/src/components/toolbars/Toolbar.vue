<template>
  <div class="toolbar">
    <!-- File operation buttons -->
    <div class="file-controls">
      <button
        class="file-button"
        @click="handleNew"
        title="New Project (Ctrl+N)"
      >
        <svg width="20" height="20" viewBox="0 0 20 20">
          <rect x="4" y="2" width="12" height="16" rx="1" stroke="currentColor" stroke-width="2" fill="none" />
          <line x1="10" y1="7" x2="10" y2="13" stroke="currentColor" stroke-width="2" />
          <line x1="7" y1="10" x2="13" y2="10" stroke="currentColor" stroke-width="2" />
        </svg>
        <span>New</span>
      </button>
      
      <button
        class="file-button"
        @click="handleOpen"
        title="Open Project (Ctrl+O)"
      >
        <svg width="20" height="20" viewBox="0 0 20 20">
          <path d="M 3 7 L 3 17 C 3 17.5 3.5 18 4 18 L 16 18 C 16.5 18 17 17.5 17 17 L 17 6 C 17 5.5 16.5 5 16 5 L 9 5 L 7 3 L 4 3 C 3.5 3 3 3.5 3 4 Z" stroke="currentColor" stroke-width="1.5" fill="none" />
        </svg>
        <span>Open</span>
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
      >
        <svg width="20" height="20" viewBox="0 0 20 20">
          <path d="M 12 4 L 8 8 L 12 12 M 8 8 L 18 8 C 18 8 18 16 12 16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <span>Undo</span>
      </button>
      
      <button
        class="history-button"
        :disabled="!canRedo"
        @click="handleRedo"
        title="Redo (Ctrl+Y)"
      >
        <svg width="20" height="20" viewBox="0 0 20 20">
          <path d="M 8 4 L 12 8 L 8 12 M 12 8 L 2 8 C 2 8 2 16 8 16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <span>Redo</span>
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
      >
        <svg width="20" height="20" viewBox="0 0 20 20">
          <line x1="5" y1="2" x2="5" y2="18" stroke="currentColor" stroke-width="1" opacity="0.5" />
          <line x1="10" y1="2" x2="10" y2="18" stroke="currentColor" stroke-width="1" opacity="0.5" />
          <line x1="15" y1="2" x2="15" y2="18" stroke="currentColor" stroke-width="1" opacity="0.5" />
          <line x1="2" y1="5" x2="18" y2="5" stroke="currentColor" stroke-width="1" opacity="0.5" />
          <line x1="2" y1="10" x2="18" y2="10" stroke="currentColor" stroke-width="1" opacity="0.5" />
          <line x1="2" y1="15" x2="18" y2="15" stroke="currentColor" stroke-width="1" opacity="0.5" />
        </svg>
        <span>Grid</span>
      </button>

      <button
        class="nav-button"
        @click="handleFitToView"
        title="Fit to View (Ctrl+0)"
      >
        <svg width="20" height="20" viewBox="0 0 20 20">
          <rect x="3" y="3" width="14" height="14" rx="1" stroke="currentColor" stroke-width="1.5" fill="none" />
          <path d="M 6 6 L 8 8 M 6 6 L 6 8 M 6 6 L 8 6" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" />
          <path d="M 14 14 L 12 12 M 14 14 L 14 12 M 14 14 L 12 14" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" />
        </svg>
        <span>Fit</span>
      </button>
    </div>
    
    <div class="toolbar-separator"></div>
    
    <!-- Tool buttons -->
    <!-- Phase 54.5: Selection Tool -->
    <button
      class="tool-button"
      :class="{ active: toolStore.isToolActive('select') }"
      @click="selectTool('select')"
      title="Selection Tool - Pick, move, and edit objects (Esc)"
    >
      <svg width="20" height="20" viewBox="0 0 20 20">
        <!-- Pointer/arrow cursor icon -->
        <path d="M 3 2 L 3 16 L 7 12 L 10 18 L 12 17 L 9 11 L 14 11 Z" fill="currentColor" />
      </svg>
      <span>Select</span>
    </button>
    
    <button
      class="tool-button"
      :class="{ active: toolStore.isToolActive('point') }"
      @click="selectTool('point')"
      title="Point Tool (P)"
    >
      <svg width="20" height="20" viewBox="0 0 20 20">
        <circle cx="10" cy="10" r="4" fill="currentColor" />
      </svg>
      <span>Point</span>
    </button>
    
    <button
      class="tool-button"
      :class="{ active: toolStore.isToolActive('line') }"
      @click="selectTool('line')"
      title="Line Tool (L)"
    >
      <svg width="20" height="20" viewBox="0 0 20 20">
        <line x1="2" y1="18" x2="18" y2="2" stroke="currentColor" stroke-width="2" />
      </svg>
      <span>Line</span>
    </button>

    <button
      class="tool-button"
      :class="{ active: toolStore.isToolActive('parallel-line') }"
      @click="selectTool('parallel-line')"
      title="Parallel Line Tool - Create line parallel to reference through point"
    >
      <svg width="20" height="20" viewBox="0 0 20 20">
        <!-- Two parallel lines -->
        <line x1="2" y1="6" x2="18" y2="6" stroke="currentColor" stroke-width="2" />
        <line x1="2" y1="14" x2="18" y2="14" stroke="currentColor" stroke-width="2" />
      </svg>
      <span>Parallel</span>
    </button>

    <button
      class="tool-button"
      :class="{ active: toolStore.isToolActive('segment') }"
      @click="selectTool('segment')"
      title="Segment Tool (S)"
    >
      <svg width="20" height="20" viewBox="0 0 20 20">
        <line x1="2" y1="18" x2="18" y2="2" stroke="currentColor" stroke-width="3" />
        <circle cx="2" cy="18" r="2" fill="currentColor" />
        <circle cx="18" cy="2" r="2" fill="currentColor" />
      </svg>
      <span>Segment</span>
    </button>

    <button
      class="tool-button"
      :class="{ active: toolStore.isToolActive('circle') }"
      @click="selectTool('circle')"
      title="Circle Tool (C)"
    >
      <svg width="20" height="20" viewBox="0 0 20 20">
        <circle cx="10" cy="10" r="7" stroke="currentColor" stroke-width="2" fill="none" />
        <circle cx="10" cy="10" r="1.5" fill="currentColor" />
      </svg>
      <span>Circle</span>
    </button>

    <button
      class="tool-button"
      :class="{ active: toolStore.isToolActive('guide') }"
      @click="selectTool('guide')"
      title="Guide Tool (G)"
    >
      <svg width="20" height="20" viewBox="0 0 20 20">
        <line x1="2" y1="10" x2="18" y2="10" stroke="currentColor" stroke-width="2" stroke-dasharray="3,2" />
        <path d="M 10 5 L 10 15" stroke="currentColor" stroke-width="1.5" />
      </svg>
      <span>Guide</span>
    </button>

    <button
      class="tool-button"
      :class="{ active: toolStore.isToolActive('intersection') }"
      @click="selectTool('intersection')"
      title="Intersection Tool (I)"
    >
      <svg width="20" height="20" viewBox="0 0 20 20">
        <!-- Two crossing lines -->
        <line x1="2" y1="18" x2="18" y2="2" stroke="currentColor" stroke-width="2" />
        <line x1="2" y1="2" x2="18" y2="18" stroke="currentColor" stroke-width="2" />
        <!-- Intersection point -->
        <circle cx="10" cy="10" r="2.5" fill="currentColor" />
      </svg>
      <span>Intersection</span>
    </button>

    <!-- T406: Login Status Widget at far right -->
    <LoginStatusWidget
      @sign-in="handleSignIn"
      @sign-out="handleSignOut"
    />
  </div>
</template>

<script setup lang="ts">
import { inject, computed, onMounted, onUnmounted } from 'vue';
import { useToolStore } from '@/stores/toolStore';
import { useViewStore } from '@/stores/viewStore';
import { CommandStack } from '@/commands/CommandStack';
import LoginStatusWidget from '@/components/LoginStatusWidget.vue';
import PlaneSelector from '@/components/toolbars/PlaneSelector.vue';

/**
 * Toolbar.vue - Tool selection toolbar
 * 
 * Provides buttons for selecting geometric construction tools (Point, Line, etc.),
 * file operations (New, Open), and history controls (Undo/Redo).
 * Manages active tool state via tool store.
 * 
 * Reference: specs/001-dihedral-learning-mvp/ui-spec.md - Toolbar Component
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

// Inject command stack for undo/redo
const commandStack = inject<CommandStack>('commandStack')!;
if (!commandStack) {
  throw new Error('CommandStack not provided');
}

// Computed properties for undo/redo availability
const canUndo = computed(() => commandStack.canUndo());
const canRedo = computed(() => commandStack.canRedo());

// Grid visibility
const gridVisible = computed(() => viewStore.gridVisible.value);

/**
 * Select a tool
 */
function selectTool(tool: 'select' | 'point' | 'line' | 'circle' | 'segment' | 'guide' | 'intersection') {
  console.log('Selecting tool:', tool);
  toolStore.setTool(tool);
  console.log('Tool set. Current tool:', toolStore.currentTool);
}

/**
 * Handle global keyboard shortcuts
 * Phase 54.5: Esc activates Selection Tool
 */
function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    selectTool('select');
    event.preventDefault();
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
});

/**
 * Handle undo action
 */
function handleUndo() {
  if (commandStack.canUndo()) {
    commandStack.undo();
  }
}

/**
 * Handle redo action
 */
function handleRedo() {
  if (commandStack.canRedo()) {
    commandStack.redo();
  }
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
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background-color: #fff;
  cursor: pointer;
  transition: all 0.2s;
}

.file-button:hover {
  background-color: #e8e8e8;
  border-color: #999;
}

.file-button span {
  font-size: 10px;
  font-weight: 500;
}

.file-button svg {
  width: 18px;
  height: 18px;
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
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background-color: #fff;
  cursor: pointer;
  transition: all 0.2s;
}

.history-button:hover:not(:disabled) {
  background-color: #e8e8e8;
  border-color: #999;
}

.history-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.history-button span {
  font-size: 10px;
  font-weight: 500;
}

.history-button svg {
  width: 18px;
  height: 18px;
}

.navigation-controls {
  display: flex;
  gap: 4px;
}

.nav-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background-color: #fff;
  cursor: pointer;
  transition: all 0.2s;
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

.nav-button span {
  font-size: 10px;
  font-weight: 500;
}

.nav-button svg {
  width: 18px;
  height: 18px;
}

.tool-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background-color: #fff;
  cursor: pointer;
  transition: all 0.2s;
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

.tool-button span {
  font-size: 11px;
  font-weight: 500;
}

.tool-button svg {
  width: 20px;
  height: 20px;
}
</style>

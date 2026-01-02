<template>
  <div class="toolbar">
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
    
    <!-- Tool buttons -->
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
  </div>
</template>

<script setup lang="ts">
import { inject, computed } from 'vue';
import { useToolStore } from '@/stores/toolStore';
import { CommandStack } from '@/commands/CommandStack';

/**
 * Toolbar.vue - Tool selection toolbar
 * 
 * Provides buttons for selecting geometric construction tools (Point, Line, etc.)
 * and history controls (Undo/Redo).
 * Manages active tool state via tool store.
 * 
 * Reference: specs/001-dihedral-learning-mvp/ui-spec.md - Toolbar Component
 */

const toolStore = useToolStore();

// Inject command stack for undo/redo
const commandStack = inject<CommandStack>('commandStack')!;
if (!commandStack) {
  throw new Error('CommandStack not provided');
}

// Computed properties for undo/redo availability
const canUndo = computed(() => commandStack.canUndo());
const canRedo = computed(() => commandStack.canRedo());

/**
 * Select a tool
 */
function selectTool(tool: 'point' | 'line' | 'circle' | 'segment' | 'guide' | 'intersection') {
  console.log('Selecting tool:', tool);
  toolStore.setTool(tool);
  console.log('Tool set. Current tool:', toolStore.currentTool);
}

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

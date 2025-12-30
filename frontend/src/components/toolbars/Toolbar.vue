<template>
  <div class="toolbar">
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
  </div>
</template>

<script setup lang="ts">
import { useToolStore } from '@/stores/toolStore';

/**
 * Toolbar.vue - Tool selection toolbar
 * 
 * Provides buttons for selecting geometric construction tools (Point, Line, etc.)
 * Manages active tool state via tool store.
 * 
 * Reference: specs/001-dihedral-learning-mvp/ui-spec.md - Toolbar Component
 */

const toolStore = useToolStore();

/**
 * Select a tool
 */
function selectTool(tool: 'point' | 'line' | 'circle' | 'segment') {
  console.log('Selecting tool:', tool);
  toolStore.setTool(tool);
  console.log('Tool set. Current tool:', toolStore.currentTool);
}
</script>

<style scoped>
.toolbar {
  display: flex;
  gap: 8px;
  padding: 8px;
  background-color: #f5f5f5;
  border-bottom: 1px solid #ddd;
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

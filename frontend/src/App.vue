<template>
  <div id="app" class="app-container">
    <!-- Header: Top toolbar area -->
    <header class="app-header">
      <h1 class="app-title">Diedrico - Dihedral Learning MVP</h1>
      <Toolbar />
    </header>

    <!-- Main Workspace: Sidebar + Canvas area -->
    <main class="app-main">
      <!-- Left Sidebar: Actions Panel -->
      <aside class="left-sidebar">
        <ActionsPanel 
          @highlight-elements="handleHighlightElements"
          @clear-highlight="handleClearHighlight"
        />
      </aside>

      <!-- Canvas Area -->
      <div class="canvas-area">
        <SvgCanvas 
          ref="svgCanvasRef"
          @update-3d-coordinates="handleCoordinateUpdate"
          @update-active-plane="handleActivePlaneUpdate"
        />
      </div>
    </main>

    <!-- Footer: Status bar -->
    <footer class="app-footer">
      <StatusBar 
        :active-plane-id="activePlaneId"
        :active-plane-name="activePlaneName"
        :active-tool="activeTool"
        :coordinates3-d="coordinates3D"
      />
    </footer>
  </div>
</template>

<script setup lang="ts">
/**
 * App.vue - Root application component
 * 
 * Provides the main layout structure for the Diedrico application.
 * Layout follows the specification:
 * - Header: Top toolbars for tool families, active plane, navigation
 * - Main: Central workspace with 2D drawing canvas (SVG)
 * - Footer: Status bar showing coordinates, active tool, etc.
 * 
 * @see specs/001-dihedral-learning-mvp/ui-spec.md#overall-layout-architecture
 */

import { provide, ref, onMounted, onUnmounted } from 'vue';
import SvgCanvas from './components/workspace/SvgCanvas.vue';
import Toolbar from './components/toolbars/Toolbar.vue';
import StatusBar from './components/toolbars/StatusBar.vue';
import ActionsPanel from './components/panels/ActionsPanel.vue';
import { CommandStack } from './commands/CommandStack';
import { useToolStore } from './stores/toolStore';

// Create command stack and provide to all child components
const commandStack = new CommandStack();
provide('commandStack', commandStack);

// SVG Canvas reference for accessing World and methods
const svgCanvasRef = ref<InstanceType<typeof SvgCanvas> | null>(null);

// Tool state
const toolStore = useToolStore();
const activeTool = toolStore.currentTool;

// Active plane state
const activePlaneId = ref('proj_plane_H');
const activePlaneName = ref('P_H (Horizontal)');

// 3D coordinates state
const coordinates3D = ref<{ x: number; y: number; z: number } | null>(null);

/**
 * Handle coordinate updates from canvas
 */
function handleCoordinateUpdate(coords: { x: number; y: number; z: number } | null) {
  coordinates3D.value = coords;
}

/**
 * Handle active plane changes
 */
function handleActivePlaneUpdate(planeInfo: { id: string; name: string }) {
  activePlaneId.value = planeInfo.id;
  activePlaneName.value = planeInfo.name;
}

/**
 * Handle element highlighting from ActionsPanel
 */
function handleHighlightElements(elementIds: string[], temporary: boolean) {
  // TODO: Implement element highlighting in Paper/SVGRenderer
  // For now, just log the action
  console.log('Highlight elements:', elementIds, 'temporary:', temporary);
}

/**
 * Handle clearing element highlights
 */
function handleClearHighlight() {
  // TODO: Implement clearing highlights in Paper/SVGRenderer
  console.log('Clear highlights');
}

/**
 * Handle keyboard shortcuts for undo/redo
 * Ctrl+Z: Undo
 * Ctrl+Y or Ctrl+Shift+Z: Redo
 */
function handleKeyDown(event: KeyboardEvent) {
  // Check for Ctrl (Windows/Linux) or Cmd (Mac)
  const isModifier = event.ctrlKey || event.metaKey;
  
  if (!isModifier) return;
  
  // Undo: Ctrl+Z (without Shift)
  if (event.key === 'z' && !event.shiftKey && commandStack.canUndo()) {
    event.preventDefault();
    commandStack.undo();
    return;
  }
  
  // Redo: Ctrl+Shift+Z or Ctrl+Y
  if ((event.key === 'z' && event.shiftKey) || event.key === 'y') {
    if (commandStack.canRedo()) {
      event.preventDefault();
      commandStack.redo();
    }
    return;
  }
}

// Setup keyboard listeners
onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
});
</script>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background-color: #f5f5f5;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background-color: #2c3e50;
  color: #ecf0f1;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}

.app-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.app-main {
  flex: 1;
  display: flex;
  overflow: hidden;
  position: relative;
}

.left-sidebar {
  width: 300px;
  flex-shrink: 0;
  overflow: hidden;
  background-color: #f8f9fa;
  border-right: 1px solid #dee2e6;
}

.canvas-area {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.app-footer {
  /* StatusBar component handles its own styling */
  flex-shrink: 0;
}
</style>

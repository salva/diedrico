<template>
  <div id="app" class="app-container">
    <!-- Header: Top toolbar area -->
    <header class="app-header">
      <h1 class="app-title">Diedrico - Dihedral Learning MVP</h1>
      <Toolbar />
    </header>

    <!-- Main Workspace: Canvas area -->
    <main class="app-main">
      <SvgCanvas />
    </main>

    <!-- Footer: Status bar -->
    <footer class="app-footer">
      <div class="status-info">
        <!-- Status information will be added in later phases -->
      </div>
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

import { provide, onMounted, onUnmounted } from 'vue';
import SvgCanvas from './components/workspace/SvgCanvas.vue';
import Toolbar from './components/toolbars/Toolbar.vue';
import { CommandStack } from './commands/CommandStack';

// Create command stack and provide to all child components
const commandStack = new CommandStack();
provide('commandStack', commandStack);

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

.app-footer {
  padding: 0.5rem 1rem;
  background-color: #34495e;
  color: #ecf0f1;
  font-size: 0.875rem;
  border-top: 1px solid #2c3e50;
  flex-shrink: 0;
}

.status-info {
  display: flex;
  gap: 1rem;
}
</style>

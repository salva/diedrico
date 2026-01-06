<template>
  <div id="app" class="app-container">
    <!-- Startup Dialog for Google Drive authentication and project selection -->
    <StartupDialog
      v-if="showStartupDialog"
      ref="startupDialogRef"
      :show="showStartupDialog"
      :is-signed-in="isSignedIn"
      @sign-in="handleSignIn"
      @create="handleCreateProject"
      @open="handleOpenProject"
    />

    <!-- Header: Top toolbar area -->
    <header class="app-header">
      <h1 class="app-title">Diedrico - Dihedral Learning MVP</h1>
      <Toolbar />
    </header>

    <!-- Main Workspace: Sidebar + Canvas area -->
    <main class="app-main">
      <!-- Left Sidebar: Stacked Panels -->
      <aside class="left-sidebar">
        <div class="panel-stack">
          <!-- Elements Panel (top) -->
          <div class="stacked-panel">
            <ElementsPanel 
              @highlight-elements="handleHighlightElements"
              @clear-highlight="handleClearHighlight"
            />
          </div>
          
          <!-- Resizer -->
          <div class="panel-resizer"></div>
          
          <!-- Actions Panel (bottom) -->
          <div class="stacked-panel">
            <ActionsPanel 
              @highlight-elements="handleHighlightElements"
              @clear-highlight="handleClearHighlight"
            />
          </div>
        </div>
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
        :save-status="saveStatus"
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
 * Features Google Drive integration:
 * - Startup dialog for authentication and project selection
 * - Auto-save with 2-second debounce after changes
 * - Status indicator for save operations
 * 
 * @see specs/001-dihedral-learning-mvp/ui-spec.md#overall-layout-architecture
 * @see specs/001-dihedral-learning-mvp/ui-spec.md#startup-flow-and-google-drive-authentication
 */

import { provide, ref, onMounted, onUnmounted, watch } from 'vue';
import SvgCanvas from './components/workspace/SvgCanvas.vue';
import Toolbar from './components/toolbars/Toolbar.vue';
import StatusBar from './components/toolbars/StatusBar.vue';
import ActionsPanel from './components/panels/ActionsPanel.vue';
import ElementsPanel from './components/panels/ElementsPanel.vue';
import StartupDialog from './components/dialogs/StartupDialog.vue';
import { CommandStack } from './commands/CommandStack';
import { useToolStore } from './stores/toolStore';
import { World } from './domain/world/World';
import { GoogleDriveService } from './services/GoogleDriveService';
import { ProjectService } from './services/ProjectService';

// Google Drive configuration (from environment variables)
const GOOGLE_CONFIG = {
  clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
  apiKey: import.meta.env.VITE_GOOGLE_API_KEY || '',
  appId: import.meta.env.VITE_GOOGLE_APP_ID || '',
};

// Create World instance and provide to all child components
const world = new World();
provide('world', world);

// Create command stack and provide to all child components
const commandStack = new CommandStack();
provide('commandStack', commandStack);

// Google Drive service
const driveService = new GoogleDriveService(GOOGLE_CONFIG);

// SVG Canvas reference for accessing World and methods
const svgCanvasRef = ref<InstanceType<typeof SvgCanvas> | null>(null);
const startupDialogRef = ref<InstanceType<typeof StartupDialog> | null>(null);

// Tool state
const toolStore = useToolStore();
const activeTool = toolStore.currentTool;

// Active plane state
const activePlaneId = ref('proj_plane_H');
const activePlaneName = ref('P_H (Horizontal)');

// 3D coordinates state
const coordinates3D = ref<{ x: number; y: number; z: number } | null>(null);

// Startup and authentication state
const showStartupDialog = ref(false);
const isSignedIn = ref(false);

// Project state
const currentProjectName = ref<string | null>(null);
const currentFileId = ref<string | null>(null);

// Save status
const saveStatus = ref<'idle' | 'saving' | 'saved'>('idle');

// Auto-save debounce timer
let autoSaveTimer: NodeJS.Timeout | null = null;
const AUTO_SAVE_DELAY_MS = 2000; // 2 seconds

/**
 * Initialize Google Drive API and show startup dialog
 */
async function initializeApp() {
  try {
    await driveService.initialize();
    isSignedIn.value = driveService.isSignedIn();
    
    // Show startup dialog if not signed in or no project loaded
    showStartupDialog.value = true;
  } catch (error) {
    console.error('Failed to initialize Google Drive:', error);
    alert('Failed to initialize Google Drive API. Please check your API credentials.');
  }
}

/**
 * Handle sign-in button click
 */
async function handleSignIn() {
  try {
    await driveService.signIn();
    isSignedIn.value = driveService.isSignedIn();
    
    // Load file list after sign-in
    const files = await driveService.listFiles();
    startupDialogRef.value?.setFiles(files);
    startupDialogRef.value?.setLoading(false);
  } catch (error) {
    console.error('Sign-in failed:', error);
    startupDialogRef.value?.setError(`Sign-in failed: ${error}`);
    startupDialogRef.value?.setLoading(false);
  }
}

/**
 * Handle create new project
 */
async function handleCreateProject(projectName: string) {
  try {
    // Serialize current world state
    const projectData = ProjectService.serializeWorld(world, projectName);
    
    // Create file in Google Drive
    const fileId = await driveService.createFile(projectName, projectData);
    
    // Update state
    currentProjectName.value = projectName;
    currentFileId.value = fileId;
    showStartupDialog.value = false;
    
    // Start watching for changes to enable auto-save
    startAutoSave();
    
    saveStatus.value = 'saved';
  } catch (error) {
    console.error('Failed to create project:', error);
    startupDialogRef.value?.setError(`Failed to create project: ${error}`);
    startupDialogRef.value?.setLoading(false);
  }
}

/**
 * Handle open existing project
 */
async function handleOpenProject(fileId: string) {
  try {
    // Load file from Google Drive
    const projectData = await driveService.loadFile(fileId);
    
    // Validate and deserialize
    ProjectService.validateProjectData(projectData);
    const loadedWorld = ProjectService.deserializeWorld(projectData);
    
    // Replace current world with loaded world
    // Copy all properties from loadedWorld to world
    world.planes = loadedWorld.planes;
    world.hingeLines = loadedWorld.hingeLines;
    world.points = loadedWorld.points;
    world.lines = loadedWorld.lines;
    world.segments = loadedWorld.segments;
    world.guides = loadedWorld.guides;
    world.circles = loadedWorld.circles;
    
    // Update state
    currentProjectName.value = (projectData as any).name;
    currentFileId.value = fileId;
    showStartupDialog.value = false;
    
    // Start watching for changes to enable auto-save
    startAutoSave();
    
    saveStatus.value = 'saved';
  } catch (error) {
    console.error('Failed to open project:', error);
    startupDialogRef.value?.setError(`Failed to open project: ${error}`);
    startupDialogRef.value?.setLoading(false);
  }
}

/**
 * Start auto-save watcher
 * Watches for changes to World and triggers auto-save after debounce
 */
function startAutoSave() {
  // Watch world's version property for changes
  // Whenever world changes, the version should be incremented
  let lastVersion = world.getVersion();
  
  const checkInterval = setInterval(() => {
    const currentVersion = world.getVersion();
    if (currentVersion !== lastVersion) {
      lastVersion = currentVersion;
      scheduleAutoSave();
    }
  }, 100); // Check every 100ms
  
  // Store interval ID for cleanup
  (window as any).__autoSaveInterval = checkInterval;
}

/**
 * Schedule auto-save with debounce
 */
function scheduleAutoSave() {
  // Clear existing timer
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
  }
  
  // Set status to indicate pending save
  saveStatus.value = 'saving';
  
  // Schedule new save
  autoSaveTimer = setTimeout(async () => {
    await performAutoSave();
  }, AUTO_SAVE_DELAY_MS);
}

/**
 * Perform the actual auto-save operation
 */
async function performAutoSave() {
  if (!currentFileId.value || !currentProjectName.value) {
    return;
  }
  
  try {
    // Serialize current world state
    const projectData = ProjectService.serializeWorld(world, currentProjectName.value);
    
    // Update file in Google Drive
    await driveService.updateFile(currentFileId.value, projectData);
    
    saveStatus.value = 'saved';
    
    // Reset to idle after 2 seconds
    setTimeout(() => {
      if (saveStatus.value === 'saved') {
        saveStatus.value = 'idle';
      }
    }, 2000);
  } catch (error: any) {
    console.error('Auto-save failed:', error);
    saveStatus.value = 'idle';
    
    // Handle specific error types
    if (error.message?.includes('authentication') || error.message?.includes('401')) {
      // Authentication expired - show startup dialog again
      console.warn('Authentication expired, showing sign-in dialog');
      showStartupDialog.value = true;
      isSignedIn.value = false;
      
      // Stop auto-save
      if ((window as any).__autoSaveInterval) {
        clearInterval((window as any).__autoSaveInterval);
      }
    } else if (error.message?.includes('quota') || error.message?.includes('403')) {
      // Quota exceeded
      alert('Google Drive storage quota exceeded. Please free up space or upgrade your account.');
    } else if (error.message?.includes('network') || error.message?.includes('Failed to fetch')) {
      // Network error - retry later
      console.warn('Network error during auto-save, will retry on next change');
    } else {
      // Unknown error
      console.error('Unknown auto-save error:', error);
    }
  }
}

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
 * Handle keyboard shortcuts
 * Ctrl+Z: Undo
 * Ctrl+Y or Ctrl+Shift+Z: Redo
 * Ctrl+N: New project (show startup dialog)
 * Ctrl+O: Open project (show startup dialog)
 * Esc: Cancel current operation/deselect
 * Delete/Backspace: Delete selected objects
 * P/L/S/C/G: Tool shortcuts (Point/Line/Segment/Circle/Guide)
 */
function handleKeyDown(event: KeyboardEvent) {
  // Check for Ctrl (Windows/Linux) or Cmd (Mac)
  const isModifier = event.ctrlKey || event.metaKey;
  
  // Esc: Cancel current operation or deselect (T272)
  if (event.key === 'Escape') {
    event.preventDefault();
    toolStore.resetTool();
    return;
  }
  
  // Delete/Backspace: Delete selected objects (T271)
  if (event.key === 'Delete' || event.key === 'Backspace') {
    // Only if not in an input field
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      return; // Allow default behavior in input fields
    }
    event.preventDefault();
    // TODO: Implement delete selected objects
    console.log('Delete selected objects (not yet implemented)');
    return;
  }
  
  // Tool shortcuts without modifier (T273)
  if (!isModifier && !event.shiftKey && !event.altKey) {
    const target = event.target as HTMLElement;
    // Only activate tool shortcuts if not in an input field
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      return;
    }
    
    switch (event.key.toLowerCase()) {
      case 'p':
        event.preventDefault();
        toolStore.setTool('point');
        return;
      case 'l':
        event.preventDefault();
        toolStore.setTool('line');
        return;
      case 's':
        event.preventDefault();
        toolStore.setTool('segment');
        return;
      case 'c':
        event.preventDefault();
        toolStore.setTool('circle');
        return;
      case 'g':
        event.preventDefault();
        toolStore.setTool('guide');
        return;
    }
  }
  
  // Shortcuts with modifier key
  if (!isModifier) return;
  
  // Ctrl+N: New project (T269)
  if (event.key === 'n') {
    event.preventDefault();
    // Reset world and show startup dialog
    showStartupDialog.value = true;
    currentProjectName.value = null;
    currentFileId.value = null;
    return;
  }
  
  // Ctrl+O: Open project (T268)
  if (event.key === 'o') {
    event.preventDefault();
    showStartupDialog.value = true;
    return;
  }
  
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
  
  // Initialize app and show startup dialog
  initializeApp();
  
  // Listen for file list requests from StartupDialog
  window.addEventListener('load-files', async () => {
    try {
      const files = await driveService.listFiles();
      startupDialogRef.value?.setFiles(files);
    } catch (error) {
      console.error('Failed to load files:', error);
      startupDialogRef.value?.setError(`Failed to load files: ${error}`);
    }
  });
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
  
  // Clear auto-save interval
  if ((window as any).__autoSaveInterval) {
    clearInterval((window as any).__autoSaveInterval);
  }
  
  // Clear auto-save timer
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
  }
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
  display: flex;
  flex-direction: column;
}

.panel-stack {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.stacked-panel {
  flex: 1;
  min-height: 150px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.stacked-panel:first-child {
  border-bottom: 1px solid #dee2e6;
}

.panel-resizer {
  height: 4px;
  background-color: #dee2e6;
  cursor: ns-resize;
  flex-shrink: 0;
  transition: background-color 0.2s;
}

.panel-resizer:hover {
  background-color: #adb5bd;
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

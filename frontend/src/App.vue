<template>
  <div id="app" class="app-container">
    <!-- Startup Dialog for Google Drive authentication and project selection -->
    <StartupDialog
      v-if="showStartupDialog"
      ref="startupDialogRef"
      :show="showStartupDialog"
      :is-signed-in="isSignedIn"
      @sign-in="handleSignIn"
      @open="handleOpenProject"
    />

    <!-- Header: Top toolbar area -->
    <header class="app-header">
      <ProjectNameDisplay 
        ref="projectNameDisplayRef"
        :project-name="currentProjectName"
        :is-renaming="isRenamingProject"
        @rename="handleRenameProject"
      />
      <Toolbar 
        @new-project="handleNewProject"
        @open-project="handleOpenProjectDialog"
        @fit-to-view="handleFitToView"
        @sign-in="handleToolbarSignIn"
        @sign-out="handleToolbarSignOut"
      />
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
        
        <!-- 3D View Overlay (Phase 25) -->
        <div class="three-view-overlay" v-if="show3DView">
          <ThreeView />
        </div>
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
        :cascade-count="selectionStore.cascadeHighlightIdsArray.length"
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

import { provide, ref, computed, onMounted, onUnmounted, watch } from 'vue';
import SvgCanvas from './components/workspace/SvgCanvas.vue';
import Toolbar from './components/toolbars/Toolbar.vue';
import StatusBar from './components/toolbars/StatusBar.vue';
import ActionsPanel from './components/panels/ActionsPanel.vue';
import ElementsPanel from './components/panels/ElementsPanel.vue';
import ThreeView from './components/panels/ThreeView.vue';
import StartupDialog from './components/dialogs/StartupDialog.vue';
import ProjectNameDisplay from './components/header/ProjectNameDisplay.vue';
import { CommandStack } from './commands/CommandStack';
import { Command } from './commands/Command';
import { DeletionSequenceFactory } from './commands/factories/DeletionSequenceFactory';
import { useToolStore } from './stores/toolStore';
import { TOOL_FAMILIES } from './config/toolFamilies';
import { useSelectionStore } from './stores/selectionStore';
import { useSettingsStore } from './stores/settingsStore';
import { useAuthStore } from './stores/authStore';
import { World } from './domain/world/World';
import { GoogleDriveService } from './services/GoogleDriveService';
import { ProjectService } from './services/ProjectService';

// Google Drive configuration (from environment variables)
const GOOGLE_CONFIG = {
  clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
  apiKey: import.meta.env.VITE_GOOGLE_API_KEY || '',
  appId: import.meta.env.VITE_GOOGLE_APP_ID || '',
};

// Debug: Log environment variable loading
console.log('[DEBUG] Environment variables:', {
  clientId: GOOGLE_CONFIG.clientId ? `${GOOGLE_CONFIG.clientId.substring(0, 20)}...` : 'NOT SET',
  hasApiKey: !!GOOGLE_CONFIG.apiKey,
  hasAppId: !!GOOGLE_CONFIG.appId,
  allEnvVars: import.meta.env,
});

// Check if Google Drive credentials are configured
// Only Client ID is strictly required for OAuth; API key is optional but recommended
const hasGoogleCredentials = GOOGLE_CONFIG.clientId;
console.log('[DEBUG] hasGoogleCredentials:', hasGoogleCredentials);

// Create World instance and provide to all child components
let world = new World();
provide('world', world);

// Create command stack and provide to all child components
const commandStack = new CommandStack();
provide('commandStack', commandStack);

// Google Drive service (only if credentials are available)
const driveService = hasGoogleCredentials ? new GoogleDriveService(GOOGLE_CONFIG) : null;

// SVG Canvas reference for accessing World and methods
const svgCanvasRef = ref<InstanceType<typeof SvgCanvas> | null>(null);
const startupDialogRef = ref<InstanceType<typeof StartupDialog> | null>(null);
const projectNameDisplayRef = ref<InstanceType<typeof ProjectNameDisplay> | null>(null);

// Tool state
const toolStore = useToolStore();
// Initialize tool families configuration
toolStore.setToolFamilies(TOOL_FAMILIES);
const activeTool = toolStore.currentTool;

// Selection state (T271)
const selectionStore = useSelectionStore();

// Settings state (T281-T282)
// Initialize settings store to load preferences from localStorage
// Settings are automatically loaded on store initialization and saved on changes
useSettingsStore();

// T403: Authentication state
const authStore = useAuthStore();

// Active plane state - will be set after world initialization
// Active plane state - read from World (set by initialization factory)
const activePlaneId = computed(() => world.getActivePlaneId());
const activePlaneName = computed(() => {
  const planeId = world.getActivePlaneId();
  if (!planeId) return '';
  
  // Determine plane name based on semantic role
  try {
    const horizontalPlane = world.getProjectionPlaneByLabel('P_H');
    if (planeId === horizontalPlane.id) {
      return 'P_H (Horizontal)';
    }
  } catch {}
  
  try {
    const verticalPlane = world.getProjectionPlaneByLabel('P_V');
    if (planeId === verticalPlane.id) {
      return 'P_V (Vertical)';
    }
  } catch {}
  
  return planeId;
});

// 3D coordinates state
const coordinates3D = ref<{ x: number; y: number; z: number } | null>(null);

// 3D view toggle state (Phase 25)
const show3DView = ref(true);  // Enabled by default for testing

// Startup and authentication state
const showStartupDialog = ref(false);
const isSignedIn = ref(false);

// Project state
const currentProjectName = ref<string | null>(null);
const currentFileId = ref<string | null>(null);
const isRenamingProject = ref(false);

// Save status
const saveStatus = ref<'idle' | 'saving' | 'saved'>('idle');

// Auto-save debounce timer
let autoSaveTimer: NodeJS.Timeout | null = null;
const AUTO_SAVE_DELAY_MS = 2000; // 2 seconds

/**
 * Update cascade highlight when selection changes (T289)
 * Shows which elements will be deleted due to dependencies
 */
watch(() => selectionStore.selectedIdsArray, (selectedIds) => {
  if (selectedIds.length === 0) {
    selectionStore.clearCascadeHighlight();
    return;
  }
  
  // Compute cascade deletion preview
  const dependencyService = world.getDependencyService();
  const allElementsToDelete = dependencyService.getElementsInDeletionOrder(selectedIds);
  
  // Cascade elements are those not directly selected
  const cascadedElements = allElementsToDelete.filter(id => !selectedIds.includes(id));
  
  // Update cascade highlight state
  selectionStore.setCascadeHighlight(cascadedElements);
  
  console.log('[App] Cascade preview:', {
    selected: selectedIds,
    cascaded: cascadedElements,
    total: allElementsToDelete.length
  });
}, { immediate: true });

/**
 * Initialize Google Drive API and show startup dialog
 */
async function initializeApp() {
  // Check if Google Drive credentials are configured
  if (!hasGoogleCredentials) {
    console.warn('Google Drive credentials not configured. Running in local-only mode.');
    console.info('To enable Google Drive integration, create a .env file with VITE_GOOGLE_CLIENT_ID, VITE_GOOGLE_API_KEY, and VITE_GOOGLE_APP_ID');
    // Don't show startup dialog in development mode without credentials
    showStartupDialog.value = false;
    return;
  }
  
  try {
    await driveService!.initialize();
    isSignedIn.value = driveService!.isSignedIn();
    
    // T408: Restore authentication session from session storage
    if (isSignedIn.value && authStore.restoreSession()) {
      console.log('[Auth] Session restored from storage');
      // Optionally refresh profile data
      try {
        const profile = await driveService!.fetchUserProfile();
        authStore.setUser(profile);
      } catch (error) {
        console.warn('[Auth] Could not refresh profile:', error);
      }
    }
    
    // Try to restore last opened file
    const lastFileId = localStorage.getItem('diedrico_last_file_id');
    const lastFileName = localStorage.getItem('diedrico_last_file_name');
    
    if (isSignedIn.value && lastFileId && lastFileName) {
      try {
        console.log('[App] Restoring last opened file:', lastFileName);
        await handleOpenProject(lastFileId);
        // Successfully restored - don't show startup dialog
        return;
      } catch (error) {
        console.warn('[App] Failed to restore last file:', error);
        // Clear invalid last file references
        localStorage.removeItem('diedrico_last_file_id');
        localStorage.removeItem('diedrico_last_file_name');
      }
    }
    
    // Show startup dialog if not signed in or no project loaded
    showStartupDialog.value = true;
  } catch (error) {
    console.error('Failed to initialize Google Drive:', error);
    // Don't block app startup with alert - just log and continue
    console.warn('Running in local-only mode without Google Drive integration.');
    showStartupDialog.value = false;
  }
}

/**
 * Handle sign-in button click
 * T403: Fetch user profile after authentication
 */
async function handleSignIn() {
  if (!driveService) {
    startupDialogRef.value?.setError('Google Drive service not available');
    return;
  }
  
  try {
    await driveService.signIn();
    isSignedIn.value = driveService.isSignedIn();
    
    // T403: Fetch user profile and update auth store
    try {
      const profile = await driveService.fetchUserProfile();
      authStore.setAuthenticated(profile, driveService['accessToken'] || '', undefined);
      console.log('[Auth] User profile loaded:', profile.name);
    } catch (profileError) {
      console.warn('[Auth] Failed to fetch profile, continuing without it:', profileError);
      // Continue even if profile fetch fails - user can still use Drive functionality
    }
    
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
  if (!driveService) {
    startupDialogRef.value?.setError('Google Drive service not available');
    return;
  }
  try {
    // Serialize command history
    const projectData = ProjectService.serializeCommands(commandStack, projectName);
    
    // Create file in Google Drive
    const fileId = await driveService.createFile(projectName, projectData);
    
    // Update state
    currentProjectName.value = projectName;
    currentFileId.value = fileId;
    
    // Remember last opened file
    localStorage.setItem('diedrico_last_file_id', fileId);
    localStorage.setItem('diedrico_last_file_name', projectName);
    
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
  if (!driveService) {
    startupDialogRef.value?.setError('Google Drive service not available');
    return;
  }
  try {
    // Load file from Google Drive
    const projectData = await driveService.loadFile(fileId);
    
    // Create a new World instance instead of clearing the old one
    world = new World();
    provide('world', world);  // Update the provided world
    
    // Validate and deserialize commands
    ProjectService.validateProjectData(projectData);
    ProjectService.deserializeCommands(projectData, world, commandStack);
    
    // World and command stack are now rebuilt from command history
    
    // Update state
    currentProjectName.value = projectData.name;
    currentFileId.value = fileId;    
    // Remember last opened file
    localStorage.setItem('diedrico_last_file_id', fileId);
    localStorage.setItem('diedrico_last_file_name', projectData.name);
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
  // Clear any existing interval first
  if ((window as any).__autoSaveInterval) {
    clearInterval((window as any).__autoSaveInterval);
  }
  
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
  if (!driveService || !currentFileId.value || !currentProjectName.value) {
    return;
  }
  
  try {
    // Serialize command history
    const projectData = ProjectService.serializeCommands(commandStack, currentProjectName.value);
    
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
 * Handle renaming the current project (T305)
 */
async function handleRenameProject(newName: string) {
  if (!driveService || !currentFileId.value) {
    console.error('Cannot rename: no drive service or file ID');
    return;
  }
  
  isRenamingProject.value = true;
  
  try {
    // Update file name in Google Drive
    await driveService.renameFile(currentFileId.value, newName);
    
    // Update local state
    currentProjectName.value = newName;
    localStorage.setItem('diedrico_last_file_name', newName);
    
    console.log(`[App] Project renamed to: ${newName}`);
  } catch (error) {
    console.error('Failed to rename project:', error);
    // TODO: Show error feedback to user
  } finally {
    isRenamingProject.value = false;
  }
}

/**
 * Handle "New Project" button/shortcut (T304)
 * Creates a new project immediately with auto-generated "untitled N" name
 */
async function handleNewProject() {
  if (!driveService) {
    console.error('Google Drive service not available');
    return;
  }

  try {
    // Generate default name
    const projectName = await driveService.generateDefaultProjectName();
    
    // Reset world and command stack
    world.clear();
    commandStack.clear();
    
    // Create new project with auto-generated name
    await handleCreateProject(projectName);
    
    console.log(`[App] New project created: ${projectName}`);
  } catch (error) {
    console.error('Failed to create new project:', error);
    // Fall back to showing dialog if auto-creation fails
    showStartupDialog.value = true;
  }
}

/**
 * Handle "Open Project" button/shortcut
 */
function handleOpenProjectDialog() {
  showStartupDialog.value = true;
}

/**
 * Handle "Fit to View" button/shortcut (T274)
 * Zooms and pans to show all elements in the viewport
 */
function handleFitToView() {
  if (svgCanvasRef.value) {
    svgCanvasRef.value.fitToView();
  }
}

/**
 * T406: Handle sign-in from toolbar widget
 */
async function handleToolbarSignIn() {
  if (!driveService) {
    console.error('[Auth] Google Drive service not available');
    return;
  }
  
  try {
    await driveService.signIn();
    isSignedIn.value = driveService.isSignedIn();
    
    // Fetch user profile and update auth store
    try {
      const profile = await driveService.fetchUserProfile();
      authStore.setAuthenticated(profile, driveService['accessToken'] || '', undefined);
      console.log('[Auth] User signed in:', profile.name);
    } catch (profileError) {
      console.warn('[Auth] Failed to fetch profile:', profileError);
    }
  } catch (error) {
    console.error('[Auth] Sign-in failed:', error);
  }
}

/**
 * T407: Handle sign-out from toolbar widget
 * Revokes Google token and clears auth state
 */
async function handleToolbarSignOut() {
  if (!driveService) {
    console.error('[Auth] Google Drive service not available');
    return;
  }
  
  try {
    await driveService.signOut();
    authStore.clearAuth();
    isSignedIn.value = false;
    
    // Clear current project
    currentProjectName.value = null;
    currentFileId.value = null;
    
    // Reset to empty world
    world = new World();
    provide('world', world);
    commandStack.clear();
    
    // Show startup dialog
    showStartupDialog.value = true;
    
    console.log('[Auth] User signed out');
  } catch (error) {
    console.error('[Auth] Sign-out failed:', error);
  }
}

/**
 * Handle delete selected elements (T271, T285-T289)
 * Delete/Backspace key: Remove all selected elements with cascade deletion
 * 
 * Uses DeletionSequenceFactory to build a Command with:
 * - Cascade computation (all dependent elements via DependencyService)
 * - Type-specific RemoveOps for each element (in proper deletion order)
 * - RemoveActionFromProcessTreeOp for each action
 * - Supports proper undo/redo through operation composition
 */
function handleDeleteSelected() {
  const selectedIds = selectionStore.selectedIdsArray;
  
  if (selectedIds.length === 0) {
    console.log('[App] No elements selected to delete');
    return;
  }
  
  console.log('[App] Deleting selected elements:', selectedIds);
  
  // Build Command with operations via factory
  const deleteCommand = new Command('Delete elements', world);
  
  try {
    DeletionSequenceFactory.createCascadeDeletion(deleteCommand, selectedIds, world);
    
    // Commit and push to command stack
    deleteCommand.commit();
    commandStack.push(deleteCommand);
    
    // Rebuild dependency maps after deletion
    const dependencyService = world.getDependencyService();
    dependencyService.rebuildDependencyMaps();
    
    // Clear selection
    selectionStore.clearSelection();
    
    console.log('[App] Delete command executed successfully');
    
  } catch (error) {
    console.error('[App] Failed to delete elements:', error);
  }
}

/**
 * Select all elements in the active plane (T270)
 */
function handleSelectAll() {
  const selectedIds: string[] = [];
  
  // Get active plane and iterate through its elements
  const activePlane = world.getProjectionPlaneById(activePlaneId.value);
  if (activePlane) {
    // Select all points in the active plane
    for (const point of activePlane.getAllPoints()) {
      selectedIds.push(point.id);
    }
    
    // Select all lines in the active plane
    for (const line of activePlane.getAllLines()) {
      selectedIds.push(line.id);
    }
  }
  
  // Select all segments in the active plane
  for (const segment of world.getAllSegments2D()) {
    if (segment.planeId === activePlaneId.value) {
      selectedIds.push(segment.id);
    }
  }
  
  // Select all circles in the active plane
  for (const circle of world.getAllCircles2D()) {
    if (circle.planeId === activePlaneId.value) {
      selectedIds.push(circle.id);
    }
  }
  
  // Select all guides in the active plane
  for (const guide of world.getAllGuides2D()) {
    if (guide.planeId === activePlaneId.value) {
      selectedIds.push(guide.id);
    }
  }
  
  // Update selection store
  if (selectedIds.length > 0) {
    selectionStore.selectMultiple(selectedIds);
    console.log(`[App] Selected ${selectedIds.length} elements`);
  }
}

/**
 * Handle keyboard shortcuts
 * Ctrl+Z: Undo
 * Ctrl+Y or Ctrl+Shift+Z: Redo
 * Ctrl+N: New project (show startup dialog)
 * Ctrl+O: Open project (show startup dialog)
 * Ctrl+R: Rename project (focus name display)
 * Ctrl+A: Select all elements in active plane
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
    toolStore.setTool('select');
    selectionStore.clearSelection();
    return;
  }
  
  // Delete/Backspace: Delete selected elements (T271)
  if (event.key === 'Delete' || event.key === 'Backspace') {
    // Only if not in an input field
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      return; // Allow default behavior in input fields
    }
    event.preventDefault();
    handleDeleteSelected();
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
    handleNewProject();
    return;
  }
  
  // Ctrl+O: Open project (T268)
  if (event.key === 'o') {
    event.preventDefault();
    handleOpenProjectDialog();
    return;
  }
  
  // Ctrl+R: Rename project (T307)
  if (event.key === 'r') {
    event.preventDefault();
    projectNameDisplayRef.value?.startEditing();
    return;
  }
  
  // Ctrl+A: Select All (T270)
  if (event.key === 'a') {
    event.preventDefault();
    handleSelectAll();
    return;
  }
  
  // Ctrl+0: Fit to view (T274)
  if (event.key === '0') {
    event.preventDefault();
    handleFitToView();
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
    if (!driveService) {
      startupDialogRef.value?.setError('Google Drive service not available');
      return;
    }
    
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

.three-view-overlay {
  position: absolute;
  bottom: 20px;
  right: 20px;
  width: 400px;
  height: 300px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  overflow: hidden;
  z-index: 100;
  background: white;
}

.app-footer {
  /* StatusBar component handles its own styling */
  flex-shrink: 0;
}
</style>

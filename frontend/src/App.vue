<template>
  <div id="app" class="app-container">
    <!-- Startup Dialog for Google Drive authentication and project selection -->
    <StartupDialog
      v-if="showStartupDialog"
      :show="showStartupDialog"
      :is-signed-in="isSignedIn"
      :files="startupFiles"
      :loading="startupLoading"
      :loading-files="startupLoadingFiles"
      :error="startupError"
      @sign-in="runtime.actions.signIn"
      @request-files="runtime.actions.requestFiles"
      @open="runtime.actions.openProject"
      @create-project="runtime.actions.newProject"
    />

    <!-- Header: Top toolbar area -->
    <header class="app-header">
      <ProjectNameDisplay 
        ref="projectNameDisplayRef"
        :project-name="currentProjectName"
        :is-renaming="isRenamingProject"
        @rename="runtime.actions.renameProject"
      />
      <Toolbar 
        @new-project="runtime.actions.newProject"
        @open-project="runtime.actions.showProjectChooser"
        @fit-to-view="handleFitToView"
        @sign-in="runtime.actions.toolbarSignIn"
        @sign-out="runtime.actions.toolbarSignOut"
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
          @update-3d-coordinates="runtime.actions.updateCoordinates"
          @update-active-plane="runtime.actions.updateActivePlane"
        />
        
        <!-- 3D View Overlay (Phase 25) -->
        <div class="three-view-overlay" data-testid="three-view-overlay" v-if="show3DView">
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
        :tool-step-message="toolStore.currentToolStepMessage.value"
      />
    </footer>
  </div>
</template>

<script setup lang="ts">
import { provide, ref, onMounted, onUnmounted } from 'vue';
import SvgCanvas from './components/workspace/SvgCanvas.vue';
import Toolbar from './components/toolbars/Toolbar.vue';
import StatusBar from './components/toolbars/StatusBar.vue';
import ActionsPanel from './components/panels/ActionsPanel.vue';
import ElementsPanel from './components/panels/ElementsPanel.vue';
import ThreeView from './components/panels/ThreeView.vue';
import StartupDialog from './components/dialogs/StartupDialog.vue';
import ProjectNameDisplay from './components/header/ProjectNameDisplay.vue';
import { useToolStore } from './stores/toolStore';
import { TOOL_FAMILIES } from './config/toolFamilies';
import { useSelectionStore } from './stores/selectionStore';
import { useSettingsStore } from './stores/settingsStore';
import { useAuthStore } from './stores/authStore';
import { useViewStore } from './stores/viewStore';
import { createProductionAppShellRuntime } from './application/appShell/AppShellProductionRuntime';

const GOOGLE_CONFIG = {
  clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
  apiKey: import.meta.env.VITE_GOOGLE_API_KEY || '',
  appId: import.meta.env.VITE_GOOGLE_APP_ID || '',
};
const hasGoogleCredentials = Boolean(GOOGLE_CONFIG.clientId);

const toolStore = useToolStore();
toolStore.setToolFamilies(TOOL_FAMILIES);
const selectionStore = useSelectionStore();
useSettingsStore();
const authStore = useAuthStore();
const viewStore = useViewStore();

const svgCanvasRef = ref<InstanceType<typeof SvgCanvas> | null>(null);
const projectNameDisplayRef = ref<InstanceType<typeof ProjectNameDisplay> | null>(null);

const runtime = createProductionAppShellRuntime({
  googleConfig: GOOGLE_CONFIG,
  hasGoogleCredentials,
  stores: {
    authStore,
    selectionStore,
    toolStore,
    viewStore,
  },
  callbacks: {
    fitToView: () => svgCanvasRef.value?.fitToView(),
    startRename: () => projectNameDisplayRef.value?.startEditing(),
    alert: (message: string) => window.alert(message),
  },
});

provide('world', runtime.world);
provide('commandStack', runtime.commandStack);

const activeTool = toolStore.currentTool;
const activePlaneId = runtime.state.activePlaneId;
const activePlaneName = runtime.state.activePlaneName;
const coordinates3D = runtime.state.coordinates3D;
const show3DView = runtime.state.show3DView;
const showStartupDialog = runtime.state.showStartupDialog;
const isSignedIn = runtime.state.isSignedIn;
const currentProjectName = runtime.state.currentProjectName;
const isRenamingProject = runtime.state.isRenamingProject;
const saveStatus = runtime.state.saveStatus;
const startupFiles = runtime.state.startupFiles;
const startupLoading = runtime.state.startupLoading;
const startupLoadingFiles = runtime.state.startupLoadingFiles;
const startupError = runtime.state.startupError;

function handleHighlightElements(elementIds: string[], temporary: boolean) {
  void elementIds;
  void temporary;
}

function handleClearHighlight() {}

function handleFitToView() {
  svgCanvasRef.value?.fitToView();
}

onMounted(() => runtime.actions.start());
onUnmounted(() => runtime.actions.dispose());
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
  pointer-events: none;
  position: absolute;
  bottom: 20px;
  right: 20px;
  width: 800px;
  height: 600px;
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

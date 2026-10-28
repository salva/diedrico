<template>
  <div id="app" class="app-container">
    <!-- Startup Dialog for Google Drive authentication and project selection -->
    <StartupDialog
      v-if="showStartupDialog"
      :show="showStartupDialog"
      :is-signed-in="isSignedIn"
      :files="startupFiles"
      :loading="startupLoading"
      :drive-available="hasGoogleCredentials"
      :loading-files="startupLoadingFiles"
      :error="startupError"
      @sign-in="runtime.actions.signIn"
      @close="showStartupDialog = false"
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
        :drive-available="hasGoogleCredentials && !startupLoading"
        :is-signed-in="isSignedIn"
        @new-project="runtime.actions.newProject"
        @open-project="runtime.actions.showProjectChooser"
        @fit-to-view="runtime.fitToView"
        @sign-in="runtime.actions.toolbarSignIn"
        @sign-out="runtime.actions.toolbarSignOut"
      />
    </header>

    <!-- Main Workspace: Sidebar + Canvas area -->
    <p role="status" data-testid="drive-availability">
      {{ !hasGoogleCredentials ? 'Local mode — Google Drive is not configured.' : startupLoading ? 'Google Drive loading…' : startupError || (isSignedIn ? 'Google Drive connected' : 'Local mode — Sign in to connect Google Drive. Expired sessions require Sign in again.') }}
    </p>
    <!-- Main Workspace: Sidebar + Canvas area -->
    <main class="app-main">
      <!-- Left Sidebar: Stacked Panels -->
      <aside class="left-sidebar">
        <div class="panel-stack">
          <!-- Elements Panel (top) -->
          <div class="stacked-panel">
            <ElementsPanel />
          </div>
          
          <!-- Resizer -->
          <div class="panel-resizer"></div>
          
          <!-- Actions Panel (bottom) -->
          <div class="stacked-panel">
            <ActionsPanel />
          </div>
        </div>
      </aside>

      <!-- Canvas Area -->
      <div class="canvas-area">
        <SvgCanvas 
          ref="svgCanvasRef"
          @update-3d-coordinates="runtime.actions.updateCoordinates"
          @update-plane-position-input-state="handlePlanePositionInputState"
          @clear-plane-position-input="clearPlanePositionInput"
        />
        
        <!-- 3D View Overlay (Phase 25) -->
        <ThreeViewWindow v-if="show3DView" />
      </div>
    </main>

    <!-- Footer: Status bar -->
    <footer class="app-footer">
      <StatusBar 
        ref="statusBarRef"
        :active-plane-id="activePlaneId"
        :active-plane-name="activePlaneName"
        :active-tool="activeTool"
        :coordinates3-d="coordinates3D"
        :save-status="saveStatus"
        :cascade-count="selectionStore.cascadeHighlightIdsArray.length"
        :tool-step-message="toolStore.currentToolStepMessage.value"
        :plane-position-input="planePositionInputState"
        @submit-tool-argument-input="handleSubmitToolArgumentInput"
      />
    </footer>
  </div>
</template>

<script setup lang="ts">
import { provide, ref, watch, onMounted, onUnmounted } from 'vue';
import SvgCanvas from './components/workspace/SvgCanvas.vue';
import Toolbar from './components/toolbars/Toolbar.vue';
import StatusBar from './components/toolbars/StatusBar.vue';
import ActionsPanel from './components/panels/ActionsPanel.vue';
import ElementsPanel from './components/panels/ElementsPanel.vue';
import ThreeViewWindow from './components/panels/ThreeViewWindow.vue';
import StartupDialog from './components/dialogs/StartupDialog.vue';
import ProjectNameDisplay from './components/header/ProjectNameDisplay.vue';
import { useToolStore } from './stores/toolStore';
import { TOOL_FAMILIES } from './config/toolFamilies';
import { useSelectionStore } from './stores/selectionStore';
import { useSettingsStore } from './stores/settingsStore';
import { useAuthStore } from './stores/authStore';
import { useViewStore } from './stores/viewStore';
import { createProductionAppShellRuntime } from './application/appShell/AppShellProductionRuntime';
import {
  ActivePlaneRuntimeInjectionKey,
  CanvasCommandProducerInjectionKey,
  CanvasViewInjectionKey,
  CommandHistoryInjectionKey,
  ElementsPanelInjectionKey,
  ProcessHistoryCommandInjectionKey,
  ProcessTreeReadInjectionKey,
  SelectionActionsInjectionKey,
  ThreePresentationInjectionKey,
  ToolInteractionReadInjectionKey,
  ToolRuntimeInjectionKey,
} from './application/appShell/RuntimeInjectionKeys';
import type { ParsedToolArgumentInput, ToolArgumentInputRequest } from './types/ToolArgumentInput';

const GOOGLE_CONFIG = {
  clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
  apiKey: import.meta.env.VITE_GOOGLE_API_KEY || '',
  appId: import.meta.env.VITE_GOOGLE_APP_ID || '',
};
const hasGoogleCredentials = Boolean(GOOGLE_CONFIG.clientId);

const toolStore = useToolStore();
toolStore.setToolFamilies(TOOL_FAMILIES);
toolStore.initFromStorage();
const selectionStore = useSelectionStore();
const settingsStore = useSettingsStore();
settingsStore.initFromStorage();
const authStore = useAuthStore();
const viewStore = useViewStore();
viewStore.initFromStorage();

watch(() => toolStore.lastUsedTools.value, () => toolStore.saveToStorage(), { deep: true });
watch(() => settingsStore.settings, () => settingsStore.saveToStorage(), { deep: true });
watch(() => viewStore.showProjectedElements.value, () => viewStore.saveToStorage());
watch(() => viewStore.threeViewOptions.value, () => viewStore.saveToStorage(), { deep: true });
watch(() => viewStore.threeViewWindow.value, () => viewStore.saveToStorage(), { deep: true });

const svgCanvasRef = ref<InstanceType<typeof SvgCanvas> | null>(null);
const statusBarRef = ref<InstanceType<typeof StatusBar> | null>(null);
const projectNameDisplayRef = ref<InstanceType<typeof ProjectNameDisplay> | null>(null);
const planePositionInputState = ref({
  enabled: false,
  kind: 'plane-position' as ToolArgumentInputRequest['kind'],
  valueKind: undefined as ToolArgumentInputRequest['valueKind'],
  label: 'position',
  placeholder: 'u,v',
  error: '',
});

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
    coordinateInput: {
      isAvailable: () => planePositionInputState.value.enabled,
      focusWithText: text => statusBarRef.value?.focusCoordinateInputWithText(text),
      isFocused: () => statusBarRef.value?.isCoordinateInputFocused() ?? false,
      clear: () => statusBarRef.value?.clearCoordinateInput(),
      blur: () => statusBarRef.value?.blurCoordinateInput(),
      hasText: () => statusBarRef.value?.hasCoordinateInputText() ?? false,
    },
  },
});
if (import.meta.env.DEV) {
  (window as typeof window & { __diedricoRuntime?: typeof runtime }).__diedricoRuntime = runtime;
}

provide(CanvasViewInjectionKey, runtime.canvasViewPort);
provide(ProcessTreeReadInjectionKey, runtime.processTreeReadPort);
provide(ElementsPanelInjectionKey, runtime.elementsPanelPort);
provide(ThreePresentationInjectionKey, runtime.threePresentationPort);
provide(ActivePlaneRuntimeInjectionKey, runtime);
provide(CanvasCommandProducerInjectionKey, runtime.canvasCommandProducerPort);
provide(ToolInteractionReadInjectionKey, runtime.toolInteractionReadPort);
provide(ToolRuntimeInjectionKey, {
  currentTool: toolStore.currentTool,
  setTool: tool => toolStore.setTool(tool),
  setToolStepMessage: message => toolStore.setToolStepMessage(message),
});
provide(ProcessHistoryCommandInjectionKey, runtime.processHistoryCommandPort);
provide(CommandHistoryInjectionKey, runtime.commandHistory);
provide(SelectionActionsInjectionKey, runtime.selectionActions);

const activeTool = toolStore.currentTool;
const activePlaneId = runtime.activePlaneId;
const activePlaneName = runtime.activePlaneName;
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

onMounted(() => runtime.actions.start());
onUnmounted(() => runtime.actions.dispose());

function handlePlanePositionInputState(state: { enabled: boolean; kind: ToolArgumentInputRequest['kind']; valueKind?: ToolArgumentInputRequest['valueKind']; label: string; placeholder: string }): void {
  planePositionInputState.value = {
    enabled: state.enabled,
    kind: state.kind,
    valueKind: state.valueKind,
    label: state.label,
    placeholder: state.placeholder,
    error: planePositionInputState.value.error,
  };
}

function handleSubmitToolArgumentInput(input: ParsedToolArgumentInput): void {
  const result = svgCanvasRef.value?.submitToolArgumentInput(input);
  if (!result || !result.success) {
    planePositionInputState.value = {
      ...planePositionInputState.value,
      error: result?.message || 'Could not use input.',
    };
    return;
  }
  planePositionInputState.value = {
    ...planePositionInputState.value,
    error: '',
  };
  statusBarRef.value?.clearCoordinateInput();
}

function clearPlanePositionInput(): void {
  planePositionInputState.value = {
    ...planePositionInputState.value,
    error: '',
  };
  statusBarRef.value?.clearCoordinateInput();
}
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

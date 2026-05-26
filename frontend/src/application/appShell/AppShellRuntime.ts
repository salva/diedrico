import { computed, ref } from 'vue';
import { CommandStack } from '@/commands/CommandStack';
import { World } from '@/domain/world/World';
import { GoogleDriveService, type GoogleDriveConfig } from '@/services/GoogleDriveService';
import { ProjectService } from '@/services/ProjectService';
import { ActivePlaneUseCases } from './ActivePlaneUseCases';
import { AutoSaveUseCases } from './AutoSaveUseCases';
import { KeyboardShortcutRouter } from './KeyboardShortcutRouter';
import type { AppShellCallbacks, AppShellRuntimePorts, SaveStatus } from './AppShellPorts';
import { createBrowserScheduler } from './AppShellPorts';
import { ProjectSessionUseCases } from './ProjectSessionUseCases';
import { SelectionUseCases } from './SelectionUseCases';

export interface AppShellRuntimeOptions {
  googleConfig: GoogleDriveConfig;
  hasGoogleCredentials: boolean;
  ports: Omit<AppShellRuntimePorts, 'drive' | 'persistence' | 'storage' | 'scheduler' | 'callbacks'> & Partial<Pick<AppShellRuntimePorts, 'drive' | 'persistence' | 'storage' | 'scheduler'>>;
  callbacks: AppShellCallbacks;
}

export function createAppShellRuntime(options: AppShellRuntimeOptions) {
  const world = new World();
  const commandStack = new CommandStack();
  const drive = options.ports.drive ?? (options.hasGoogleCredentials ? new GoogleDriveService(options.googleConfig) : null);
  const ports: AppShellRuntimePorts = {
    drive,
    persistence: options.ports.persistence ?? ProjectService,
    storage: options.ports.storage ?? window.localStorage,
    scheduler: options.ports.scheduler ?? createBrowserScheduler(),
    authStore: options.ports.authStore,
    selectionStore: options.ports.selectionStore,
    toolStore: options.ports.toolStore,
    viewStore: options.ports.viewStore,
    callbacks: options.callbacks,
  };

  const activePlaneId = ref<string | undefined>(world.getActivePlaneId());
  const activePlaneName = ref('');
  const coordinates3D = ref<{ x: number; y: number; z: number } | null>(null);
  const show3DView = ref(true);
  const showStartupDialog = ref(false);
  const isSignedIn = ref(false);
  const currentProjectName = ref<string | null>(null);
  const currentFileId = ref<string | null>(null);
  const isRenamingProject = ref(false);
  const saveStatus = ref<SaveStatus>('idle');
  const startupDialog = {
    files: ref([]),
    loading: ref(false),
    loadingFiles: ref(false),
    error: ref<string | null>(null),
  };

  const activePlane = new ActivePlaneUseCases(world, { activePlaneId, activePlaneName });
  const selection = new SelectionUseCases(world, commandStack, ports.selectionStore, () => activePlaneId.value);
  const autoSave = new AutoSaveUseCases({
    world,
    commandStack,
    drive,
    persistence: ports.persistence,
    storage: ports.storage,
    scheduler: ports.scheduler,
    currentFileId,
    currentProjectName,
    saveStatus,
    showStartupDialog,
    isSignedIn,
    alert: ports.callbacks.alert,
  });
  const projectSession = new ProjectSessionUseCases({
    world,
    commandStack,
    hasGoogleCredentials: options.hasGoogleCredentials,
    showStartupDialog,
    isSignedIn,
    currentProjectName,
    currentFileId,
    isRenamingProject,
    saveStatus,
    startupDialog,
    autoSave,
    ports,
  });
  const keyboard = new KeyboardShortcutRouter({
    commandStack,
    toolStore: ports.toolStore,
    viewStore: ports.viewStore,
    projectSession,
    selection,
    activePlane,
    fitToView: ports.callbacks.fitToView,
    startRename: ports.callbacks.startRename,
  });

  let started = false;
  function start(): void {
    if (started) return;
    started = true;
    activePlane.start();
    selection.start();
    keyboard.install(window);
    void projectSession.initialize();
  }

  function dispose(): void {
    if (!started) return;
    started = false;
    keyboard.dispose();
    autoSave.dispose();
    activePlane.dispose();
    selection.dispose();
    projectSession.dispose();
  }

  return {
    world,
    commandStack,
    state: {
      activePlaneId,
      activePlaneName,
      coordinates3D,
      show3DView,
      showStartupDialog,
      isSignedIn,
      currentProjectName,
      currentFileId,
      isRenamingProject,
      saveStatus,
      startupFiles: computed(() => startupDialog.files.value),
      startupLoading: computed(() => startupDialog.loading.value),
      startupLoadingFiles: computed(() => startupDialog.loadingFiles.value),
      startupError: computed(() => startupDialog.error.value),
    },
    actions: {
      start,
      dispose,
      signIn: () => projectSession.signIn(),
      toolbarSignIn: () => projectSession.toolbarSignIn(),
      toolbarSignOut: () => projectSession.signOut(),
      createProject: (name: string) => projectSession.createProject(name),
      openProject: (fileId: string) => projectSession.openProject(fileId),
      newProject: () => projectSession.newProject(),
      showProjectChooser: () => projectSession.showStartupProjectChooser(),
      renameProject: (name: string) => projectSession.renameProject(name),
      requestFiles: () => projectSession.requestFiles(),
      updateCoordinates: (coords: { x: number; y: number; z: number } | null) => { coordinates3D.value = coords; },
      updateActivePlane: (planeInfo: { id: string; name: string }) => activePlane.updateActivePlane(planeInfo),
    },
    internals: { keyboard, activePlane, autoSave, selection, projectSession },
  };
}

export type AppShellRuntime = ReturnType<typeof createAppShellRuntime>;

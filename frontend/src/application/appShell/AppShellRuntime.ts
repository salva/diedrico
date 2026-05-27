import { computed, ref } from 'vue';
import { ActivePlaneUseCases } from './ActivePlaneUseCases';
import { AutoSaveUseCases } from './AutoSaveUseCases';
import { KeyboardShortcutRouter } from './KeyboardShortcutRouter';
import type { AppShellRuntimePorts, SaveStatus } from './AppShellPorts';
import { ProjectSessionUseCases } from './ProjectSessionUseCases';
import { RuntimeSession } from './RuntimeSession';
import { SelectionUseCases } from './SelectionUseCases';

export interface AppShellRuntimeOptions {
  ports: AppShellRuntimePorts;
}

export function createAppShellRuntime(options: AppShellRuntimeOptions) {
  const session = new RuntimeSession();
  const world = session.worldForView();
  const commandHistory = session.commandHistoryPort();
  const canvasCommandProducerPort = session.canvasCommandProducerPort(options.ports.toolStore);
  const processHistoryCommandPort = session.processHistoryCommandPort();
  const ports = options.ports;
  const drive = ports.drive;

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

  const activePlane = new ActivePlaneUseCases(session.activePlanePort(), { activePlaneId, activePlaneName });
  const selectionDeletion = session.selectionDeletionCommandPort();
  const selection = new SelectionUseCases(session.selectionReadPort(), selectionDeletion, ports.selectionStore, () => activePlaneId.value);
  const autoSave = new AutoSaveUseCases({
    session,
    drive,
    persistence: ports.persistence,
    lastProjectRepository: ports.lastProjectRepository,
    scheduler: ports.scheduler,
    currentFileId,
    currentProjectName,
    saveStatus,
    showStartupDialog,
    isSignedIn,
    alert: ports.callbacks.alert,
  });
  const projectSession = new ProjectSessionUseCases({
    session,
    hasGoogleCredentials: drive !== null,
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
    commandHistory,
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
    keyboard.install(ports.keyboardTarget);
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
    canvasCommandProducerPort,
    processHistoryCommandPort,
    commandHistory,
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
    internals: { session, keyboard, activePlane, autoSave, selection, selectionDeletion, projectSession },
  };
}

export type AppShellRuntime = ReturnType<typeof createAppShellRuntime>;

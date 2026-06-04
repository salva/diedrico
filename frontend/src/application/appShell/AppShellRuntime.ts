import { computed, ref } from 'vue';
import { AutoSaveUseCases } from './AutoSaveUseCases';
import { KeyboardShortcutRouter } from './KeyboardShortcutRouter';
import type { AppShellRuntimePorts, CommandHistoryPort, SaveStatus } from './AppShellPorts';
import { ProjectSessionUseCases } from './ProjectSessionUseCases';
import { RuntimeSession } from './RuntimeSession';
import { SelectionUseCases } from './SelectionUseCases';

export interface AppShellRuntimeOptions {
  ports: AppShellRuntimePorts;
}

export function createAppShellRuntime(options: AppShellRuntimeOptions) {
  const session = new RuntimeSession();
  const commandHistory: CommandHistoryPort = session;
  const canvasCommandProducerPort = session.canvasCommandProducerPort();
  const processHistoryCommandPort = session.processHistoryCommandPort();
  const canvasViewPort = session.canvasViewPort();
  const processTreeReadPort = session.processTreeReadPort();
  const elementsPanelPort = session.elementsPanelPort();
  const threePresentationPort = session.threePresentationPort();
  const toolInteractionReadPort = session.toolInteractionReadPort();
  const ports = options.ports;
  const drive = ports.drive;

  const activePlaneId = ref<string | undefined>(session.activePlaneId);
  const activePlaneName = ref(session.activePlaneName);
  const planeOptions = ref(session.planeOptions);
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

  const selectionDeletion = session.selectionDeletionCommandPort();
  const selection = new SelectionUseCases(session.selectionReadPort(), selectionDeletion, ports.selectionStore, () => activePlaneId.value);
  const autoSave = new AutoSaveUseCases({
    session,
    drive,
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
    drive,
    authStore: ports.authStore,
    lastProjectRepository: ports.lastProjectRepository,
  });
  const fitToView = ports.callbacks.fitToView;
  const keyboard = new KeyboardShortcutRouter({
    commandHistory,
    toolStore: ports.toolStore,
    viewStore: ports.viewStore,
    projectSession,
    selection,
    activePlane: { cycleActivePlane },
    fitToView,
    startRename: ports.callbacks.startRename,
  });

  let started = false;
  const syncActivePlaneState = () => {
    activePlaneId.value = session.activePlaneId;
    activePlaneName.value = session.activePlaneName;
    planeOptions.value = session.planeOptions;
  };

  function setActivePlaneId(id: string): void {
    session.setActivePlaneId(id);
    syncActivePlaneState();
  }

  function cycleActivePlane(direction: number): void {
    session.cycleActivePlane(direction);
    syncActivePlaneState();
  }

  function start(): void {
    if (started) return;
    started = true;
    session.subscribeToChanges(syncActivePlaneState);
    syncActivePlaneState();
    selection.start();
    keyboard.install(ports.keyboardTarget);
    void projectSession.initialize();
  }

  function dispose(): void {
    if (!started) return;
    started = false;
    keyboard.dispose();
    autoSave.dispose();
    session.unsubscribeFromChanges(syncActivePlaneState);
    selection.dispose();
    projectSession.dispose();
  }

  return {
    canvasViewPort,
    processTreeReadPort,
    elementsPanelPort,
    threePresentationPort,
    activePlaneId,
    activePlaneName,
    planeOptions,
    setActivePlaneId,
    cycleActivePlane,
    fitToView,
    canvasCommandProducerPort,
    toolInteractionReadPort,
    processHistoryCommandPort,
    commandHistory,
    selectionActions: selection,
    state: {
      activePlaneId,
      activePlaneName,
      planeOptions,
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
    },
    internals: { session, keyboard, autoSave, selection, selectionDeletion, projectSession },
  };
}

export type AppShellRuntime = ReturnType<typeof createAppShellRuntime>;

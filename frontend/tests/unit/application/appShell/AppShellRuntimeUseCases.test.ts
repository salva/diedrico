import { describe, expect, it, vi } from 'vitest';
import { nextTick, reactive, ref } from 'vue';
import { createAppShellRuntime } from '@/application/appShell/AppShellRuntime';
import { createProductionAppShellRuntime } from '@/application/appShell/AppShellProductionRuntime';
import { AutoSaveUseCases } from '@/application/appShell/AutoSaveUseCases';
import { BrowserLastProjectRepository } from '@/application/appShell/BrowserLastProjectRepository';
import { ProjectSessionUseCases } from '@/application/appShell/ProjectSessionUseCases';
import { RuntimeSession } from '@/application/appShell/RuntimeSession';
import type { ProjectSessionKernel, SnapshotCapableProjectSessionKernel } from '@/application/appShell/ProjectSessionKernel';
import { SelectionUseCases } from '@/application/appShell/SelectionUseCases';
import type { AppShellRuntimePorts, DrivePort, LastProjectRepositoryPort, ProjectSessionPersistencePayload, SchedulerPort, SelectionStorePort } from '@/application/appShell/AppShellPorts';
import { ProjectService } from '@/application/appShell/ProjectService';

function scheduler() {
  let nextHandle = 1;
  const timeouts = new Map<number, () => void>();
  const intervals = new Map<number, () => void>();
  return {
    port: {
      setTimeout: vi.fn((handler: () => void) => {
        const handle = nextHandle++;
        timeouts.set(handle, handler);
        return handle;
      }),
      clearTimeout: vi.fn((handle: number) => { timeouts.delete(handle); }),
      setInterval: vi.fn((handler: () => void) => {
        const handle = nextHandle++;
        intervals.set(handle, handler);
        return handle;
      }),
      clearInterval: vi.fn((handle: number) => { intervals.delete(handle); }),
    } satisfies SchedulerPort,
    runTimeout(handle: number) {
      timeouts.get(handle)?.();
    },
    runInterval(handle: number) {
      intervals.get(handle)?.();
    },
  };
}


function projectPayload(name = 'Project', nextElementId = 1): ProjectSessionPersistencePayload {
  return {
    id: 'project-id',
    schemaVersion: '8.0.0',
    name,
    created: '2026-06-05T00:00:00.000Z',
    modified: '2026-06-05T00:00:00.000Z',
    nextElementId,
    commands: [],
  };
}

function drive(overrides: Partial<DrivePort> = {}): DrivePort {
  return {
    initialize: vi.fn().mockResolvedValue(undefined),
    isSignedIn: vi.fn(() => true),
    signIn: vi.fn().mockResolvedValue(undefined),
    signOut: vi.fn().mockResolvedValue(undefined),
    fetchUserProfile: vi.fn().mockResolvedValue({ email: 'user@example.test', name: 'User' }),
    listFiles: vi.fn().mockResolvedValue([{ id: 'file-1', name: 'Project 1', modifiedTime: 'now' }]),
    createFile: vi.fn().mockResolvedValue('file-created'),
    loadFile: vi.fn().mockResolvedValue(projectPayload('Loaded project')),
    updateFile: vi.fn().mockResolvedValue(undefined),
    renameFile: vi.fn().mockResolvedValue(undefined),
    generateDefaultProjectName: vi.fn().mockResolvedValue('Untitled project'),
    ...overrides,
  } as DrivePort;
}

function lastProjectRepository(): LastProjectRepositoryPort & { records: { set: unknown[]; cleared: number } } {
  let current: { id: string; name: string } | null = null;
  const repository = {
    records: { set: [] as unknown[], cleared: 0 },
    getLastProject: vi.fn(() => current),
    setLastProject: vi.fn((project: { id: string; name: string }) => {
      current = project;
      repository.records.set.push(project);
    }),
    clearLastProject: vi.fn(() => {
      current = null;
      repository.records.cleared += 1;
    }),
  };
  return repository;
}


function autoSaveSession(versionSource: () => number = () => 1): SnapshotCapableProjectSessionKernel {
  return {
    getVersion: versionSource,
    snapshot: (projectName) => projectPayload(projectName, 10),
  };
}

function autoSaveFixture() {
  return {
    start: vi.fn(),
    schedule: vi.fn(),
    stop: vi.fn(),
    dispose: vi.fn(),
  } satisfies Pick<AutoSaveUseCases, 'start' | 'schedule' | 'stop' | 'dispose'>;
}

function runtimePorts(overrides: Partial<AppShellRuntimePorts> = {}) {
  const keyboardTarget = { addEventListener: vi.fn(), removeEventListener: vi.fn() };
  return {
    drive: drive(),
    lastProjectRepository: lastProjectRepository(),
    scheduler: scheduler().port,
    keyboardTarget,
    authStore: {
      restoreSession: vi.fn(() => false),
      setUser: vi.fn(),
      setAuthenticated: vi.fn(),
      clearAuth: vi.fn(),
    },
    selectionStore: {
      selectedIdsArray: [],
      selectSingle: vi.fn(),
      addToSelection: vi.fn(),
      clearSelection: vi.fn(),
      selectMultiple: vi.fn(),
      setCascadeHighlight: vi.fn(),
      clearCascadeHighlight: vi.fn(),
    },
    toolStore: { setTool: vi.fn(), selectSubTool: vi.fn() },
    viewStore: { toggleProjectedElements: vi.fn() },
    callbacks: { fitToView: vi.fn(), startRename: vi.fn(), alert: vi.fn() },
    ...overrides,
  } satisfies AppShellRuntimePorts;
}

describe('AppShellRuntime lifecycle ownership', () => {
  it('keeps world and runtime ports stable while start/dispose owns explicit listeners and subscriptions', async () => {
    const ports = runtimePorts();
    const runtime = createAppShellRuntime({ ports });
    const canvasViewPort = runtime.canvasViewPort;
    const commandHistory = runtime.commandHistory;
    const canvasCommandProducerPort = runtime.canvasCommandProducerPort;
    const processHistoryCommandPort = runtime.processHistoryCommandPort;

    runtime.actions.start();
    runtime.actions.start();
    await Promise.resolve();

    expect(runtime.canvasViewPort).toBe(canvasViewPort);
    expect(runtime.commandHistory).toBe(commandHistory);
    expect(runtime.canvasCommandProducerPort).toBe(canvasCommandProducerPort);
    expect(runtime.processHistoryCommandPort).toBe(processHistoryCommandPort);
    expect(ports.keyboardTarget.addEventListener).toHaveBeenCalledTimes(1);

    runtime.actions.dispose();
    runtime.actions.dispose();

    expect(runtime.canvasViewPort).toBe(canvasViewPort);
    expect(runtime.commandHistory).toBe(commandHistory);
    expect(runtime.canvasCommandProducerPort).toBe(canvasCommandProducerPort);
    expect(runtime.processHistoryCommandPort).toBe(processHistoryCommandPort);
    expect(ports.keyboardTarget.removeEventListener).toHaveBeenCalledTimes(1);
  });

  it('constructs runtime core only from explicit fake ports', async () => {
    const ports = runtimePorts({ drive: null });
    const runtime = createAppShellRuntime({ ports });

    runtime.actions.start();
    await Promise.resolve();

    expect(runtime.state.showStartupDialog.value).toBe(false);
    expect(ports.keyboardTarget.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  it('production composition is the only owner of browser defaults', () => {
    const runtime = createProductionAppShellRuntime({
      googleConfig: { clientId: '', apiKey: '', appId: '' },
      hasGoogleCredentials: false,
      stores: {
        authStore: runtimePorts().authStore,
        selectionStore: runtimePorts().selectionStore,
        toolStore: runtimePorts().toolStore,
        viewStore: runtimePorts().viewStore,
      },
      callbacks: runtimePorts().callbacks,
    });

    runtime.internals.session.initializeDefaultWorldIfNeeded();
    runtime.actions.start();
    expect(runtime.planeOptions.value.length).toBeGreaterThan(0);
    runtime.actions.dispose();
  });

  it('sign-out clears project state without replacing runtime-owned world or ports', async () => {
    const ports = runtimePorts();
    const runtime = createAppShellRuntime({ ports });
    const canvasViewPort = runtime.canvasViewPort;
    const commandHistory = runtime.commandHistory;
    const canvasCommandProducerPort = runtime.canvasCommandProducerPort;
    const processHistoryCommandPort = runtime.processHistoryCommandPort;
    runtime.state.currentProjectName.value = 'Current';
    runtime.state.currentFileId.value = 'file-1';

    await runtime.actions.toolbarSignOut();

    expect(runtime.canvasViewPort).toBe(canvasViewPort);
    expect(runtime.commandHistory).toBe(commandHistory);
    expect(runtime.canvasCommandProducerPort).toBe(canvasCommandProducerPort);
    expect(runtime.processHistoryCommandPort).toBe(processHistoryCommandPort);
    expect(runtime.state.currentProjectName.value).toBeNull();
    expect(runtime.state.currentFileId.value).toBeNull();
    expect(runtime.state.showStartupDialog.value).toBe(true);
    expect(ports.authStore.clearAuth).toHaveBeenCalled();
  });
});

describe('AutoSaveUseCases', () => {
  it.each(['success', 'missing', 'authentication', 'quota', 'recovery', 'recovery-failure', 'same-file', 'dispose'])(
    'does not apply a stale %s completion to another session', async (completion) => {
      let resolveUpdate!: () => void;
      let rejectUpdate!: (error: Error) => void;
      let resolveCreate!: (id: string) => void;
      let rejectCreate!: (error: Error) => void;
      const fakeDrive = drive({
        updateFile: vi.fn(() => new Promise<void>((resolve, reject) => {
          resolveUpdate = resolve;
          rejectUpdate = reject;
        })),
        createFile: vi.fn(() => new Promise<string>((resolve, reject) => {
          resolveCreate = resolve;
          rejectCreate = reject;
        })),
      });
      const repository = lastProjectRepository();
      const currentFileId = ref<string | null>('old-file');
      const currentProjectName = ref<string | null>('Old');
      const saveStatus = ref<'idle' | 'saving' | 'saved'>('saving');
      const showStartupDialog = ref(false);
      const isSignedIn = ref(true);
      const alert = vi.fn();
      const autoSave = new AutoSaveUseCases({
        session: autoSaveSession(), drive: fakeDrive, lastProjectRepository: repository,
        scheduler: scheduler().port, currentFileId, currentProjectName,
        saveStatus, showStartupDialog, isSignedIn, alert,
      });
      autoSave.start();
      const pending = autoSave.perform();
      if (completion.startsWith('recovery')) {
        rejectUpdate(new Error('File not found'));
        await Promise.resolve();
        expect(fakeDrive.createFile).toHaveBeenCalledOnce();
      }
      if (completion === 'dispose') {
        autoSave.dispose();
      } else {
        if (completion !== 'same-file') {
          currentFileId.value = 'new-file';
          currentProjectName.value = 'New';
        }
        autoSave.start();
        saveStatus.value = 'saving';
      }
      if (completion === 'recovery') resolveCreate('orphan-file');
      else if (completion === 'recovery-failure') rejectCreate(new Error('offline'));
      else if (completion === 'missing') rejectUpdate(new Error('File not found'));
      else if (completion === 'authentication') rejectUpdate(new Error('401 authentication expired'));
      else if (completion === 'quota') rejectUpdate(new Error('quota exceeded'));
      else resolveUpdate();
      await pending;
      expect(currentFileId.value).toBe(completion === 'dispose' || completion === 'same-file' ? 'old-file' : 'new-file');
      expect(saveStatus.value).toBe(completion === 'dispose' ? 'idle' : 'saving');
      expect(showStartupDialog.value).toBe(false);
      expect(isSignedIn.value).toBe(true);
      expect(repository.setLastProject).not.toHaveBeenCalled();
      expect(alert).not.toHaveBeenCalled();
      if (!completion.startsWith('recovery')) expect(fakeDrive.createFile).not.toHaveBeenCalled();
    },
  );
  it('owns polling, debounce, saved-status timers and clears them on dispose', async () => {
    const fakeScheduler = scheduler();
    let version = 1;
    const saveStatus = ref<'idle' | 'saving' | 'saved'>('idle');
    const currentFileId = ref('file-1');
    const currentProjectName = ref('Project');
    const fakeDrive = drive();
    const autoSave = new AutoSaveUseCases({
      session: autoSaveSession(() => version),
      drive: fakeDrive,
      lastProjectRepository: lastProjectRepository(),
      scheduler: fakeScheduler.port,
      currentFileId,
      currentProjectName,
      saveStatus,
      showStartupDialog: ref(false),
      isSignedIn: ref(true),
      alert: vi.fn(),
    }, 50);

    autoSave.start();
    version = 2;
    fakeScheduler.runInterval(1);
    expect(saveStatus.value).toBe('saving');
    expect(fakeScheduler.port.setInterval).toHaveBeenCalledTimes(1);
    expect(fakeScheduler.port.setTimeout).toHaveBeenCalledTimes(1);

    await autoSave.perform();
    expect(fakeDrive.updateFile).toHaveBeenCalledWith('file-1', expect.objectContaining({ name: 'Project', schemaVersion: '8.0.0', commands: [] }));
    expect(saveStatus.value).toBe('saved');
    expect(fakeScheduler.port.setTimeout).toHaveBeenCalledTimes(2);

    autoSave.dispose();
    expect(fakeScheduler.port.clearInterval).toHaveBeenCalledWith(1);
    expect(fakeScheduler.port.clearTimeout).toHaveBeenCalledWith(2);
    expect(fakeScheduler.port.clearTimeout).toHaveBeenCalledWith(3);
    expect(saveStatus.value).toBe('idle');
  });

  it('stops autosave and reopens startup flow on authentication failures', async () => {
    const fakeScheduler = scheduler();
    const showStartupDialog = ref(false);
    const isSignedIn = ref(true);
    const saveStatus = ref<'idle' | 'saving' | 'saved'>('idle');
    const autoSave = new AutoSaveUseCases({
      session: autoSaveSession(),
      drive: drive({ updateFile: vi.fn().mockRejectedValue(new Error('401 authentication expired')) }),
      lastProjectRepository: lastProjectRepository(),
      scheduler: fakeScheduler.port,
      currentFileId: ref('file-1'),
      currentProjectName: ref('Project'),
      saveStatus,
      showStartupDialog,
      isSignedIn,
      alert: vi.fn(),
    }, 50);

    autoSave.start();
    await autoSave.perform();

    expect(showStartupDialog.value).toBe(true);
    expect(isSignedIn.value).toBe(false);
    expect(saveStatus.value).toBe('idle');
    expect(fakeScheduler.port.clearInterval).toHaveBeenCalledWith(1);
  });

  it('recreates deleted remote files through the last-project repository', async () => {
    const fakeScheduler = scheduler();
    const repository = lastProjectRepository();
    const currentFileId = ref('missing-file');
    const currentProjectName = ref('Project');
    const fakeDrive = drive({
      updateFile: vi.fn().mockRejectedValue(new Error('File not found')),
      createFile: vi.fn().mockResolvedValue('replacement-file'),
    });
    const autoSave = new AutoSaveUseCases({
      session: autoSaveSession(),
      drive: fakeDrive,
      lastProjectRepository: repository,
      scheduler: fakeScheduler.port,
      currentFileId,
      currentProjectName,
      saveStatus: ref('idle'),
      showStartupDialog: ref(false),
      isSignedIn: ref(true),
      alert: vi.fn(),
    }, 50);

    await autoSave.perform();

    expect(currentFileId.value).toBe('replacement-file');
    expect(fakeDrive.createFile).toHaveBeenCalledWith('Project', expect.objectContaining({ name: 'Project', schemaVersion: '8.0.0', commands: [] }));
    expect(repository.setLastProject).toHaveBeenCalledWith({ id: 'replacement-file', name: 'Project' });
  });
});

describe('BrowserLastProjectRepository', () => {
  it('is the single owner of last-project localStorage keys', () => {
    const storage = {
      values: new Map<string, string>(),
      getItem: vi.fn((key: string) => storage.values.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => { storage.values.set(key, value); }),
      removeItem: vi.fn((key: string) => { storage.values.delete(key); }),
    };
    const repository = new BrowserLastProjectRepository(storage);

    repository.setLastProject({ id: 'file-1', name: 'Project' });
    expect(repository.getLastProject()).toEqual({ id: 'file-1', name: 'Project' });
    repository.clearLastProject();
    expect(repository.getLastProject()).toBeNull();

    expect(storage.setItem).toHaveBeenCalledWith('diedrico_last_file_id', 'file-1');
    expect(storage.setItem).toHaveBeenCalledWith('diedrico_last_file_name', 'Project');
  });
});

describe('active-plane runtime API', () => {
  it('exposes active-plane state and actions on one runtime route', () => {
    const ports = runtimePorts({ drive: null });
    const runtime = createAppShellRuntime({ ports });

    runtime.internals.session.initializeDefaultWorldIfNeeded();
    runtime.actions.start();

    expect(runtime.planeOptions.value.length).toBeGreaterThan(1);
    expect(runtime.activePlaneName.value).toBeTruthy();
    const firstPlaneId = runtime.activePlaneId.value;
    if (!firstPlaneId) throw new Error('expected an active plane');

    runtime.cycleActivePlane(1);

    expect(runtime.activePlaneId.value).not.toBe(firstPlaneId);
    expect(runtime.state.activePlaneId.value).toBe(runtime.activePlaneId.value);

    runtime.setActivePlaneId(firstPlaneId);
    expect(runtime.activePlaneId.value).toBe(firstPlaneId);

    runtime.actions.dispose();
  });
});

describe('SelectionUseCases', () => {
  it('owns cascade-preview watcher and clears highlight on disposal', async () => {
    const selected = ref<string[]>(['selected']);
    const selectionStore = reactive({
      get selectedIdsArray() { return selected.value; },
      selectSingle: vi.fn(),
      addToSelection: vi.fn(),
      clearSelection: vi.fn(),
      selectMultiple: vi.fn(),
      setCascadeHighlight: vi.fn(),
      clearCascadeHighlight: vi.fn(),
    });
    const useCases = new SelectionUseCases(
      { getSelectableIdsInPlane: vi.fn(() => []), getCascadePreviewIds: vi.fn(() => ['dependent']) },
      { execute: vi.fn() },
      selectionStore as SelectionStorePort,
      () => 'plane-a',
    );

    useCases.start();
    await nextTick();
    expect(selectionStore.setCascadeHighlight).toHaveBeenCalledWith(['dependent']);

    selected.value = [];
    await nextTick();
    expect(selectionStore.clearCascadeHighlight).toHaveBeenCalled();

    useCases.dispose();
    selected.value = ['selected-again'];
    await nextTick();
    expect(selectionStore.setCascadeHighlight).toHaveBeenCalledTimes(1);
  });

  it('selects every element on the active plane through the selection store', () => {
    const selectionStore = {
      selectedIdsArray: [],
      selectSingle: vi.fn(),
      addToSelection: vi.fn(),
      clearSelection: vi.fn(),
      selectMultiple: vi.fn(),
      setCascadeHighlight: vi.fn(),
      clearCascadeHighlight: vi.fn(),
    };
    const useCases = new SelectionUseCases(
      { getSelectableIdsInPlane: vi.fn(() => ['p1', 'p2', 'l1', 'c1']), getCascadePreviewIds: vi.fn(() => []) },
      { execute: vi.fn() },
      selectionStore,
      () => 'plane-a',
    );

    useCases.selectAllInActivePlane();

    expect(selectionStore.selectMultiple).toHaveBeenCalledWith(['p1', 'p2', 'l1', 'c1']);
  });

  it('clears selection only after the delete command boundary succeeds', () => {
    const selectionStore = {
      selectedIdsArray: ['p1'],
      selectSingle: vi.fn(),
      addToSelection: vi.fn(),
      clearSelection: vi.fn(),
      selectMultiple: vi.fn(),
      setCascadeHighlight: vi.fn(),
      clearCascadeHighlight: vi.fn(),
    };
    const deleteSelectionCommand = { execute: vi.fn() };
    const useCases = new SelectionUseCases(
      { getSelectableIdsInPlane: vi.fn(() => []), getCascadePreviewIds: vi.fn(() => []) },
      deleteSelectionCommand,
      selectionStore,
      () => 'plane-a',
    );

    useCases.deleteSelected();

    expect(deleteSelectionCommand.execute).toHaveBeenCalledWith(['p1']);
    expect(selectionStore.clearSelection).toHaveBeenCalledTimes(1);
  });

  it('preserves selection when delete command boundary fails', () => {
    const selectionStore = {
      selectedIdsArray: ['p1'],
      selectSingle: vi.fn(),
      addToSelection: vi.fn(),
      clearSelection: vi.fn(),
      selectMultiple: vi.fn(),
      setCascadeHighlight: vi.fn(),
      clearCascadeHighlight: vi.fn(),
    };
    const deleteSelectionCommand = { execute: vi.fn(() => { throw new Error('delete failed'); }) };
    const useCases = new SelectionUseCases(
      { getSelectableIdsInPlane: vi.fn(() => []), getCascadePreviewIds: vi.fn(() => []) },
      deleteSelectionCommand,
      selectionStore,
      () => 'plane-a',
    );

    expect(() => useCases.deleteSelected()).toThrow('delete failed');
    expect(selectionStore.clearSelection).not.toHaveBeenCalled();
  });

  it('keeps empty selection as a no-op without invoking the delete command boundary', () => {
    const selectionStore = {
      selectedIdsArray: [],
      selectSingle: vi.fn(),
      addToSelection: vi.fn(),
      clearSelection: vi.fn(),
      selectMultiple: vi.fn(),
      setCascadeHighlight: vi.fn(),
      clearCascadeHighlight: vi.fn(),
    };
    const deleteSelectionCommand = { execute: vi.fn() };
    const useCases = new SelectionUseCases(
      { getSelectableIdsInPlane: vi.fn(() => []), getCascadePreviewIds: vi.fn(() => []) },
      deleteSelectionCommand,
      selectionStore,
      () => 'plane-a',
    );

    useCases.deleteSelected();

    expect(deleteSelectionCommand.execute).not.toHaveBeenCalled();
    expect(selectionStore.clearSelection).not.toHaveBeenCalled();
  });

  it('exposes select and extend actions through the app-shell selection port', () => {
    const selectionStore = {
      selectedIdsArray: [],
      selectSingle: vi.fn(),
      addToSelection: vi.fn(),
      clearSelection: vi.fn(),
      selectMultiple: vi.fn(),
      setCascadeHighlight: vi.fn(),
      clearCascadeHighlight: vi.fn(),
    };
    const useCases = new SelectionUseCases(
      { getSelectableIdsInPlane: vi.fn(() => []), getCascadePreviewIds: vi.fn(() => []) },
      { execute: vi.fn() },
      selectionStore,
      () => 'plane-a',
    );

    useCases.selectElement('p1');
    useCases.addElementToSelection('p2');
    useCases.clearSelection();

    expect(selectionStore.selectSingle).toHaveBeenCalledWith('p1');
    expect(selectionStore.addToSelection).toHaveBeenCalledWith('p2');
    expect(selectionStore.clearSelection).toHaveBeenCalledTimes(1);
  });

});

describe('ProjectSessionUseCases startup and project flows', () => {
  function projectSessionDeps(overrides: Partial<ConstructorParameters<typeof ProjectSessionUseCases>[0]> & { ports?: AppShellRuntimePorts } = {}) {
    const session: RuntimeSession & ProjectSessionKernel = new RuntimeSession();
    const { ports: overridePorts, ...depsOverrides } = overrides;
    const ports = overridePorts ?? runtimePorts();
    return {
      session,
      hasGoogleCredentials: true,
      showStartupDialog: ref(false),
      isSignedIn: ref(false),
      currentProjectName: ref<string | null>(null),
      currentFileId: ref<string | null>(null),
      isRenamingProject: ref(false),
      saveStatus: ref<'idle' | 'saving' | 'saved'>('idle'),
      startupDialog: { files: ref([]), loading: ref(false), loadingFiles: ref(false), error: ref<string | null>(null) },
      autoSave: autoSaveFixture(),
      drive: ports.drive,
      authStore: ports.authStore,
      lastProjectRepository: ports.lastProjectRepository,
      ...depsOverrides,
    };
  }

  it('initializes local-only startup without Drive and creates default planes', async () => {
    const deps = projectSessionDeps({ hasGoogleCredentials: false, ports: runtimePorts({ drive: null }) });
    const useCases = new ProjectSessionUseCases(deps);

    await useCases.initialize();

    expect(deps.showStartupDialog.value).toBe(false);
    expect(deps.session.planeOptions.length).toBeGreaterThan(0);
  });

  it('preserves the active project and history when remote creation fails', async () => {
    const deps = projectSessionDeps({ ports: runtimePorts({
      drive: drive({ createFile: vi.fn().mockRejectedValue(new Error('offline')) }),
    }) });
    deps.session.initializeDefaultWorldIfNeeded();
    deps.session.undo();
    const before = deps.session.snapshot('Existing');
    deps.currentFileId.value = 'existing-file';
    deps.currentProjectName.value = 'Existing';

    await new ProjectSessionUseCases(deps).createProject('New');

    expect(deps.session.snapshot('Existing').commands).toEqual(before.commands);
    expect(deps.session.canRedo()).toBe(true);
    expect(deps.currentFileId.value).toBe('existing-file');
    expect(deps.currentProjectName.value).toBe('Existing');
    expect(deps.autoSave.start).not.toHaveBeenCalled();
    expect(deps.startupDialog.error.value).toContain('offline');
  });

  it('keeps edits and redo available until new project creation succeeds', async () => {
    let resolveCreate!: (id: string) => void;
    const createFile = vi.fn((_name: string, _data: ProjectSessionPersistencePayload) => new Promise<string>(resolve => { resolveCreate = resolve; }));
    const deps = projectSessionDeps({ ports: runtimePorts({ drive: drive({ createFile }) }) });
    deps.session.initializeDefaultWorldIfNeeded();
    deps.session.undo();
    const before = deps.session.snapshot('Existing');
    const pending = new ProjectSessionUseCases(deps).createProject('New');
    expect(deps.session.snapshot('Existing').commands).toEqual(before.commands);
    expect(deps.session.canRedo()).toBe(true);
    const uploaded = createFile.mock.calls[0]?.[1];
    expect(uploaded).toEqual(expect.objectContaining({ name: 'New' }));
    resolveCreate('new-file');
    await pending;
    expect(deps.session.snapshot('New').commands).toEqual(uploaded?.commands);
    expect(deps.session.canRedo()).toBe(false);
    expect(deps.currentFileId.value).toBe('new-file');
    expect(deps.autoSave.start).toHaveBeenCalledOnce();
  });

  it('initializes a usable local world when Drive initialization fails', async () => {
    const deps = projectSessionDeps({ ports: runtimePorts({
      drive: drive({ initialize: vi.fn().mockRejectedValue(new Error('offline')) }),
    }) });
    await new ProjectSessionUseCases(deps).initialize();
    expect(deps.session.planeOptions.length).toBeGreaterThan(0);
    expect(deps.showStartupDialog.value).toBe(false);
  });

  it('loads and resets startup-dialog file list through typed runtime state', async () => {
    const deps = projectSessionDeps();
    const useCases = new ProjectSessionUseCases(deps);

    await useCases.requestFiles();
    expect(deps.startupDialog.files.value).toHaveLength(1);
    expect(deps.startupDialog.loadingFiles.value).toBe(false);

    useCases.dispose();
    expect(deps.startupDialog.files.value).toEqual([]);
    expect(deps.startupDialog.loading.value).toBe(false);
    expect(deps.startupDialog.loadingFiles.value).toBe(false);
    expect(deps.startupDialog.error.value).toBeNull();
  });



  it('keeps the active session intact when openProject rejects invalid project data', async () => {
    const ports = runtimePorts({
      drive: drive({ loadFile: vi.fn().mockResolvedValue({ bad: 'payload' }) }),
    });
    const deps = projectSessionDeps({ ports });
    deps.session.initializeDefaultWorldIfNeeded();
    deps.currentProjectName.value = 'Existing';
    deps.currentFileId.value = 'existing-file';
    const preOpenPlaneCount = deps.session.planeOptions.length;
    const preOpenCommandHistory = deps.session;
    const preOpenCanUndo = preOpenCommandHistory.canUndo();
    const useCases = new ProjectSessionUseCases(deps);

    await expect(useCases.openProject('bad-file')).rejects.toThrow('Unsupported project schema version');

    expect(deps.session.planeOptions).toHaveLength(preOpenPlaneCount);
    expect(deps.session.canUndo()).toBe(preOpenCanUndo);
    expect(preOpenCommandHistory.canUndo()).toBe(preOpenCanUndo);
    expect(preOpenCommandHistory.canRedo()).toBe(false);
    expect(deps.currentProjectName.value).toBe('Existing');
    expect(deps.currentFileId.value).toBe('existing-file');
    expect(deps.autoSave.start).not.toHaveBeenCalled();
  });

  it('restores into isolation before clearing active state when deserialization fails', async () => {
    const restoreError = new Error('restore exploded');
    const deserializeSpy = vi.spyOn(ProjectService, 'deserializeCommands').mockImplementation(() => { throw restoreError; });
    const ports = runtimePorts();
    const deps = projectSessionDeps({ ports });
    deps.session.initializeDefaultWorldIfNeeded();
    deps.currentProjectName.value = 'Existing';
    deps.currentFileId.value = 'existing-file';
    const preOpenPlaneCount = deps.session.planeOptions.length;
    const preOpenCommandHistory = deps.session;
    const preOpenCanUndo = preOpenCommandHistory.canUndo();
    const useCases = new ProjectSessionUseCases(deps);

    await expect(useCases.openProject('file-opened')).rejects.toThrow('restore exploded');

    expect(deserializeSpy).toHaveBeenCalledTimes(1);
    deserializeSpy.mockRestore();
    expect(deps.session.planeOptions).toHaveLength(preOpenPlaneCount);
    expect(deps.session.canUndo()).toBe(preOpenCanUndo);
    expect(preOpenCommandHistory.canUndo()).toBe(preOpenCanUndo);
    expect(preOpenCommandHistory.canRedo()).toBe(false);
    expect(deps.currentProjectName.value).toBe('Existing');
    expect(deps.currentFileId.value).toBe('existing-file');
    expect(deps.autoSave.start).not.toHaveBeenCalled();
  });

  it('keeps save status retryable when session snapshot fails during autosave', async () => {
    const fakeScheduler = scheduler();
    const saveStatus = ref<'idle' | 'saving' | 'saved'>('saving');
    const autoSave = new AutoSaveUseCases({
      session: { getVersion: () => 1, snapshot: () => { throw new Error('snapshot failed'); } } satisfies SnapshotCapableProjectSessionKernel,
      drive: drive(),
      lastProjectRepository: lastProjectRepository(),
      scheduler: fakeScheduler.port,
      currentFileId: ref('file-1'),
      currentProjectName: ref('Project'),
      saveStatus,
      showStartupDialog: ref(false),
      isSignedIn: ref(true),
      alert: vi.fn(),
    }, 50);

    await autoSave.perform();

    expect(saveStatus.value).toBe('idle');
    expect(fakeScheduler.port.clearInterval).not.toHaveBeenCalled();
  });

  it('creates, opens, renames, and signs out without replacing stable world or command-history references', async () => {
    const deps = projectSessionDeps();
    const originalPlaneCount = deps.session.planeOptions.length;
    const originalCommandHistory = deps.session;
    const useCases = new ProjectSessionUseCases(deps);

    await useCases.createProject('Created');
    expect(deps.currentProjectName.value).toBe('Created');
    expect(deps.currentFileId.value).toBe('file-created');
    expect(deps.autoSave.start).toHaveBeenCalled();
    expect(deps.lastProjectRepository.setLastProject).toHaveBeenCalledWith({ id: 'file-created', name: 'Created' });
    expect(deps.drive?.createFile).toHaveBeenCalledWith('Created', expect.objectContaining({ name: 'Created', schemaVersion: '8.0.0', commands: expect.any(Array) }));

    await useCases.openProject('file-opened');
    expect(deps.currentProjectName.value).toBe('Loaded project');
    expect(deps.currentFileId.value).toBe('file-opened');
    expect(deps.session.planeOptions.length).toBeGreaterThan(0);

    await useCases.renameProject('Renamed');
    expect(deps.currentProjectName.value).toBe('Renamed');
    expect(deps.lastProjectRepository.setLastProject).toHaveBeenCalledWith({ id: 'file-opened', name: 'Renamed' });
    expect(deps.autoSave.schedule).toHaveBeenCalled();

    await useCases.signOut();
    expect(deps.session.planeOptions).toHaveLength(originalPlaneCount);
    expect(deps.session.canUndo()).toBe(originalCommandHistory.canUndo());
    expect(deps.currentProjectName.value).toBeNull();
    expect(deps.currentFileId.value).toBeNull();
    expect(deps.showStartupDialog.value).toBe(true);
    expect(deps.autoSave.stop).toHaveBeenCalled();
  });
});

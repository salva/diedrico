import { describe, expect, it, vi } from 'vitest';
import { nextTick, reactive, ref } from 'vue';
import { createAppShellRuntime } from '@/application/appShell/AppShellRuntime';
import { createProductionAppShellRuntime } from '@/application/appShell/AppShellProductionRuntime';
import { ActivePlaneUseCases } from '@/application/appShell/ActivePlaneUseCases';
import { AutoSaveUseCases } from '@/application/appShell/AutoSaveUseCases';
import { BrowserLastProjectRepository } from '@/application/appShell/BrowserLastProjectRepository';
import { ProjectSessionUseCases } from '@/application/appShell/ProjectSessionUseCases';
import { RuntimeSession } from '@/application/appShell/RuntimeSession';
import { SelectionUseCases } from '@/application/appShell/SelectionUseCases';
import { World } from '@/domain/world/World';
import type { AppShellRuntimePorts, DrivePort, LastProjectRepositoryPort, ProjectSessionPersistencePort, SchedulerPort } from '@/application/appShell/AppShellPorts';

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

function drive(overrides: Partial<DrivePort> = {}): DrivePort {
  return {
    initialize: vi.fn().mockResolvedValue(undefined),
    isSignedIn: vi.fn(() => true),
    signIn: vi.fn().mockResolvedValue(undefined),
    signOut: vi.fn().mockResolvedValue(undefined),
    fetchUserProfile: vi.fn().mockResolvedValue({ email: 'user@example.test', name: 'User' }),
    listFiles: vi.fn().mockResolvedValue([{ id: 'file-1', name: 'Project 1', modifiedTime: 'now' }]),
    createFile: vi.fn().mockResolvedValue('file-created'),
    loadFile: vi.fn().mockResolvedValue({ id: 'project-id', schemaVersion: '6.0.0', name: 'Loaded project', created: 'now', modified: 'now', nextElementId: 1, commands: [] }),
    updateFile: vi.fn().mockResolvedValue(undefined),
    renameFile: vi.fn().mockResolvedValue(undefined),
    generateDefaultProjectName: vi.fn().mockResolvedValue('Untitled project'),
    ...overrides,
  } as DrivePort;
}

function persistence(): ProjectSessionPersistencePort {
  return {
    snapshotCurrentSession: vi.fn((session, projectName) => ({
      id: 'project-id',
      schemaVersion: '6.0.0',
      name: projectName,
      created: 'now',
      modified: 'now',
      nextElementId: session.nextElementId,
      commands: [],
    })),
    validateProjectData: vi.fn((data: any) => ({ projectName: String(data.name), payload: data as never })),
    restoreSession: vi.fn(),
  };
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

function runtimePorts(overrides: Partial<AppShellRuntimePorts> = {}) {
  const keyboardTarget = { addEventListener: vi.fn(), removeEventListener: vi.fn() };
  return {
    drive: drive(),
    persistence: persistence(),
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
  it('keeps world and command stack identity stable while start/dispose owns explicit listeners and subscriptions', async () => {
    const ports = runtimePorts();
    const runtime = createAppShellRuntime({ ports });
    const world = runtime.world;
    const commandStack = runtime.commandStack;
    const subscribe = vi.spyOn(world, 'subscribeToChanges');
    const unsubscribe = vi.spyOn(world, 'unsubscribeFromChanges');

    runtime.actions.start();
    runtime.actions.start();
    await Promise.resolve();

    expect(runtime.world).toBe(world);
    expect(runtime.commandStack).toBe(commandStack);
    expect(ports.keyboardTarget.addEventListener).toHaveBeenCalledTimes(1);
    expect(subscribe).toHaveBeenCalledTimes(1);

    runtime.actions.dispose();
    runtime.actions.dispose();

    expect(runtime.world).toBe(world);
    expect(runtime.commandStack).toBe(commandStack);
    expect(ports.keyboardTarget.removeEventListener).toHaveBeenCalledTimes(1);
    expect(unsubscribe).toHaveBeenCalledTimes(1);
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

    expect(runtime.world).toBeInstanceOf(World);
  });

  it('sign-out clears project state without replacing runtime-owned world or command stack', async () => {
    const ports = runtimePorts();
    const runtime = createAppShellRuntime({ ports });
    const world = runtime.world;
    const commandStack = runtime.commandStack;
    runtime.state.currentProjectName.value = 'Current';
    runtime.state.currentFileId.value = 'file-1';

    await runtime.actions.toolbarSignOut();

    expect(runtime.world).toBe(world);
    expect(runtime.commandStack).toBe(commandStack);
    expect(runtime.state.currentProjectName.value).toBeNull();
    expect(runtime.state.currentFileId.value).toBeNull();
    expect(runtime.state.showStartupDialog.value).toBe(true);
    expect(ports.authStore.clearAuth).toHaveBeenCalled();
  });
});

describe('AutoSaveUseCases', () => {
  it('owns polling, debounce, saved-status timers and clears them on dispose', async () => {
    const fakeScheduler = scheduler();
    let version = 1;
    const saveStatus = ref<'idle' | 'saving' | 'saved'>('idle');
    const currentFileId = ref('file-1');
    const currentProjectName = ref('Project');
    const autoSave = new AutoSaveUseCases({
      session: { getVersion: () => version, snapshot: (_projectName: string, p: ProjectSessionPersistencePort) => p.snapshotCurrentSession({ commandStack: {} as any, nextElementId: 10 } as any, _projectName) } as any,
      drive: drive(),
      persistence: persistence(),
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
      session: { getVersion: () => 1, snapshot: (_projectName: string, p: ProjectSessionPersistencePort) => p.snapshotCurrentSession({ commandStack: {} as any, nextElementId: 10 } as any, _projectName) } as any,
      drive: drive({ updateFile: vi.fn().mockRejectedValue(new Error('401 authentication expired')) }),
      persistence: persistence(),
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
    const autoSave = new AutoSaveUseCases({
      session: { getVersion: () => 1, snapshot: (_projectName: string, p: ProjectSessionPersistencePort) => p.snapshotCurrentSession({ commandStack: {} as any, nextElementId: 10 } as any, _projectName) } as any,
      drive: drive({
        updateFile: vi.fn().mockRejectedValue(new Error('File not found')),
        createFile: vi.fn().mockResolvedValue('replacement-file'),
      }),
      persistence: persistence(),
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

describe('ActivePlaneUseCases', () => {
  it('subscribes once, updates active-plane DTO, cycles planes, and unsubscribes on dispose', () => {
    const planeA = { id: 'plane-a', name: 'P_A' };
    const planeB = { id: 'plane-b', name: 'P_B' };
    let activePlaneId = 'plane-a';
    let listener: (() => void) | null = null;
    const world = {
      subscribeToChanges: vi.fn((handler: () => void) => { listener = handler; }),
      unsubscribeFromChanges: vi.fn(),
      getActivePlaneId: vi.fn(() => activePlaneId),
      setActivePlaneId: vi.fn((id: string) => { activePlaneId = id; listener?.(); }),
      getProjectionPlaneSummaries: vi.fn(() => [planeA, planeB]),
      getProjectionPlaneName: vi.fn((id: string) => (id === 'plane-a' ? planeA : planeB).name),
    };
    const state = { activePlaneId: ref<string | undefined>(), activePlaneName: ref('') };
    const useCases = new ActivePlaneUseCases(world as any, state);

    useCases.start();
    useCases.start();
    expect(world.subscribeToChanges).toHaveBeenCalledTimes(1);
    expect(state.activePlaneName.value).toBe('P_A');

    useCases.cycle(1);
    expect(world.setActivePlaneId).toHaveBeenCalledWith('plane-b');
    expect(state.activePlaneId.value).toBe('plane-b');
    expect(state.activePlaneName.value).toBe('P_B');

    useCases.dispose();
    useCases.dispose();
    expect(world.unsubscribeFromChanges).toHaveBeenCalledTimes(1);
  });
});

describe('SelectionUseCases', () => {
  it('owns cascade-preview watcher and clears highlight on disposal', async () => {
    const selected = ref<string[]>(['selected']);
    const selectionStore = reactive({
      get selectedIdsArray() { return selected.value; },
      clearSelection: vi.fn(),
      selectMultiple: vi.fn(),
      setCascadeHighlight: vi.fn(),
      clearCascadeHighlight: vi.fn(),
    });
    const useCases = new SelectionUseCases(
      { getSelectableIdsInPlane: vi.fn(() => []), getCascadePreviewIds: vi.fn(() => ['dependent']) },
      { execute: vi.fn() },
      selectionStore as any,
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

});

describe('ProjectSessionUseCases startup and project flows', () => {
  function projectSessionDeps(overrides: Partial<ConstructorParameters<typeof ProjectSessionUseCases>[0]> = {}) {
    const session = new RuntimeSession();
    const ports = runtimePorts();
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
      autoSave: { start: vi.fn(), schedule: vi.fn(), stop: vi.fn(), dispose: vi.fn() } as any,
      ports,
      ...overrides,
    };
  }

  it('initializes local-only startup without Drive and creates default planes', async () => {
    const deps = projectSessionDeps({ hasGoogleCredentials: false, ports: runtimePorts({ drive: null }) });
    const useCases = new ProjectSessionUseCases(deps as any);

    await useCases.initialize();

    expect(deps.showStartupDialog.value).toBe(false);
    expect(deps.session.worldForView().getAllProjectionPlanes().length).toBeGreaterThan(0);
  });

  it('loads and resets startup-dialog file list through typed runtime state', async () => {
    const deps = projectSessionDeps();
    const useCases = new ProjectSessionUseCases(deps as any);

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
      persistence: {
        ...persistence(),
        validateProjectData: vi.fn(() => { throw new Error('invalid payload'); }),
      },
    });
    const deps = projectSessionDeps({ ports });
    deps.session.initializeDefaultWorldIfNeeded();
    deps.currentProjectName.value = 'Existing';
    deps.currentFileId.value = 'existing-file';
    const preOpenWorld = deps.session.worldForView();
    const preOpenCommandStack = deps.session.commandStackForDeferredCommandProducers();
    const preOpenPlaneCount = preOpenWorld.getAllProjectionPlanes().length;
    const preOpenNextId = preOpenWorld.peekNextId();
    const preOpenUndoCount = preOpenCommandStack.getUndoCount();
    const useCases = new ProjectSessionUseCases(deps as any);

    await expect(useCases.openProject('bad-file')).rejects.toThrow('invalid payload');

    expect(deps.session.worldForView()).toBe(preOpenWorld);
    expect(deps.session.commandStackForDeferredCommandProducers()).toBe(preOpenCommandStack);
    expect(preOpenWorld.getAllProjectionPlanes()).toHaveLength(preOpenPlaneCount);
    expect(preOpenWorld.peekNextId()).toBe(preOpenNextId);
    expect(preOpenCommandStack.getUndoCount()).toBe(preOpenUndoCount);
    expect(preOpenCommandStack.canUndo()).toBe(preOpenUndoCount > 0);
    expect(preOpenCommandStack.canRedo()).toBe(false);
    expect(deps.currentProjectName.value).toBe('Existing');
    expect(deps.currentFileId.value).toBe('existing-file');
    expect(deps.autoSave.start).not.toHaveBeenCalled();
  });

  it('restores into isolation before clearing active state when deserialization fails', async () => {
    const restoreError = new Error('restore exploded');
    const ports = runtimePorts({
      persistence: {
        ...persistence(),
        restoreSession: vi.fn(() => { throw restoreError; }),
      },
    });
    const deps = projectSessionDeps({ ports });
    deps.session.initializeDefaultWorldIfNeeded();
    deps.currentProjectName.value = 'Existing';
    deps.currentFileId.value = 'existing-file';
    const preOpenWorld = deps.session.worldForView();
    const preOpenCommandStack = deps.session.commandStackForDeferredCommandProducers();
    const preOpenPlaneCount = preOpenWorld.getAllProjectionPlanes().length;
    const preOpenNextId = preOpenWorld.peekNextId();
    const preOpenUndoCount = preOpenCommandStack.getUndoCount();
    const useCases = new ProjectSessionUseCases(deps as any);

    await expect(useCases.openProject('file-opened')).rejects.toThrow('restore exploded');

    expect(ports.persistence.restoreSession).toHaveBeenCalledTimes(1);
    expect(ports.persistence.restoreSession).not.toHaveBeenCalledWith(expect.anything(), { world: preOpenWorld, commandStack: preOpenCommandStack });
    expect(deps.session.worldForView()).toBe(preOpenWorld);
    expect(deps.session.commandStackForDeferredCommandProducers()).toBe(preOpenCommandStack);
    expect(preOpenWorld.getAllProjectionPlanes()).toHaveLength(preOpenPlaneCount);
    expect(preOpenWorld.peekNextId()).toBe(preOpenNextId);
    expect(preOpenCommandStack.getUndoCount()).toBe(preOpenUndoCount);
    expect(preOpenCommandStack.canUndo()).toBe(preOpenUndoCount > 0);
    expect(preOpenCommandStack.canRedo()).toBe(false);
    expect(deps.currentProjectName.value).toBe('Existing');
    expect(deps.currentFileId.value).toBe('existing-file');
    expect(deps.autoSave.start).not.toHaveBeenCalled();
  });

  it('keeps save status retryable when session snapshot fails during autosave', async () => {
    const fakeScheduler = scheduler();
    const saveStatus = ref<'idle' | 'saving' | 'saved'>('saving');
    const autoSave = new AutoSaveUseCases({
      session: { getVersion: () => 1, snapshot: () => { throw new Error('snapshot failed'); } } as any,
      drive: drive(),
      persistence: persistence(),
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

  it('creates, opens, renames, and signs out without replacing stable world or command stack references', async () => {
    const deps = projectSessionDeps();
    const originalWorld = deps.session.worldForView();
    const originalCommandStack = deps.session.commandStackForDeferredCommandProducers();
    const useCases = new ProjectSessionUseCases(deps as any);

    await useCases.createProject('Created');
    expect(deps.currentProjectName.value).toBe('Created');
    expect(deps.currentFileId.value).toBe('file-created');
    expect(deps.autoSave.start).toHaveBeenCalled();
    expect(deps.ports.lastProjectRepository.setLastProject).toHaveBeenCalledWith({ id: 'file-created', name: 'Created' });

    await useCases.openProject('file-opened');
    expect(deps.currentProjectName.value).toBe('Loaded project');
    expect(deps.currentFileId.value).toBe('file-opened');
    expect(deps.ports.persistence.restoreSession).toHaveBeenCalled();

    await useCases.renameProject('Renamed');
    expect(deps.currentProjectName.value).toBe('Renamed');
    expect(deps.ports.lastProjectRepository.setLastProject).toHaveBeenCalledWith({ id: 'file-opened', name: 'Renamed' });
    expect(deps.autoSave.schedule).toHaveBeenCalled();

    await useCases.signOut();
    expect(deps.session.worldForView()).toBe(originalWorld);
    expect(deps.session.commandStackForDeferredCommandProducers()).toBe(originalCommandStack);
    expect(deps.currentProjectName.value).toBeNull();
    expect(deps.currentFileId.value).toBeNull();
    expect(deps.showStartupDialog.value).toBe(true);
    expect(deps.autoSave.stop).toHaveBeenCalled();
  });
});

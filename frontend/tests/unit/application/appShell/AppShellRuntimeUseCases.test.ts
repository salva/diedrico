import { describe, expect, it, vi } from 'vitest';
import { computed, nextTick, reactive, ref } from 'vue';
import { Vector3 } from 'three';
import { createAppShellRuntime } from '@/application/appShell/AppShellRuntime';
import { ActivePlaneUseCases } from '@/application/appShell/ActivePlaneUseCases';
import { AutoSaveUseCases } from '@/application/appShell/AutoSaveUseCases';
import { ProjectSessionUseCases } from '@/application/appShell/ProjectSessionUseCases';
import { SelectionUseCases } from '@/application/appShell/SelectionUseCases';
import { CommandStack } from '@/commands/CommandStack';
import { World } from '@/domain/world/World';
import type { AppShellRuntimePorts, DrivePort, ProjectPersistencePort, SchedulerPort } from '@/application/appShell/AppShellPorts';

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
    loadFile: vi.fn().mockResolvedValue({ name: 'Loaded project' }),
    updateFile: vi.fn().mockResolvedValue(undefined),
    renameFile: vi.fn().mockResolvedValue(undefined),
    generateDefaultProjectName: vi.fn().mockResolvedValue('Untitled project'),
    ...overrides,
  } as DrivePort;
}

function persistence(): ProjectPersistencePort {
  return {
    serializeCommands: vi.fn((_commandStack, nextElementId, projectName) => ({
      version: '4.0.0',
      name: projectName,
      nextElementId,
      commands: [],
    } as any)),
    validateProjectData: vi.fn(),
    deserializeCommands: vi.fn(),
  };
}

function storage() {
  const values = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => { values.set(key, value); }),
    removeItem: vi.fn((key: string) => { values.delete(key); }),
  };
}

function runtimePorts(overrides: Partial<AppShellRuntimePorts> = {}) {
  return {
    drive: drive(),
    persistence: persistence(),
    storage: storage(),
    scheduler: scheduler().port,
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
  it('keeps world and command stack identity stable while start/dispose owns global listeners and subscriptions', async () => {
    const addEventListener = vi.spyOn(window, 'addEventListener');
    const removeEventListener = vi.spyOn(window, 'removeEventListener');
    const ports = runtimePorts();
    const runtime = createAppShellRuntime({
      googleConfig: {} as any,
      hasGoogleCredentials: true,
      ports,
      callbacks: ports.callbacks,
    });
    const world = runtime.world;
    const commandStack = runtime.commandStack;
    const subscribe = vi.spyOn(world, 'subscribeToChanges');
    const unsubscribe = vi.spyOn(world, 'unsubscribeFromChanges');

    runtime.actions.start();
    runtime.actions.start();
    await Promise.resolve();

    expect(runtime.world).toBe(world);
    expect(runtime.commandStack).toBe(commandStack);
    expect(addEventListener.mock.calls.filter(([event]) => event === 'keydown')).toHaveLength(1);
    expect(subscribe).toHaveBeenCalledTimes(1);

    runtime.actions.dispose();
    runtime.actions.dispose();

    expect(runtime.world).toBe(world);
    expect(runtime.commandStack).toBe(commandStack);
    expect(removeEventListener.mock.calls.filter(([event]) => event === 'keydown')).toHaveLength(1);
    expect(unsubscribe).toHaveBeenCalledTimes(1);

    addEventListener.mockRestore();
    removeEventListener.mockRestore();
  });

  it('sign-out clears project state without replacing runtime-owned world or command stack', async () => {
    const ports = runtimePorts();
    const runtime = createAppShellRuntime({
      googleConfig: {} as any,
      hasGoogleCredentials: true,
      ports,
      callbacks: ports.callbacks,
    });
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
      world: { getVersion: () => version, peekNextId: () => 10 } as any,
      commandStack: {} as any,
      drive: drive(),
      persistence: persistence(),
      storage: storage(),
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
      world: { getVersion: () => 1, peekNextId: () => 10 } as any,
      commandStack: {} as any,
      drive: drive({ updateFile: vi.fn().mockRejectedValue(new Error('401 authentication expired')) }),
      persistence: persistence(),
      storage: storage(),
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
      getProjectionPlaneById: vi.fn((id: string) => id === 'plane-a' ? planeA : planeB),
      getAllProjectionPlanes: vi.fn(() => [planeA, planeB]),
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
      { getDependencyService: () => ({ getElementsInDeletionOrder: vi.fn(() => ['selected', 'dependent']) }) } as any,
      { push: vi.fn() } as any,
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
    const activePlane = {
      getAllPoints: () => [{ id: 'p1' }, { id: 'p2' }],
      getAllLines: () => [{ id: 'l1' }],
      getAllCircles: () => [{ id: 'c1' }],
    };
    const useCases = new SelectionUseCases(
      { getProjectionPlaneById: vi.fn(() => activePlane) } as any,
      { push: vi.fn() } as any,
      selectionStore,
      () => 'plane-a',
    );

    useCases.selectAllInActivePlane();

    expect(selectionStore.selectMultiple).toHaveBeenCalledWith(['p1', 'p2', 'l1', 'c1']);
  });
});

describe('ProjectSessionUseCases startup and project flows', () => {
  function projectSessionDeps(overrides: Partial<Parameters<typeof ProjectSessionUseCases>[0]> = {}) {
    const world = new World();
    const commandStack = new CommandStack();
    const ports = runtimePorts();
    return {
      world,
      commandStack,
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
    expect(deps.world.getAllProjectionPlanes().length).toBeGreaterThan(0);
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

  it('creates, opens, renames, and signs out without replacing stable world or command stack references', async () => {
    const deps = projectSessionDeps();
    const originalWorld = deps.world;
    const originalCommandStack = deps.commandStack;
    const useCases = new ProjectSessionUseCases(deps as any);

    await useCases.createProject('Created');
    expect(deps.currentProjectName.value).toBe('Created');
    expect(deps.currentFileId.value).toBe('file-created');
    expect(deps.autoSave.start).toHaveBeenCalled();

    await useCases.openProject('file-opened');
    expect(deps.currentProjectName.value).toBe('Loaded project');
    expect(deps.currentFileId.value).toBe('file-opened');

    await useCases.renameProject('Renamed');
    expect(deps.currentProjectName.value).toBe('Renamed');
    expect(deps.autoSave.schedule).toHaveBeenCalled();

    await useCases.signOut();
    expect(deps.world).toBe(originalWorld);
    expect(deps.commandStack).toBe(originalCommandStack);
    expect(deps.currentProjectName.value).toBeNull();
    expect(deps.currentFileId.value).toBeNull();
    expect(deps.showStartupDialog.value).toBe(true);
    expect(deps.autoSave.stop).toHaveBeenCalled();
  });
});

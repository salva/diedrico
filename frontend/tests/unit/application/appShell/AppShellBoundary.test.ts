import { describe, expect, it } from 'vitest';
import appVue from '@/App.vue?raw';
import toolbarVue from '@/components/toolbars/Toolbar.vue?raw';
import startupDialogVue from '@/components/dialogs/StartupDialog.vue?raw';
import appShellRuntime from '@/application/appShell/AppShellRuntime.ts?raw';
import appShellProductionRuntime from '@/application/appShell/AppShellProductionRuntime.ts?raw';
import appShellPorts from '@/application/appShell/AppShellPorts.ts?raw';
import runtimeInjectionKeys from '@/application/appShell/RuntimeInjectionKeys.ts?raw';
import browserLastProjectRepository from '@/application/appShell/BrowserLastProjectRepository.ts?raw';
import activePlane from '@/application/appShell/ActivePlaneUseCases.ts?raw';
import autoSave from '@/application/appShell/AutoSaveUseCases.ts?raw';
import keyboard from '@/application/appShell/KeyboardShortcutRouter.ts?raw';
import projectSession from '@/application/appShell/ProjectSessionUseCases.ts?raw';
import selection from '@/application/appShell/SelectionUseCases.ts?raw';
import selectionDeletionService from '@/application/selectionDeletion/SelectionDeletionCommandService.ts?raw';
import runtimeSession from '@/application/appShell/RuntimeSession.ts?raw';
import projectSessionPersistenceAdapter from '@/application/appShell/ProjectSessionPersistenceAdapter.ts?raw';
import projectSessionKernel from '@/application/appShell/ProjectSessionKernel.ts?raw';
import projectSessionPersistenceTargets from '@/application/appShell/ProjectSessionPersistenceTargets.ts?raw';

describe('Wave 009 app-shell boundaries', () => {
  it('keeps App.vue free of moved shell orchestration imports and browser bridges', () => {
    expect(appVue).not.toMatch(/DeletionSequenceFactory|ProjectService|GoogleDriveService|window as any|__autoSaveInterval|CustomEvent\('load-files'\)|Environment variables/);
    expect(appVue).not.toMatch(/function handleKeyDown|addEventListener\('keydown'/);
  });

  it('keeps Toolbar and StartupDialog passive for global browser events', () => {
    expect(toolbarVue).not.toMatch(/addEventListener\('keydown'|removeEventListener\('keydown'|function handleKeyDown|switch \(event\.key/);
    expect(startupDialogVue).not.toMatch(/window\.dispatchEvent|CustomEvent\('load-files'\)|defineExpose/);
  });

  it('keeps appShell modules independent of Vue components', () => {
    for (const content of [appShellRuntime, appShellPorts, activePlane, autoSave, keyboard, projectSession, selection]) {
      expect(content).not.toMatch(/components\//);
    }
  });
});

describe('Cycle 020 app-shell production boundary', () => {
  it('keeps runtime core free of hidden production browser/service defaults', () => {
    expect(appShellRuntime).not.toMatch(/new GoogleDriveService|ProjectService|window\.localStorage|createBrowserScheduler|keyboard\.install\(window\)/);
    expect(appShellRuntime).toMatch(/keyboard\.install\(ports\.keyboardTarget\)/);
  });

  it('centralizes production browser/service defaults in the production composition module', () => {
    expect(appShellProductionRuntime).toMatch(/new GoogleDriveService/);
    expect(appShellProductionRuntime).toMatch(/new ProjectSessionPersistenceAdapter\(\)/);
    expect(appShellProductionRuntime).toMatch(/new BrowserLastProjectRepository\(window\.localStorage\)/);
    expect(appShellProductionRuntime).toMatch(/createBrowserScheduler\(\)/);
    expect(appShellProductionRuntime).toMatch(/keyboardTarget: window/);
    expect(appVue).toMatch(/createProductionAppShellRuntime/);
    expect(appVue).not.toMatch(/createBrowserScheduler|new BrowserLastProjectRepository|new ProjectSessionPersistenceAdapter|new GoogleDriveService/);
  });

  it('makes the browser last-project repository the only owner of storage-key literals', () => {
    const sources = [appShellRuntime, appShellPorts, activePlane, autoSave, keyboard, projectSession, selection, appShellProductionRuntime];
    for (const content of sources) {
      expect(content).not.toMatch(/diedrico_last_file_id|diedrico_last_file_name/);
    }
    expect(browserLastProjectRepository).toMatch(/diedrico_last_file_id/);
    expect(browserLastProjectRepository).toMatch(/diedrico_last_file_name/);
  });

  it('moves selection delete command construction behind the dedicated service boundary', () => {
    expect(selection).not.toMatch(/DeletionSequenceFactory|new Command|CommandStack|commandStack\.push|\.commit\(/);
    expect(selectionDeletionService).toMatch(/DeletionSequenceFactory/);
    expect(selectionDeletionService).toMatch(/new Command/);
    expect(selectionDeletionService).toMatch(/commandStack\.push/);
    expect(selectionDeletionService).toMatch(/\.commit\(/);
    expect(appShellRuntime).toMatch(/session\.selectionDeletionCommandPort\(\)/);
  });
});


describe('Cycle 022 runtime session persistence boundary', () => {
  it('keeps app-shell ports free of concrete runtime handles while naming the current persistence DTO contract', () => {
    expect(appShellPorts).not.toMatch(/@\/commands\/CommandStack|@\/domain\/world\/World/);
    expect(appShellPorts).toMatch(/import type \{ ProjectData \} from '@\/services\/ProjectService'/);
    expect(appShellPorts).toMatch(/export type ProjectSessionPersistencePayload = ProjectData/);
    expect(appShellPorts).not.toMatch(/SerializedProjectSession|schemaVersion|commands:|created:|modified:/);
    expect(appShellPorts).toMatch(/OpenedProjectSession/);
    expect(appShellPorts).not.toMatch(/PersistedProjectSession/);
    expect(appShellPorts).toMatch(/RuntimeSessionSnapshotHandle/);
    expect(appShellPorts).toMatch(/RuntimeSessionRestoreHandle/);
    expect(appShellPorts).toMatch(/createFile\(fileName: string, data: ProjectSessionPersistencePayload\)/);
    expect(appShellPorts).toMatch(/updateFile\(fileId: string, data: ProjectSessionPersistencePayload\)/);
    expect(appShellPorts).toMatch(/loadFile\(fileId: string\): Promise<unknown>/);
    expect(projectSessionKernel).toMatch(/ProjectSessionKernel/);
    expect(projectSessionKernel).not.toMatch(/@\/commands\/CommandStack|@\/domain\/world\/World|@\/services\/ProjectService/);
    expect(projectSessionKernel).toMatch(/snapshot\(projectName: string, persistence: ProjectSessionPersistencePort\): ProjectSessionPersistencePayload/);
  });

  it('removes raw runtime-pair persistence calls from project-session and autosave use cases', () => {
    expect(projectSession).not.toMatch(/@\/commands\/CommandStack|@\/domain\/world\/World|@\/services\/ProjectService|initializeWorld|from '\.\/RuntimeSession'/);
    expect(projectSession).toMatch(/ProjectSessionKernel/);
    expect(autoSave).not.toMatch(/@\/commands\/CommandStack|@\/domain\/world\/World/);
    expect(projectSession).not.toMatch(/\.name\)|projectData\.name|schemaVersion|commands/);
    expect(projectSession).toMatch(/openedSession\.projectName/);
    expect(projectSession).not.toMatch(/snapshotCurrentSession\(\{[\s\S]*commandStack[\s\S]*world/);
    expect(autoSave).not.toMatch(/snapshotCurrentSession\(\{[\s\S]*commandStack[\s\S]*world/);
  });

  it('keeps ProjectService awareness inside the app-shell persistence adapter', () => {
    const runtimeOrchestrationSources = [appShellRuntime, activePlane, autoSave, keyboard, projectSession, selection, runtimeSession];
    for (const content of runtimeOrchestrationSources) {
      expect(content).not.toMatch(/@\/services\/ProjectService/);
    }
    expect(appShellPorts).toMatch(/import type \{ ProjectData \} from '@\/services\/ProjectService'/);
    expect(appShellPorts).not.toMatch(/new ProjectService|ProjectService\./);
    expect(projectSessionPersistenceAdapter).toMatch(/@\/services\/ProjectService/);
  });
});


describe('Cycle 030 app-shell persistence DTO contract', () => {
  it('deletes cast-only persisted-session markers and object snapshot seams', () => {
    for (const content of [appShellPorts, projectSessionPersistenceAdapter, projectSessionKernel, runtimeSession]) {
      expect(content).not.toMatch(/PersistedProjectSession/);
      expect(content).not.toMatch(/as unknown as PersistedProjectSession/);
      expect(content).not.toMatch(/as unknown as ProjectData/);
      expect(content).not.toMatch(/snapshot\([^)]*\): object/);
      expect(content).not.toMatch(/snapshotCurrentSession\([^)]*\): object/);
    }

    expect(appShellPorts).toMatch(/ProjectSessionPersistencePayload/);
    expect(projectSessionPersistenceAdapter).toMatch(/snapshotCurrentSession\([^)]*\): ProjectSessionPersistencePayload/);
    expect(projectSessionPersistenceAdapter).toMatch(/ProjectService\.deserializeCommands\(data, target\.world, target\.commandStack\)/);
    expect(projectSessionPersistenceAdapter).not.toMatch(/payload: .* as/);
  });
});


describe('Cycle 023 runtime-session consumer ports and command-history boundary', () => {
  it('removes selected raw RuntimeSession use-case and shortcut accessors', () => {
    expect(runtimeSession).not.toMatch(/worldForUseCases\(/);
    expect(runtimeSession).not.toMatch(/commandStackForCommandServices\(/);
    expect(runtimeSession).not.toMatch(/commandStackForShortcuts\(/);
    expect(runtimeSession).not.toMatch(/commandStackForView\(/);
    expect(runtimeSession).not.toMatch(/commandStackForDeferredCommandProducers\(/);
    expect(runtimeSession).toMatch(/canvasCommandProducerPort\(/);
    expect(runtimeSession).toMatch(/processHistoryCommandPort\(/);
    expect(runtimeSession).toMatch(/activePlanePort\(/);
    expect(runtimeSession).toMatch(/selectionReadPort\(/);
    expect(runtimeSession).toMatch(/commandHistoryPort\(/);
    expect(runtimeSession).toMatch(/selectionDeletionCommandPort\(/);
  });

  it('keeps active-plane, selection, keyboard, and toolbar history consumers on narrow ports', () => {
    expect(activePlane).not.toMatch(/@\/domain\/world\/World/);
    expect(selection).not.toMatch(/@\/domain\/world\/World/);
    expect(keyboard).not.toMatch(/@\/commands\/CommandStack/);
    expect(toolbarVue).toMatch(/CommandHistoryInjectionKey/);
    expect(toolbarVue).not.toMatch(/inject<unknown>\('commandStack'\)/);
  });

  it('replaces raw command-stack producer wiring with typed runtime command ports', () => {
    expect(runtimeInjectionKeys).toMatch(/InjectionKey<ToolCommandSink>/);
    expect(runtimeInjectionKeys).toMatch(/InjectionKey<ProcessHistoryIntentSink>/);
    expect(appVue).toMatch(/CanvasCommandProducerInjectionKey/);
    expect(appVue).toMatch(/ProcessHistoryCommandInjectionKey/);
    expect(appVue).not.toMatch(/provide\('commandStack'/);
    expect(appShellRuntime).not.toMatch(/commandStackForDeferredCommandProducers|commandStack,/);
  });

  it('keeps keyboard and toolbar undo-redo on the shared command-history port without raw dual paths', () => {
    expect(appShellRuntime).toMatch(/const commandHistory = session\.commandHistoryPort\(\)/);
    expect(appShellRuntime).toMatch(/commandHistory,/);
    expect(keyboard).toMatch(/CommandHistoryPort/);
    expect(keyboard).toMatch(/commandHistory\.canUndo\(\)/);
    expect(keyboard).not.toMatch(/commandStack\.canUndo|commandStack\.undo|commandStack\.canRedo|commandStack\.redo/);
    expect(toolbarVue).not.toMatch(/commandStack/);
  });

  it('keeps persistence concrete handles adapter-local instead of general app-shell ports', () => {
    expect(appShellPorts).not.toMatch(/RuntimeSessionPersistenceSnapshotHandle|RuntimeSessionPersistenceRestoreHandle/);
    expect(runtimeSession).not.toMatch(/export interface RuntimeSessionPersistenceSnapshotHandle|export interface RuntimeSessionPersistenceRestoreHandle/);
    expect(projectSessionPersistenceAdapter).not.toMatch(/from '\.\/RuntimeSession'/);
    expect(projectSessionPersistenceAdapter).toMatch(/from '\.\/ProjectSessionPersistenceTargets'/);
    expect(projectSessionPersistenceAdapter).toMatch(/RuntimeSessionPersistenceSnapshotHandle/);
    expect(projectSessionPersistenceAdapter).toMatch(/RuntimeSessionPersistenceRestoreHandle/);
    expect(projectSessionPersistenceAdapter).not.toMatch(/ as RuntimeSessionPersistence/);
    expect(projectSessionPersistenceTargets).toMatch(/@\/commands\/CommandStack/);
    expect(projectSessionPersistenceTargets).toMatch(/@\/domain\/world\/World/);
  });
});

import canvasToolController from '@/application/tools/CanvasToolController.ts?raw';
import canvasPointMovementUseCase from '@/application/canvas/CanvasPointMovementUseCase.ts?raw';
import canvasStyleUseCase from '@/application/canvas/CanvasStyleUseCase.ts?raw';
import constructionUseCases from '@/application/construction/ConstructionUseCases.ts?raw';
import quickToolUseCases from '@/application/construction/QuickToolUseCases.ts?raw';
import processHistoryController from '@/application/processHistory/ProcessHistoryController.ts?raw';
import processHistoryUseCases from '@/application/processHistory/ProcessHistoryUseCases.ts?raw';
import runtimeCommandProducer from '@/application/commandProduction/RuntimeCommandProducer.ts?raw';

describe('Cycle 024 command-producer runtime ports', () => {
  it('keeps raw command-stack ownership inside the runtime command producer', () => {
    const scopedProducerSources = [
      canvasToolController,
      canvasPointMovementUseCase,
      canvasStyleUseCase,
      constructionUseCases,
      quickToolUseCases,
      processHistoryController,
      processHistoryUseCases,
    ];

    for (const content of scopedProducerSources) {
      expect(content).not.toMatch(/@\/commands\/CommandStack/);
      expect(content).not.toMatch(/commandStack\.push/);
      expect(content).not.toMatch(/commandStack:/);
      expect(content).not.toMatch(/commandStack,/);
      expect(content).not.toMatch(/new Command\(/);
    }

    expect(runtimeCommandProducer).toMatch(/@\/commands\/CommandStack/);
    expect(runtimeCommandProducer).toMatch(/new Command\(/);
    expect(runtimeCommandProducer).toMatch(/commandStack\.push/);
  });

  it('wires canvas and process-history controllers with runtime-owned command producers', () => {
    expect(runtimeSession).toMatch(/new RuntimeCommandProducer\(this\.world, this\.commandStack\)/);
    expect(runtimeSession).toMatch(/commands: this\.commandProducer/);
    expect(canvasToolController).toMatch(/CanvasCommandProductionPort/);
    expect(processHistoryController).toMatch(/ProcessCommandExecutionPort/);
    expect(canvasToolController).not.toMatch(/CommandStack/);
    expect(processHistoryController).not.toMatch(/CommandStack/);
  });

  it('deletes stale quick-tool world and command-stack params', () => {
    expect(quickToolUseCases).not.toMatch(/world:/);
    expect(quickToolUseCases).not.toMatch(/commandStack:/);
  });
});

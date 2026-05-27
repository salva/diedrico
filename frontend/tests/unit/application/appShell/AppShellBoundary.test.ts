import { describe, expect, it } from 'vitest';
import appVue from '@/App.vue?raw';
import toolbarVue from '@/components/toolbars/Toolbar.vue?raw';
import startupDialogVue from '@/components/dialogs/StartupDialog.vue?raw';
import appShellRuntime from '@/application/appShell/AppShellRuntime.ts?raw';
import appShellProductionRuntime from '@/application/appShell/AppShellProductionRuntime.ts?raw';
import appShellPorts from '@/application/appShell/AppShellPorts.ts?raw';
import browserLastProjectRepository from '@/application/appShell/BrowserLastProjectRepository.ts?raw';
import activePlane from '@/application/appShell/ActivePlaneUseCases.ts?raw';
import autoSave from '@/application/appShell/AutoSaveUseCases.ts?raw';
import keyboard from '@/application/appShell/KeyboardShortcutRouter.ts?raw';
import projectSession from '@/application/appShell/ProjectSessionUseCases.ts?raw';
import selection from '@/application/appShell/SelectionUseCases.ts?raw';
import selectionDeletionService from '@/application/selectionDeletion/SelectionDeletionCommandService.ts?raw';
import runtimeSession from '@/application/appShell/RuntimeSession.ts?raw';
import projectSessionPersistenceAdapter from '@/application/appShell/ProjectSessionPersistenceAdapter.ts?raw';

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
    expect(appShellRuntime).toMatch(/new SelectionDeletionCommandService\(session\.worldForUseCases\(\), session\.commandStackForCommandServices\(\)\)/);
  });
});


describe('Cycle 022 runtime session persistence boundary', () => {
  it('keeps app-shell ports free of concrete runtime and ProjectService DTO imports', () => {
    expect(appShellPorts).not.toMatch(/@\/commands\/CommandStack|@\/domain\/world\/World|@\/services\/ProjectService/);
    expect(appShellPorts).not.toMatch(/SerializedProjectSession|schemaVersion|commands:|created:|modified:/);
    expect(appShellPorts).toMatch(/OpenedProjectSession/);
    expect(appShellPorts).toMatch(/PersistedProjectSession/);
    expect(appShellPorts).toMatch(/RuntimeSessionSnapshotHandle/);
    expect(appShellPorts).toMatch(/RuntimeSessionRestoreHandle/);
  });

  it('removes raw runtime-pair persistence calls from project-session and autosave use cases', () => {
    expect(projectSession).not.toMatch(/@\/commands\/CommandStack|@\/domain\/world\/World|@\/services\/ProjectService|initializeWorld/);
    expect(autoSave).not.toMatch(/@\/commands\/CommandStack|@\/domain\/world\/World/);
    expect(projectSession).not.toMatch(/\.name\)|projectData\.name|schemaVersion|commands/);
    expect(projectSession).toMatch(/openedSession\.projectName/);
    expect(projectSession).not.toMatch(/snapshotCurrentSession\(\{[\s\S]*commandStack[\s\S]*world/);
    expect(autoSave).not.toMatch(/snapshotCurrentSession\(\{[\s\S]*commandStack[\s\S]*world/);
  });

  it('keeps ProjectService awareness inside the app-shell persistence adapter', () => {
    const appShellSources = [appShellRuntime, appShellPorts, activePlane, autoSave, keyboard, projectSession, selection, runtimeSession];
    for (const content of appShellSources) {
      expect(content).not.toMatch(/@\/services\/ProjectService/);
    }
    expect(projectSessionPersistenceAdapter).toMatch(/@\/services\/ProjectService/);
  });
});

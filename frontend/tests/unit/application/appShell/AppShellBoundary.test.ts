import { describe, expect, it } from 'vitest';
import appVue from '@/App.vue?raw';
import toolbarVue from '@/components/toolbars/Toolbar.vue?raw';
import startupDialogVue from '@/components/dialogs/StartupDialog.vue?raw';
import appShellRuntime from '@/application/appShell/AppShellRuntime.ts?raw';
import appShellPorts from '@/application/appShell/AppShellPorts.ts?raw';
import activePlane from '@/application/appShell/ActivePlaneUseCases.ts?raw';
import autoSave from '@/application/appShell/AutoSaveUseCases.ts?raw';
import keyboard from '@/application/appShell/KeyboardShortcutRouter.ts?raw';
import projectSession from '@/application/appShell/ProjectSessionUseCases.ts?raw';
import selection from '@/application/appShell/SelectionUseCases.ts?raw';

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

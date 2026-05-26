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

const frontendSourceAndTests = import.meta.glob('/{src,tests}/**/*.{ts,tsx,vue,js,mjs,cjs}', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

function findOffenders(pattern: RegExp): string[] {
  return Object.entries(frontendSourceAndTests)
    .filter(([file]) => !file.endsWith('/tests/unit/application/appShell/AppShellBoundary.test.ts'))
    .flatMap(([file, content]) => pattern.test(content) ? [file] : []);
}

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

describe('Wave 010 project persistence boundary', () => {
  it('forbids frontend source and tests from importing backend implementation files', () => {
    expect(findOffenders(/from ['\"][^'\"]*backend\/src|import\([^)]*backend\/src|backend\/src\//)).toEqual([]);
  });

  it('keeps stale backend project route assumptions out of frontend source and tests', () => {
    expect(findOffenders(new RegExp([['localhost:3000', 'api', 'projects'].join('/'), '/api/' + 'projects', 'Project' + 'DTO', 'Project' + 'Metadata', 'Open' + 'Project' + 'Dialog'].join('|')))).toEqual([]);
  });
});

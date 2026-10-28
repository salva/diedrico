import { describe, expect, it, vi } from 'vitest';
import { KeyboardShortcutRouter } from '@/application/appShell/KeyboardShortcutRouter';

function event(key: string, options: Partial<KeyboardEvent> = {}) {
  return {
    key,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    altKey: false,
    target: document.body,
    preventDefault: vi.fn(),
    ...options,
  } as unknown as KeyboardEvent & { preventDefault: ReturnType<typeof vi.fn> };
}

function deps() {
  return {
    commandHistory: { canUndo: () => false, canRedo: () => false, undo: vi.fn(), redo: vi.fn() },
    toolStore: { setTool: vi.fn(), selectSubTool: vi.fn() },
    viewStore: { toggleProjectedElements: vi.fn() },
    projectSession: { newProject: vi.fn(), showStartupProjectChooser: vi.fn() },
    selection: { clearSelection: vi.fn(), deleteSelected: vi.fn(), selectAllInActivePlane: vi.fn() },
    activePlane: { cycleActivePlane: vi.fn() },
    fitToView: vi.fn(),
    startRename: vi.fn(),
  } as any;
}

describe('KeyboardShortcutRouter', () => {
  it('installs exactly one listener and removes it on dispose', () => {
    const d = deps();
    const router = new KeyboardShortcutRouter(d);
    const target = { addEventListener: vi.fn(), removeEventListener: vi.fn() };
    router.install(target as any);
    router.install(target as any);
    expect(target.addEventListener).toHaveBeenCalledTimes(1);
    router.dispose();
    router.dispose();
    expect(target.removeEventListener).toHaveBeenCalledTimes(1);
  });

  it('routes Escape, Delete, D, Ctrl+A and Tab through shell actions', () => {
    const d = deps();
    const router = new KeyboardShortcutRouter(d);
    router.handle(event('Escape'));
    expect(d.toolStore.setTool).toHaveBeenCalledWith('select');
    expect(d.selection.clearSelection).toHaveBeenCalled();
    router.handle(event('Delete'));
    expect(d.selection.deleteSelected).toHaveBeenCalled();
    router.handle(event('D'));
    expect(d.viewStore.toggleProjectedElements).toHaveBeenCalled();
    router.handle(event('a', { ctrlKey: true }));
    expect(d.selection.selectAllInActivePlane).toHaveBeenCalled();
    router.handle(event('Tab', { shiftKey: true }));
    expect(d.activePlane.cycleActivePlane).toHaveBeenCalledWith(-1);
  });

  it('does not consume text input Delete or tool letters', () => {
    const d = deps();
    const router = new KeyboardShortcutRouter(d);
    const input = document.createElement('input');
    router.handle(event('Delete', { target: input }));
    router.handle(event('Escape', { target: input }));
    router.handle(event('p', { target: input }));
    expect(d.selection.deleteSelected).not.toHaveBeenCalled();
    expect(d.toolStore.setTool).not.toHaveBeenCalled();
  });

  it('routes coordinate starter keys to the coordinate input before shortcuts', () => {
    const d = deps();
    const coordinateInput = {
      isAvailable: vi.fn(() => true),
      focusWithText: vi.fn(),
      isFocused: vi.fn(() => false),
      clear: vi.fn(),
      blur: vi.fn(),
      hasText: vi.fn(() => false),
    };
    const router = new KeyboardShortcutRouter({ ...d, coordinateInput });

    const e = event('-');
    router.handle(e);

    expect(coordinateInput.focusWithText).toHaveBeenCalledWith('-');
    expect(e.preventDefault).toHaveBeenCalled();
  });

  it('lets coordinate input own Escape while focused', () => {
    const d = deps();
    const coordinateInput = {
      isAvailable: vi.fn(() => true),
      focusWithText: vi.fn(),
      isFocused: vi.fn(() => true),
      clear: vi.fn(),
      blur: vi.fn(),
      hasText: vi.fn(() => true),
    };
    const router = new KeyboardShortcutRouter({ ...d, coordinateInput });

    const e = event('Escape');
    router.handle(e);

    expect(coordinateInput.clear).toHaveBeenCalled();
    expect(d.toolStore.setTool).not.toHaveBeenCalled();
    expect(e.preventDefault).toHaveBeenCalled();

    coordinateInput.hasText.mockReturnValue(false);
    router.handle(event('Escape'));
    expect(coordinateInput.blur).toHaveBeenCalled();
    expect(d.toolStore.setTool).not.toHaveBeenCalled();
  });
});

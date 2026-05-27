import { TOOL_FAMILIES } from '@/config/toolFamilies';
import type { ActivePlaneUseCases } from './ActivePlaneUseCases';
import type { ProjectSessionUseCases } from './ProjectSessionUseCases';
import type { SelectionUseCases } from './SelectionUseCases';
import type { CommandHistoryPort, ToolStorePort, ViewStorePort } from './AppShellPorts';

export interface KeyboardShortcutRouterTarget {
  addEventListener(type: 'keydown', listener: (event: KeyboardEvent) => void): void;
  removeEventListener(type: 'keydown', listener: (event: KeyboardEvent) => void): void;
}

export class KeyboardShortcutRouter {
  private target: KeyboardShortcutRouterTarget | null = null;
  private readonly boundHandler = (event: KeyboardEvent) => this.handle(event);

  constructor(private readonly deps: {
    commandHistory: CommandHistoryPort;
    toolStore: ToolStorePort;
    viewStore: ViewStorePort;
    projectSession: ProjectSessionUseCases;
    selection: SelectionUseCases;
    activePlane: ActivePlaneUseCases;
    fitToView: () => void;
    startRename: () => void;
  }) {}

  install(target: KeyboardShortcutRouterTarget): void {
    if (this.target === target) return;
    this.dispose();
    this.target = target;
    this.target.addEventListener('keydown', this.boundHandler);
  }

  dispose(): void {
    if (!this.target) return;
    this.target.removeEventListener('keydown', this.boundHandler);
    this.target = null;
  }

  handle(event: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey' | 'target' | 'preventDefault'>): void {
    const target = event.target as HTMLElement | null;
    const isTextInput = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;
    const isModifier = event.ctrlKey || event.metaKey;

    if (event.key === 'Escape') {
      event.preventDefault();
      this.deps.toolStore.setTool('select');
      this.deps.selection.clearSelection();
      return;
    }
    if ((event.key === 'Delete' || event.key === 'Backspace') && !isTextInput) {
      event.preventDefault();
      this.deps.selection.deleteSelected();
      return;
    }
    if (event.key === 'F2') {
      event.preventDefault();
      this.deps.startRename();
      return;
    }
    if (event.key === 'Tab' && !isTextInput) {
      event.preventDefault();
      this.deps.activePlane.cycle(event.shiftKey ? -1 : 1);
      return;
    }
    if (!isModifier && !event.shiftKey && !event.altKey && !isTextInput) {
      const key = event.key.toUpperCase();
      if (key === 'D') {
        event.preventDefault();
        this.deps.viewStore.toggleProjectedElements();
        return;
      }
      for (const family of TOOL_FAMILIES) {
        for (const tool of family.tools) {
          if (tool.shortcut === key) {
            event.preventDefault();
            this.deps.toolStore.selectSubTool(family.id, tool.id);
            return;
          }
        }
      }
      switch (event.key.toLowerCase()) {
        case 'p': this.deps.toolStore.setTool('point'); event.preventDefault(); return;
        case 'l': this.deps.toolStore.setTool('line'); event.preventDefault(); return;
        case 's': this.deps.toolStore.setTool('segment'); event.preventDefault(); return;
        case 'c': this.deps.toolStore.setTool('circle'); event.preventDefault(); return;
        case 'g': this.deps.toolStore.setTool('guide'); event.preventDefault(); return;
      }
    }
    if (!isModifier) return;
    const key = event.key.toLowerCase();
    if (key === 'n') { event.preventDefault(); void this.deps.projectSession.newProject(); return; }
    if (key === 'o') { event.preventDefault(); this.deps.projectSession.showStartupProjectChooser(); return; }
    if (key === 'a') { event.preventDefault(); this.deps.selection.selectAllInActivePlane(); return; }
    if (event.key === '0') { event.preventDefault(); this.deps.fitToView(); return; }
    if (key === 'z' && !event.shiftKey && this.deps.commandHistory.canUndo()) { event.preventDefault(); this.deps.commandHistory.undo(); return; }
    if ((key === 'y' || (key === 'z' && event.shiftKey)) && this.deps.commandHistory.canRedo()) {
      event.preventDefault();
      this.deps.commandHistory.redo();
    }
  }
}

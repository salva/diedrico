import { TOOL_FAMILIES } from '@/config/toolFamilies';
import type { ProjectSessionUseCases } from './ProjectSessionUseCases';
import type { SelectionUseCases } from './SelectionUseCases';
import type { CommandHistoryPort, ToolStorePort, ViewStorePort } from './AppShellPorts';
import type { ActivePlaneRuntimePort } from './RuntimeViewPorts';

export interface KeyboardShortcutRouterTarget {
  addEventListener(type: 'keydown', listener: (event: KeyboardEvent) => void): void;
  removeEventListener(type: 'keydown', listener: (event: KeyboardEvent) => void): void;
}

export interface CoordinateInputKeyboardPort {
  isAvailable(): boolean;
  focusWithText(text: string): void;
  isFocused(): boolean;
  clear(): void;
  blur(): void;
  hasText(): boolean;
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
    activePlane: Pick<ActivePlaneRuntimePort, 'cycleActivePlane'>;
    fitToView: () => void;
    startRename: () => void;
    coordinateInput?: CoordinateInputKeyboardPort;
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
    const isTextInput = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.tagName === 'SELECT' || target?.isContentEditable;
    const isModifier = event.ctrlKey || event.metaKey;
    const coordinateInput = this.deps.coordinateInput;

    if (coordinateInput?.isFocused()) {
      if (event.key === 'Escape') {
        if (coordinateInput.hasText()) {
          coordinateInput.clear();
        } else {
          coordinateInput.blur();
        }
        event.preventDefault();
      }
      return;
    }

    if (isTextInput) return;

    if (coordinateInput?.isAvailable() && isCoordinateStarterKey(event)) {
      coordinateInput.focusWithText(event.key);
      event.preventDefault();
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      this.deps.toolStore.setTool('select');
      this.deps.selection.clearSelection();
      return;
    }
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      this.deps.selection.deleteSelected();
      return;
    }
    if (event.key === 'F2') {
      event.preventDefault();
      this.deps.startRename();
      return;
    }
    if (event.key === 'Tab') {
      event.preventDefault();
      this.deps.activePlane.cycleActivePlane(event.shiftKey ? -1 : 1);
      return;
    }
    if (!isModifier && !event.shiftKey && !event.altKey) {
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

function isCoordinateStarterKey(event: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey'>): boolean {
  if (event.ctrlKey || event.metaKey || event.altKey) return false;
  return /^[0-9]$/.test(event.key) || event.key === '.' || event.key === ',' || event.key === '+' || event.key === '-';
}

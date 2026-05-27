import type { CommandHistoryPort } from '@/application/appShell/AppShellPorts';
import type { ToolbarHistoryResult, ToolbarHistoryState } from './ToolbarHistoryIntents';

export class ToolbarHistoryUseCases {
  constructor(private readonly commandHistory: CommandHistoryPort) {}

  getState(): ToolbarHistoryState {
    return {
      canUndo: this.commandHistory.canUndo(),
      canRedo: this.commandHistory.canRedo()
    };
  }

  subscribe(listener: () => void): () => void {
    return this.commandHistory.subscribe(listener);
  }

  undo(): ToolbarHistoryResult {
    if (!this.commandHistory.canUndo()) {
      return {
        success: false,
        state: this.getState(),
        error: 'Nothing to undo'
      };
    }

    try {
      this.commandHistory.undo();
      return {
        success: true,
        state: this.getState()
      };
    } catch (error) {
      return {
        success: false,
        state: this.getState(),
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  redo(): ToolbarHistoryResult {
    if (!this.commandHistory.canRedo()) {
      return {
        success: false,
        state: this.getState(),
        error: 'Nothing to redo'
      };
    }

    try {
      this.commandHistory.redo();
      return {
        success: true,
        state: this.getState()
      };
    } catch (error) {
      return {
        success: false,
        state: this.getState(),
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}

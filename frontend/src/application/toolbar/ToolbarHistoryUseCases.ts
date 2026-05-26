import type { CommandStack } from '@/commands/CommandStack';
import type { ToolbarHistoryResult, ToolbarHistoryState } from './ToolbarHistoryIntents';

export class ToolbarHistoryUseCases {
  constructor(private readonly commandStack: CommandStack) {}

  getState(): ToolbarHistoryState {
    return {
      canUndo: this.commandStack.canUndo(),
      canRedo: this.commandStack.canRedo()
    };
  }

  subscribe(listener: () => void): () => void {
    return this.commandStack.subscribe(listener);
  }

  undo(): ToolbarHistoryResult {
    if (!this.commandStack.canUndo()) {
      return {
        success: false,
        state: this.getState(),
        error: 'Nothing to undo'
      };
    }

    try {
      this.commandStack.undo();
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
    if (!this.commandStack.canRedo()) {
      return {
        success: false,
        state: this.getState(),
        error: 'Nothing to redo'
      };
    }

    try {
      this.commandStack.redo();
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

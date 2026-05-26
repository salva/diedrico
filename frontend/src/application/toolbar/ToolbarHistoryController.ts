import type { CommandStack } from '@/commands/CommandStack';
import type { ToolbarHistoryIntentSink, ToolbarHistoryResult, ToolbarHistoryState } from './ToolbarHistoryIntents';
import { ToolbarHistoryUseCases } from './ToolbarHistoryUseCases';

export interface ToolbarHistoryControllerDependencies {
  commandStack: CommandStack;
}

export interface ToolbarHistoryControllerProviderDependencies {
  commandStack: unknown;
}

export function createToolbarHistoryController(
  deps: ToolbarHistoryControllerProviderDependencies
): ToolbarHistoryController {
  if (!deps.commandStack) {
    throw new Error('CommandStack not provided');
  }

  return new ToolbarHistoryController({ commandStack: deps.commandStack as CommandStack });
}

export class ToolbarHistoryController implements ToolbarHistoryIntentSink {
  private readonly useCases: ToolbarHistoryUseCases;

  constructor(deps: ToolbarHistoryControllerDependencies) {
    this.useCases = new ToolbarHistoryUseCases(deps.commandStack);
  }

  getState(): ToolbarHistoryState {
    return this.useCases.getState();
  }

  subscribe(listener: () => void): () => void {
    return this.useCases.subscribe(listener);
  }

  undo(): ToolbarHistoryResult {
    return this.useCases.undo();
  }

  redo(): ToolbarHistoryResult {
    return this.useCases.redo();
  }
}

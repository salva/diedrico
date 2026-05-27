import type { CommandHistoryPort } from '@/application/appShell/AppShellPorts';
import type { ToolbarHistoryIntentSink, ToolbarHistoryResult, ToolbarHistoryState } from './ToolbarHistoryIntents';
import { ToolbarHistoryUseCases } from './ToolbarHistoryUseCases';

export interface ToolbarHistoryControllerDependencies {
  commandHistory: CommandHistoryPort;
}

export interface ToolbarHistoryControllerProviderDependencies {
  commandHistory: unknown;
}

export function createToolbarHistoryController(
  deps: ToolbarHistoryControllerProviderDependencies
): ToolbarHistoryController {
  if (!deps.commandHistory) {
    throw new Error('CommandHistoryPort not provided');
  }

  return new ToolbarHistoryController({ commandHistory: deps.commandHistory as CommandHistoryPort });
}

export class ToolbarHistoryController implements ToolbarHistoryIntentSink {
  private readonly useCases: ToolbarHistoryUseCases;

  constructor(deps: ToolbarHistoryControllerDependencies) {
    this.useCases = new ToolbarHistoryUseCases(deps.commandHistory);
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

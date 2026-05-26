import type { CommandStack } from '@/commands/CommandStack';
import type { World } from '@/domain/world/World';
import type {
  PopSubprocessRequest,
  ProcessHistoryIntentSink,
  ProcessHistoryResult,
  ProcessHistoryState,
  PushSubprocessRequest,
  RenameSubprocessRequest,
  ToggleEncapsulationRequest,
  ToggleOutputRequest
} from './ProcessHistoryIntents';
import { ProcessHistoryUseCases } from './ProcessHistoryUseCases';

export interface ProcessHistoryControllerDependencies {
  world: World;
  commandStack: CommandStack;
}

export interface ProcessHistoryControllerProviderDependencies {
  world: World;
  commandStack: unknown;
}

export function createProcessHistoryController(
  deps: ProcessHistoryControllerProviderDependencies
): ProcessHistoryController {
  if (!deps.commandStack) {
    throw new Error('CommandStack not provided');
  }

  return new ProcessHistoryController({
    world: deps.world,
    commandStack: deps.commandStack as CommandStack
  });
}

export class ProcessHistoryController implements ProcessHistoryIntentSink {
  private readonly useCases: ProcessHistoryUseCases;

  constructor(deps: ProcessHistoryControllerDependencies) {
    this.useCases = new ProcessHistoryUseCases(deps.world, deps.commandStack);
  }

  getState(): ProcessHistoryState {
    return this.useCases.getState();
  }

  pushSubprocess(request?: PushSubprocessRequest): ProcessHistoryResult {
    return this.useCases.pushSubprocess(request);
  }

  popSubprocess(request?: PopSubprocessRequest): ProcessHistoryResult {
    return this.useCases.popSubprocess(request);
  }

  toggleEncapsulation(request: ToggleEncapsulationRequest): ProcessHistoryResult {
    return this.useCases.toggleEncapsulation(request);
  }

  toggleOutput(request: ToggleOutputRequest): ProcessHistoryResult {
    return this.useCases.toggleOutput(request);
  }

  renameSubprocess(request: RenameSubprocessRequest): ProcessHistoryResult {
    return this.useCases.renameSubprocess(request);
  }
}

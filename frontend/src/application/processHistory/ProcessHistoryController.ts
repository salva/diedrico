import type { ProcessCommandExecutionPort } from '@/application/commandProduction/CommandProductionPorts';
import type { ProcessTree } from '@/domain/processTree/ProcessTree';
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
  processTree: ProcessTree;
  commands: ProcessCommandExecutionPort;
}

export class ProcessHistoryController implements ProcessHistoryIntentSink {
  private readonly useCases: ProcessHistoryUseCases;

  constructor(deps: ProcessHistoryControllerDependencies) {
    this.useCases = new ProcessHistoryUseCases(deps.processTree, deps.commands);
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

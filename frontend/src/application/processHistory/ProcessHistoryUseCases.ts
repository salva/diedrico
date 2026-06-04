import { PopSubprocessOp } from '@/commands/operations/processTree/PopSubprocessOp';
import { PushSubprocessOp } from '@/commands/operations/processTree/PushSubprocessOp';
import { RenameSubprocessOp } from '@/commands/operations/processTree/RenameSubprocessOp';
import { ToggleEncapsulationOp } from '@/commands/operations/processTree/ToggleEncapsulationOp';
import { ToggleOutputOp } from '@/commands/operations/processTree/ToggleOutputOp';
import type { IOperation } from '@/commands/operations/IOperation';
import type { ProcessCommandExecutionPort } from '@/application/commandProduction/CommandProductionPorts';
import type { ProcessTree } from '@/domain/processTree/ProcessTree';
import type {
  PopSubprocessRequest,
  ProcessHistoryResult,
  ProcessHistoryState,
  PushSubprocessRequest,
  RenameSubprocessRequest,
  ToggleEncapsulationRequest,
  ToggleOutputRequest
} from './ProcessHistoryIntents';

export class ProcessHistoryUseCases {
  constructor(
    private readonly processTree: ProcessTree,
    private readonly commands: ProcessCommandExecutionPort
  ) {}

  getState(): ProcessHistoryState {
    const processTree = this.processTree;
    return {
      canPop: processTree.getStackDepth() > 1,
      activeSubprocessId: processTree.getCurrentSubprocess().id,
      stackDepth: processTree.getStackDepth()
    };
  }

  pushSubprocess(request: PushSubprocessRequest = {}): ProcessHistoryResult {
    const name = request.name ?? `Subprocess ${Date.now()}`;
    return this.executeProcessCommand('Push subprocess', new PushSubprocessOp(name));
  }

  popSubprocess(_request: PopSubprocessRequest = {}): ProcessHistoryResult {
    if (!this.getState().canPop) {
      return {
        success: false,
        state: this.getState(),
        error: 'Cannot pop root subprocess'
      };
    }
    return this.executeProcessCommand('Pop subprocess', new PopSubprocessOp());
  }

  toggleEncapsulation(request: ToggleEncapsulationRequest): ProcessHistoryResult {
    return this.executeProcessCommand(
      'Toggle subprocess encapsulation',
      new ToggleEncapsulationOp(request.nodeId)
    );
  }

  toggleOutput(request: ToggleOutputRequest): ProcessHistoryResult {
    return this.executeProcessCommand(
      'Toggle output status',
      new ToggleOutputOp(request.nodeId)
    );
  }

  renameSubprocess(request: RenameSubprocessRequest): ProcessHistoryResult {
    return this.executeProcessCommand(
      'Rename subprocess',
      new RenameSubprocessOp(request.nodeId, request.newName)
    );
  }

  private executeProcessCommand(description: string, operation: IOperation): ProcessHistoryResult {
    return this.commands.executeProcessCommand(description, operation, () => this.getState());
  }
}

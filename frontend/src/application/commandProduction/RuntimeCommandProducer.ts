import { Command } from '@/commands/Command';
import type { CommandStack } from '@/commands/CommandStack';
import type { IOperation } from '@/commands/operations/IOperation';
import type { OperationContext } from '@/commands/operations/OperationContext';
import type { World } from '@/domain/world/World';
import type { ChangeNotifier } from '@/application/appShell/RuntimeChangePublisher';
import type { ToolCommandResult } from '@/tools/ToolCommandIntents';
import type { ProcessHistoryResult, ProcessHistoryState } from '@/application/processHistory/ProcessHistoryIntents';
import type {
  CanvasCommandProductionPort,
  CommandOperationBuilder,
  PreviewCommandSession,
  ProcessCommandExecutionPort,
  ToolCommandExecutionPort
} from './CommandProductionPorts';

const noopChangeNotifier: ChangeNotifier = { notifyChange: () => {} };

export class RuntimeCommandProducer implements CanvasCommandProductionPort, ProcessCommandExecutionPort, ToolCommandExecutionPort {
  private readonly operationContext: OperationContext;

  constructor(
    world: World,
    private readonly commandStack: CommandStack,
    private readonly notifier: ChangeNotifier = noopChangeNotifier
  ) {
    this.operationContext = { world };
  }

  executeToolCommand(description: string, build: (command: CommandOperationBuilder) => void): ToolCommandResult {
    const command = new Command(description, this.operationContext, this.notifier);

    try {
      build(command);
      command.commit();
      this.commandStack.push(command);
      return { success: true };
    } catch (error) {
      command.rollback();
      return { success: false, message: error instanceof Error ? error.message : String(error) };
    }
  }

  startPreviewCommand(description: string): PreviewCommandSession {
    const command = new Command(description, this.operationContext, this.notifier);
    let hasPreview = false;

    return {
      preview: (build: (command: CommandOperationBuilder) => void): ToolCommandResult => {
        try {
          command.rollback();
          build(command);
          hasPreview = true;
          return { success: true };
        } catch (error) {
          command.rollback();
          return { success: false, message: error instanceof Error ? error.message : String(error) };
        }
      },
      commit: (): ToolCommandResult => {
        if (!hasPreview) {
          command.rollback();
          return { success: true };
        }
        try {
          command.commit();
          this.commandStack.push(command);
          return { success: true };
        } catch (error) {
          command.rollback();
          return { success: false, message: error instanceof Error ? error.message : String(error) };
        }
      },
      cancel: (): void => {
        command.rollback();
      }
    };
  }

  executeProcessCommand(
    description: string,
    operation: IOperation,
    getState: () => ProcessHistoryState
  ): ProcessHistoryResult {
    const command = new Command(description, this.operationContext, this.notifier);

    try {
      command.addAndExecute(operation);
      command.commit();
      this.commandStack.push(command);
      return {
        success: true,
        state: getState()
      };
    } catch (error) {
      command.rollback();
      return {
        success: false,
        state: getState(),
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}

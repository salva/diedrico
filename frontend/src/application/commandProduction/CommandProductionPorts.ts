import type { Command } from '@/commands/Command';
import type { IOperation } from '@/commands/operations/IOperation';
import type { ToolCommandResult } from '@/application/tools/ToolCommandIntents';
import type { ProcessHistoryResult, ProcessHistoryState } from '@/application/processHistory/ProcessHistoryIntents';

export type CommandOperationBuilder = Command;

export interface ToolCommandExecutionPort {
  executeToolCommand(description: string, build: (command: CommandOperationBuilder) => void): ToolCommandResult;
}

export interface PreviewCommandSession {
  preview(build: (command: CommandOperationBuilder) => void): ToolCommandResult;
  commit(): ToolCommandResult;
  cancel(): void;
}

export interface PreviewCommandSessionFactory {
  startPreviewCommand(description: string): PreviewCommandSession;
}

export interface ProcessCommandExecutionPort {
  executeProcessCommand(
    description: string,
    operation: IOperation,
    getState: () => ProcessHistoryState
  ): ProcessHistoryResult;
}

export type CanvasCommandProductionPort = ToolCommandExecutionPort & PreviewCommandSessionFactory;

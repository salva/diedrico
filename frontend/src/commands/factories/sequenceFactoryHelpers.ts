import type { Command } from '@/commands/Command';
import type { OperationResult } from '@/commands/operations/IOperation';
import { AddProcessTreeActionOp } from '@/commands/operations/processTree/AddProcessTreeActionOp';
import type { Action } from '@/domain/processTree/Action';

export function requireStringOutput(
  result: OperationResult,
  outputName: string,
  fallbackError?: string
): string {
  const value = result.outputs[outputName];
  if (typeof value !== 'string') {
    throw new Error(result.error || fallbackError || `${outputName} missing from operation output`);
  }
  return value;
}

export function recordProcessTreeAction(cmd: Command, action: Action, groupId: string): void {
  cmd.addAndExecute(new AddProcessTreeActionOp(action, groupId));
}

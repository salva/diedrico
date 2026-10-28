import { describe, it, expect } from 'vitest';
import { Command } from '@/commands/Command';
import { CommandStack } from '@/commands/CommandStack';
import type { IOperation } from '@/commands/operations/IOperation';
import { createTestRuntimeContext } from '../../helpers/worldHelpers';

describe('history failure ownership', () => {
  it.each(['undo', 'redo'] as const)('retains a failed %s command rather than silently dropping history', (direction) => {
    const { operationContext } = createTestRuntimeContext();
    let fail = false;
    const operation: IOperation = {
      type: 'FailureProbe', outputs: {},
      apply: () => {
        if (fail && direction === 'redo') throw new Error('probe');
        return { success: true, outputs: {} };
      },
      undo: () => { if (fail && direction === 'undo') throw new Error('probe'); },
      serialize: () => ({ opType: 'FailureProbe' }),
    };
    const command = new Command('probe', operationContext);
    command.addAndExecute(operation);
    command.commit();
    const stack = new CommandStack();
    stack.push(command);
    if (direction === 'redo') stack.undo();
    fail = true;
    expect(() => stack[direction]()).toThrow('probe');
    expect(direction === 'undo' ? stack.getUndoCount() : stack.getRedoCount()).toBe(1);
  });
});

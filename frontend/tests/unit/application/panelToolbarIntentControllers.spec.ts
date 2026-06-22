import { describe, expect, it } from 'vitest';
import actionsPanelSource from '@/components/panels/ActionsPanel.vue?raw';
import toolbarSource from '@/components/toolbars/Toolbar.vue?raw';
import { Command } from '@/commands/Command';
import { CommandStack } from '@/commands/CommandStack';
import { PushSubprocessOp } from '@/commands/operations/processTree/PushSubprocessOp';
import { ProcessHistoryUseCases } from '@/application/processHistory/ProcessHistoryUseCases';
import { RuntimeCommandProducer } from '@/application/commandProduction/RuntimeCommandProducer';
import { ToolbarHistoryUseCases } from '@/application/toolbar/ToolbarHistoryUseCases';
import { createTestWorld } from '../../helpers/worldHelpers';

describe('Wave 006b panel/toolbar intent controllers', () => {
  it('keeps ActionsPanel and Toolbar free of command construction and stack execution internals', () => {
    const prohibitedActionsPanelPatterns = [
      "from '@/commands/Command'",
      "from '@/commands/operations/",
      'new Command(',
      '.addAndExecute(new ',
      'commandStack.push(cmd)',
      'CommandStack'
    ];
    const prohibitedToolbarPatterns = [
      "from '@/commands/CommandStack'",
      "from '@/commands/Command'",
      "from '@/commands/operations/",
      "from 'three'",
      'new Command(',
      '.addAndExecute(new ',
      'commandStack.undo()',
      'commandStack.redo()',
      'addProjectionPlaneSetup',
      'Alt+E'
    ];

    expect(actionsPanelSource).toContain('ProcessHistoryCommandInjectionKey');
    expect(actionsPanelSource).not.toContain("inject<unknown>('commandStack')");
    expect(toolbarSource).toContain('createToolbarHistoryController');
    expect(toolbarSource).toContain('CommandHistoryInjectionKey');

    for (const pattern of prohibitedActionsPanelPatterns) {
      expect(actionsPanelSource).not.toContain(pattern);
    }
    for (const pattern of prohibitedToolbarPatterns) {
      expect(toolbarSource).not.toContain(pattern);
    }
  });

  it('executes process-history mutations through use cases with undo/redo stack effects', () => {
    const { world, visibilityModel, commandStack, operationContext } = createTestWorld();
    const processTree = operationContext.processTree;
    const useCases = new ProcessHistoryUseCases(processTree, new RuntimeCommandProducer(operationContext, commandStack));

    const initialUndoCount = commandStack.getUndoCount();
    const push = useCases.pushSubprocess({ name: 'Nested work' });
    expect(push.success).toBe(true);
    expect(push.state.canPop).toBe(true);
    expect(processTree.getCurrentSubprocess().name).toBe('Nested work');
    expect(commandStack.getUndoCount()).toBe(initialUndoCount + 1);

    const subprocessId = processTree.getCurrentSubprocess().id;
    expect(useCases.renameSubprocess({ nodeId: subprocessId, newName: 'Renamed work' }).success).toBe(true);
    expect(processTree.findSubprocessById(subprocessId)?.name).toBe('Renamed work');

    expect(useCases.toggleEncapsulation({ nodeId: subprocessId }).success).toBe(true);
    expect(visibilityModel.get(subprocessId, 'subprocess').showIntermediates).toBe(false);

    expect(useCases.toggleOutput({ nodeId: subprocessId }).success).toBe(true);
    expect(visibilityModel.get(subprocessId, 'subprocess').isOutput).toBe(false);

    expect(useCases.popSubprocess().success).toBe(true);
    expect(useCases.getState().canPop).toBe(false);
    expect(commandStack.getUndoCount()).toBe(initialUndoCount + 5);

    commandStack.undo();
    expect(useCases.getState().canPop).toBe(true);
    commandStack.redo();
    expect(useCases.getState().canPop).toBe(false);
  });

  it('does not pollute the command stack when process-history operations fail', () => {
    const { world, visibilityModel, commandStack, operationContext } = createTestWorld();
    const useCases = new ProcessHistoryUseCases(operationContext.processTree, new RuntimeCommandProducer(operationContext, commandStack));

    const initialUndoCount = commandStack.getUndoCount();
    const popRoot = useCases.popSubprocess();
    expect(popRoot.success).toBe(false);
    expect(commandStack.getUndoCount()).toBe(initialUndoCount);

    expect(() => useCases.renameSubprocess({ nodeId: 'missing-subprocess', newName: 'Nope' })).toThrow('Subprocess not found: missing-subprocess');
    expect(commandStack.getUndoCount()).toBe(initialUndoCount);
  });

  it('routes toolbar history state and undo/redo execution through use cases', () => {
    const { world, visibilityModel, commandStack, operationContext } = createTestWorld();
    const processHistory = new ProcessHistoryUseCases(operationContext.processTree, new RuntimeCommandProducer(operationContext, commandStack));
    const toolbarHistory = new ToolbarHistoryUseCases(commandStack);
    let notifications = 0;
    toolbarHistory.subscribe(() => notifications++);

    commandStack.clear();
    expect(toolbarHistory.getState()).toEqual({ canUndo: false, canRedo: false });
    expect(toolbarHistory.undo()).toMatchObject({ success: false, error: 'Nothing to undo' });

    expect(processHistory.pushSubprocess({ name: 'Undoable subprocess' }).success).toBe(true);
    expect(toolbarHistory.getState()).toEqual({ canUndo: true, canRedo: false });

    const undo = toolbarHistory.undo();
    expect(undo.success).toBe(true);
    expect(toolbarHistory.getState()).toEqual({ canUndo: false, canRedo: true });

    const redo = toolbarHistory.redo();
    expect(redo.success).toBe(true);
    expect(toolbarHistory.getState()).toEqual({ canUndo: true, canRedo: false });
    expect(notifications).toBeGreaterThanOrEqual(3);
  });

  it('recovers rollback state if command assembly fails after an earlier process-history operation executed', () => {
    const { world, visibilityModel, operationContext } = createTestWorld();
    const processTree = operationContext.processTree;
    const commandStack = new CommandStack();
    const command = new Command('partial process-history command', operationContext);

    command.addAndExecute(new PushSubprocessOp('Partial child'));
    expect(processTree.getStackDepth()).toBe(2);

    try {
      command.addAndExecute(new PushSubprocessOp('Invalid after rollback'));
      command.rollback();
    } catch {
      command.rollback();
    }

    expect(processTree.getStackDepth()).toBe(1);
    expect(commandStack.getUndoCount()).toBe(0);
  });
});

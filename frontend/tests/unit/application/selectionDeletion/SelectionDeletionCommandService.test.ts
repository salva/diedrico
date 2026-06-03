import { describe, expect, it, vi } from 'vitest';
import { Vector3 } from 'three';
import { SelectionDeletionCommandService } from '@/application/selectionDeletion/SelectionDeletionCommandService';
import { Command } from '@/commands/Command';
import { CommandStack } from '@/commands/CommandStack';
import type { IOperation, OperationResult } from '@/commands/operations/IOperation';
import { AddFreePoint2DOp } from '@/commands/operations/world/AddFreePointOp';
import { AddLine2DByTwoPointsOp } from '@/commands/operations/world/AddLineOp';
import type { World } from '@/domain/world/World';
import type { Action } from '@/domain/processTree/Action';
import type { ActionGroup } from '@/domain/processTree/ProcessTree';
import { createPointAction } from '@/domain/processTree/actions/CreatePointAction';
import { createLineAction } from '@/domain/processTree/actions/CreateLineAction';
import { createTestWorld } from '../../../helpers/worldHelpers';

class MockOperation implements IOperation {
  type = 'MockOp';
  parameters: Record<string, unknown> = {};
  outputs: Record<string, unknown> = {};

  apply(_world: World): OperationResult {
    return { success: true, outputs: {} };
  }

  undo(_world: World): void {}
}

function committedCommand(world: World, description = 'Existing command'): Command {
  const command = new Command(description, world);
  command.addAndExecute(new MockOperation());
  command.commit();
  return command;
}

function addExplicitProcessAction(world: World, action: Action): void {
  const processTree = world.getProcessTree();
  const actionGroup: ActionGroup = {
    id: `test-group-${action.elementId}`,
    type: 'actionGroup',
    children: [],
    isAuxiliary: false,
    isOutput: action.isOutput ?? true,
    created: new Date(),
  };
  processTree.addActionGroup(actionGroup);
  processTree.addActionToGroup(action, actionGroup.id);
}

function createDependentLineFixture() {
  const { world, commandStack } = createTestWorld();
  const planeId = world.getProjectionPlaneByLabel('P_H').id!;
  const setupCmd = new Command('Setup line', world);
  const p1 = setupCmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(100, 200, 1))).outputs.pointId!;
  const p2 = setupCmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(300, 400, 1))).outputs.pointId!;
  const lineId = setupCmd.addAndExecute(new AddLine2DByTwoPointsOp(planeId, p1, p2)).outputs.lineId!;
  addExplicitProcessAction(world, createPointAction(p1));
  addExplicitProcessAction(world, createPointAction(p2));
  addExplicitProcessAction(world, createLineAction(lineId));
  world.getDependencyRegistrar().registerNode(lineId, [p1, p2]);
  setupCmd.commit();
  commandStack.push(setupCmd);
  return { world, commandStack, planeId, selectedPointId: p1, retainedPointId: p2, lineId };
}

describe('SelectionDeletionCommandService', () => {
  it('executes cascade deletion through a committed command and preserves undo/redo behavior', () => {
    const { world, commandStack, planeId, selectedPointId, retainedPointId, lineId } = createDependentLineFixture();
    const notifications: Array<{ undo: number; redo: number }> = [];
    commandStack.subscribe(() => notifications.push({ undo: commandStack.getUndoCount(), redo: commandStack.getRedoCount() }));

    const initialUndoCount = commandStack.getUndoCount();
    const service = new SelectionDeletionCommandService(world, commandStack);
    service.execute([selectedPointId]);

    const plane = world.getProjectionPlaneById(planeId)!;
    expect(plane.getPoint(selectedPointId)).toBeUndefined();
    expect(plane.getLine(lineId)).toBeUndefined();
    expect(plane.getPoint(retainedPointId)).toBeDefined();
    expect(commandStack.getUndoCount()).toBe(initialUndoCount + 1);
    expect(commandStack.getRedoCount()).toBe(0);
    expect(notifications).toEqual([{ undo: initialUndoCount + 1, redo: 0 }]);
    expect(commandStack.getCommands().at(-1)?.description).toBe('Delete elements');

    commandStack.undo();
    expect(commandStack.getUndoCount()).toBe(initialUndoCount);
    expect(commandStack.getRedoCount()).toBe(1);
    expect(plane.getPoint(selectedPointId)).toBeDefined();
    expect(plane.getLine(lineId)).toBeDefined();

    commandStack.redo();
    expect(commandStack.getUndoCount()).toBe(initialUndoCount + 1);
    expect(commandStack.getRedoCount()).toBe(0);
    expect(plane.getPoint(selectedPointId)).toBeUndefined();
    expect(plane.getLine(lineId)).toBeUndefined();
  });

  it('does nothing for empty selection and does not create, commit, push, or notify', () => {
    const { world, commandStack } = createTestWorld();
    const initialUndoCount = commandStack.getUndoCount();
    const listener = vi.fn();
    commandStack.subscribe(listener);
    const createCommand = vi.fn((description: string, target: World) => new Command(description, target));
    const createCascadeDeletion = vi.fn();
    const push = vi.spyOn(commandStack, 'push');

    new SelectionDeletionCommandService(world, commandStack, { createCommand, createCascadeDeletion }).execute([]);

    expect(createCommand).not.toHaveBeenCalled();
    expect(createCascadeDeletion).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
    expect(commandStack.getUndoCount()).toBe(initialUndoCount);
    expect(commandStack.getRedoCount()).toBe(0);
  });

  it('does not clear redo until successful command creation, cascade build, commit, and push', () => {
    const { world, commandStack } = createTestWorld();
    commandStack.push(committedCommand(world, 'first'));
    commandStack.undo();
    expect(commandStack.getRedoCount()).toBe(1);

    const order: string[] = [];
    const command = new Command('Delete elements', world);
    const commit = vi.spyOn(command, 'commit').mockImplementation(() => { order.push('commit'); });
    const push = vi.spyOn(commandStack, 'push').mockImplementation(() => { order.push('push'); });
    const service = new SelectionDeletionCommandService(world, commandStack, {
      createCommand: () => { order.push('create'); return command; },
      createCascadeDeletion: () => {
        order.push('cascade');
        command.addAndExecute(new MockOperation());
      },
    });

    service.execute(['point-1']);

    expect(order).toEqual(['create', 'cascade', 'commit', 'push']);
    expect(commit).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith(command);
  });

  it('propagates command creation failures without pushing or changing redo state', () => {
    const { world, commandStack } = createTestWorld();
    commandStack.push(committedCommand(world));
    commandStack.undo();
    const undoAfterFailureBaseline = commandStack.getUndoCount();
    const push = vi.spyOn(commandStack, 'push');
    const service = new SelectionDeletionCommandService(world, commandStack, {
      createCommand: () => { throw new Error('create failed'); },
    });

    expect(() => service.execute(['point-1'])).toThrow('create failed');
    expect(push).not.toHaveBeenCalled();
    expect(commandStack.getUndoCount()).toBe(undoAfterFailureBaseline);
    expect(commandStack.getRedoCount()).toBe(1);
  });

  it('propagates cascade-build failures before commit or push', () => {
    const { world, commandStack } = createTestWorld();
    const command = new Command('Delete elements', world);
    const commit = vi.spyOn(command, 'commit');
    const push = vi.spyOn(commandStack, 'push');
    const service = new SelectionDeletionCommandService(world, commandStack, {
      createCommand: () => command,
      createCascadeDeletion: () => { throw new Error('cascade failed'); },
    });

    expect(() => service.execute(['point-1'])).toThrow('cascade failed');
    expect(commit).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it('propagates commit failures before push', () => {
    const { world, commandStack } = createTestWorld();
    const command = new Command('Delete elements', world);
    command.addAndExecute(new MockOperation());
    vi.spyOn(command, 'commit').mockImplementation(() => { throw new Error('commit failed'); });
    const push = vi.spyOn(commandStack, 'push');
    const service = new SelectionDeletionCommandService(world, commandStack, {
      createCommand: () => command,
      createCascadeDeletion: vi.fn(),
    });

    expect(() => service.execute(['point-1'])).toThrow('commit failed');
    expect(push).not.toHaveBeenCalled();
  });

  it('propagates push failures after commit without swallowing stack contract errors', () => {
    const { world, commandStack } = createTestWorld();
    const command = new Command('Delete elements', world);
    command.addAndExecute(new MockOperation());
    const push = vi.spyOn(commandStack, 'push').mockImplementation(() => { throw new Error('push failed'); });
    const service = new SelectionDeletionCommandService(world, commandStack, {
      createCommand: () => command,
      createCascadeDeletion: vi.fn(),
    });

    expect(() => service.execute(['point-1'])).toThrow('push failed');
    expect(command.status).toBe('committed');
    expect(push).toHaveBeenCalledWith(command);
  });

  it('preserves committed-only and non-undoable CommandStack behavior', () => {
    const { world, commandStack } = createTestWorld();
    const initialUndoCount = commandStack.getUndoCount();
    const nonUndoable = new Command('Delete elements', world);
    nonUndoable.addAndExecute(new MockOperation());
    vi.spyOn(nonUndoable, 'canUndo').mockReturnValue(false);
    const service = new SelectionDeletionCommandService(world, commandStack, {
      createCommand: () => nonUndoable,
      createCascadeDeletion: vi.fn(),
    });

    service.execute(['point-1']);
    expect(commandStack.getUndoCount()).toBe(initialUndoCount);
    expect(commandStack.getRedoCount()).toBe(0);

    const uncommitted = new Command('Delete elements', world);
    uncommitted.addAndExecute(new MockOperation());
    vi.spyOn(uncommitted, 'commit').mockImplementation(() => undefined);
    const uncommittedService = new SelectionDeletionCommandService(world, commandStack, {
      createCommand: () => uncommitted,
      createCascadeDeletion: vi.fn(),
    });

    expect(() => uncommittedService.execute(['point-1'])).toThrow('Can only push committed commands to stack');
  });

  it('clears redo history only through the same CommandStack push path after new delete', () => {
    const { world, commandStack, selectedPointId } = createDependentLineFixture();
    const baselineUndoCount = commandStack.getUndoCount();
    commandStack.push(committedCommand(world, 'redo candidate'));
    commandStack.undo();
    expect(commandStack.getUndoCount()).toBe(baselineUndoCount);
    expect(commandStack.getRedoCount()).toBe(1);

    new SelectionDeletionCommandService(world, commandStack).execute([selectedPointId]);

    expect(commandStack.getUndoCount()).toBe(baselineUndoCount + 1);
    expect(commandStack.getRedoCount()).toBe(0);
  });
});

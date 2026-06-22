import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { RuntimeCommandProducer } from '@/application/commandProduction/RuntimeCommandProducer';
import { FreePoint2D } from '@/domain/world/Point';
import { CommandStack } from '@/commands/CommandStack';
import { UpdateFreePoint2DPositionOp } from '@/commands/operations/world/UpdateFreePoint2DPositionOp';
import type { IOperation } from '@/commands/operations/IOperation';
import { initializeWorld } from '@/application/world/initializeWorld';
import { World } from '@/domain/world/World';
import { VisibilityModel } from '@/application/processTree/VisibilityModel';
import { createTestRuntimeContext } from '../../../helpers/worldHelpers';

function initializedWorld() {
  const world = new World();
  const visibilityModel = new VisibilityModel();
  const stack = new CommandStack();
  const operationContext = createTestRuntimeContext({ initialized: false, world, visibilityModel, commandStack: stack }).operationContext;
  initializeWorld(world, stack, operationContext);
  return { world, visibilityModel, stack, operationContext, commands: new RuntimeCommandProducer(operationContext, stack) };
}

describe('RuntimeCommandProducer', () => {
  it('owns command creation, commit, push, and undo for tool commands', () => {
    const { world, stack, commands } = initializedWorld();
    const planeId = world.getAllProjectionPlanes()[0].id;

    const result = commands.executeToolCommand('Create point', (command) => {
      command.addAndExecute({
        type: 'AddTestPoint',
        parameters: {},
        outputs: {},
        apply: targetRuntimeState => {
          targetRuntimeState.world.getProjectionPlaneById(planeId)!.addPoint(new FreePoint2D(`${planeId}/runtime-created-point`, new Vector3(10, 20, 0), planeId));
          return { success: true, outputs: {} };
        },
        undo: targetRuntimeState => targetRuntimeState.world.getProjectionPlaneById(planeId)!.removePoint(`${planeId}/runtime-created-point`),
        serialize: () => ({ opType: 'AddTestPoint' })
      });
    });

    expect(result.success).toBe(true);
    expect(stack.canUndo()).toBe(true);
    expect(world.getProjectionPlaneById(planeId)?.getAllPoints().some(point => point.position.x === 10 && point.position.y === 20)).toBe(true);

    stack.undo();
    expect(world.getProjectionPlaneById(planeId)?.getAllPoints().some(point => point.position.x === 10 && point.position.y === 20)).toBe(false);
  });

  it('rolls back failed tool commands without pushing history', () => {
    const { world, stack, commands } = initializedWorld();
    stack.clear();
    const existingPointCount = world.getAllProjectionPlanes().reduce((count, plane) => count + plane.getAllPoints().length, 0);

    expect(() => commands.executeToolCommand('Create point on missing plane', (command) => {
      command.addAndExecute({
        type: 'FailAfterMutation',
        parameters: {},
        outputs: {},
        apply: () => ({ success: false, outputs: {}, error: 'expected failure' }),
        undo: () => undefined,
        serialize: () => ({ opType: 'FailAfterMutation' })
      });
    })).toThrow('expected failure');

    const pointCountAfterFailure = world.getAllProjectionPlanes().reduce((count, plane) => count + plane.getAllPoints().length, 0);
    expect(pointCountAfterFailure).toBe(existingPointCount);
    expect(stack.canUndo()).toBe(false);
  });

  it('propagates tool command operation errors after rollback', () => {
    const { commands } = initializedWorld();
    let undoCalls = 0;

    expect(() => commands.executeToolCommand('Fail after operation started', (command) => {
      command.addAndExecute({
        type: 'AppliedThenRolledBack',
        parameters: {},
        outputs: {},
        apply: () => ({ success: true, outputs: {} }),
        undo: () => { undoCalls += 1; },
        serialize: () => ({ opType: 'AppliedThenRolledBack' })
      });
      throw new Error('internal build failure');
    })).toThrow('internal build failure');

    expect(undoCalls).toBe(1);
  });

  it('throws AggregateError when tool command rollback fails', () => {
    const { commands } = initializedWorld();

    expect(() => commands.executeToolCommand('Rollback failure', (command) => {
      command.addAndExecute({
        type: 'UndoThrows',
        parameters: {},
        outputs: {},
        apply: () => ({ success: true, outputs: {} }),
        undo: () => { throw new Error('rollback failed'); },
        serialize: () => ({ opType: 'UndoThrows' })
      });
      throw new Error('operation failed');
    })).toThrow(AggregateError);
  });

  it('does not double rollback after addAndExecute has already rolled back', () => {
    const { commands } = initializedWorld();
    let undoCalls = 0;

    expect(() => commands.executeToolCommand('No double rollback', (command) => {
      command.addAndExecute({
        type: 'UndoOnce',
        parameters: {},
        outputs: {},
        apply: () => ({ success: true, outputs: {} }),
        undo: () => { undoCalls += 1; },
        serialize: () => ({ opType: 'UndoOnce' })
      });
      command.addAndExecute({
        type: 'FailingOp',
        parameters: {},
        outputs: {},
        apply: () => ({ success: false, outputs: {}, error: 'failed op' }),
        undo: () => undefined,
        serialize: () => ({ opType: 'FailingOp' })
      });
    })).toThrow('failed op');

    expect(undoCalls).toBe(1);
  });

  it('preserves preview, commit, cancel, and undo semantics for movement sessions', () => {
    const { world, stack, commands } = initializedWorld();
    const planeId = world.getAllProjectionPlanes()[0].id;
    const point = new FreePoint2D(`${planeId}/move-test-point`, new Vector3(0, 0, 0), planeId);
    world.getProjectionPlaneById(planeId)!.addPoint(point);
    stack.clear();

    const session = commands.startPreviewCommand('Move point');
    expect(session.preview((command) => command.addAndExecute(new UpdateFreePoint2DPositionOp(planeId, point.id, new Vector3(3, 4, 0)))).success).toBe(true);
    expect(world.getProjectionPlaneById(planeId)!.getPoint(point.id)!.position.x).toBe(3);
    expect(session.preview((command) => command.addAndExecute(new UpdateFreePoint2DPositionOp(planeId, point.id, new Vector3(5, 6, 0)))).success).toBe(true);
    expect(world.getProjectionPlaneById(planeId)!.getPoint(point.id)!.position.x).toBe(5);
    expect(session.commit().success).toBe(true);

    stack.undo();
    expect(world.getProjectionPlaneById(planeId)!.getPoint(point.id)!.position.x).toBe(0);

    const cancelSession = commands.startPreviewCommand('Move point then cancel');
    expect(cancelSession.preview((command) => command.addAndExecute(new UpdateFreePoint2DPositionOp(planeId, point.id, new Vector3(7, 8, 0)))).success).toBe(true);
    cancelSession.cancel();
    expect(world.getProjectionPlaneById(planeId)!.getPoint(point.id)!.position.x).toBe(0);
  });

  it('supports repeated preview rollback, rebuild, later failure, and cancel', () => {
    const { world, commands } = initializedWorld();
    const planeId = world.getAllProjectionPlanes()[0].id;
    const point = new FreePoint2D(`${planeId}/preview-reuse-point`, new Vector3(0, 0, 0), planeId);
    world.getProjectionPlaneById(planeId)!.addPoint(point);
    const session = commands.startPreviewCommand('Preview reuse');

    expect(session.preview(command => command.addAndExecute(new UpdateFreePoint2DPositionOp(planeId, point.id, new Vector3(1, 0, 0)))).success).toBe(true);
    expect(world.getProjectionPlaneById(planeId)!.getPoint(point.id)!.position.x).toBe(1);
    expect(session.preview(command => command.addAndExecute(new UpdateFreePoint2DPositionOp(planeId, point.id, new Vector3(2, 0, 0)))).success).toBe(true);
    expect(world.getProjectionPlaneById(planeId)!.getPoint(point.id)!.position.x).toBe(2);

    expect(() => session.preview(command => {
      command.addAndExecute(new UpdateFreePoint2DPositionOp(planeId, point.id, new Vector3(3, 0, 0)));
      throw new Error('preview failure');
    })).toThrow('preview failure');
    expect(world.getProjectionPlaneById(planeId)!.getPoint(point.id)!.position.x).toBe(0);

    expect(session.preview(command => command.addAndExecute(new UpdateFreePoint2DPositionOp(planeId, point.id, new Vector3(4, 0, 0)))).success).toBe(true);
    session.cancel();
    expect(world.getProjectionPlaneById(planeId)!.getPoint(point.id)!.position.x).toBe(0);
  });

  it('throws AggregateError when preview rollback fails', () => {
    const { commands } = initializedWorld();
    const session = commands.startPreviewCommand('Preview rollback failure');

    expect(() => session.preview(command => {
      command.addAndExecute({
        type: 'PreviewUndoThrows',
        parameters: {},
        outputs: {},
        apply: () => ({ success: true, outputs: {} }),
        undo: () => { throw new Error('preview rollback failed'); },
        serialize: () => ({ opType: 'PreviewUndoThrows' })
      });
      throw new Error('preview operation failed');
    })).toThrow(AggregateError);
  });

  it('throws AggregateError when preview commit rollback fails', () => {
    const { operationContext } = initializedWorld();
    const throwingStack = new CommandStack();
    throwingStack.push = () => { throw new Error('commit push failed'); };
    const commands = new RuntimeCommandProducer(operationContext, throwingStack);
    const session = commands.startPreviewCommand('Preview commit rollback failure');

    session.preview(command => command.addAndExecute({
      type: 'CommitUndoThrows',
      parameters: {},
      outputs: {},
      apply: () => ({ success: true, outputs: {} }),
      undo: () => { throw new Error('commit rollback failed'); },
      serialize: () => ({ opType: 'CommitUndoThrows' })
    }));

    expect(() => session.commit()).toThrow(AggregateError);
  });

  it('throws AggregateError when process command rollback fails', () => {
    const { operationContext } = initializedWorld();
    const throwingStack = new CommandStack();
    throwingStack.push = () => { throw new Error('process push failed'); };
    const commands = new RuntimeCommandProducer(operationContext, throwingStack);
    const operation: IOperation = {
      type: 'ProcessUndoThrows',
      parameters: {},
      outputs: {},
      apply: () => ({ success: true, outputs: {} }),
      undo: () => { throw new Error('process rollback failed'); },
      serialize: () => ({ opType: 'ProcessUndoThrows' })
    };

    expect(() => commands.executeProcessCommand('Process rollback failure', operation, () => ({ canPop: false, activeSubprocessId: 'root', stackDepth: 0 }))).toThrow(AggregateError);
  });
});

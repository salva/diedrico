import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { RuntimeCommandProducer } from '@/application/commandProduction/RuntimeCommandProducer';
import { FreePoint2D } from '@/domain/world/Point';
import { CommandStack } from '@/commands/CommandStack';
import { UpdateFreePoint2DPositionOp } from '@/commands/operations/world/UpdateFreePoint2DPositionOp';
import { initializeWorld } from '@/application/world/initializeWorld';
import { World } from '@/domain/world/World';

function initializedWorld() {
  const world = new World();
  const stack = new CommandStack();
  initializeWorld(world, stack);
  return { world, stack, commands: new RuntimeCommandProducer(world, stack) };
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
          targetRuntimeState.getProjectionPlaneById(planeId)!.addPoint(new FreePoint2D(`${planeId}/runtime-created-point`, new Vector3(10, 20, 0), planeId));
          return { success: true, outputs: {} };
        },
        undo: targetRuntimeState => targetRuntimeState.getProjectionPlaneById(planeId)!.removePoint(`${planeId}/runtime-created-point`),
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

    const result = commands.executeToolCommand('Create point on missing plane', (command) => {
      command.addAndExecute({
        type: 'FailAfterMutation',
        parameters: {},
        outputs: {},
        apply: () => ({ success: false, outputs: {}, error: 'expected failure' }),
        undo: () => undefined,
        serialize: () => ({ opType: 'FailAfterMutation' })
      });
    });

    const pointCountAfterFailure = world.getAllProjectionPlanes().reduce((count, plane) => count + plane.getAllPoints().length, 0);
    expect(result.success).toBe(false);
    expect(pointCountAfterFailure).toBe(existingPointCount);
    expect(stack.canUndo()).toBe(false);
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
});

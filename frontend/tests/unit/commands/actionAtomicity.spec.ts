import { describe, it, expect } from 'vitest';
import { Vector3 } from 'three';
import { createTestRuntimeContext, getHorizontalPlane } from '../../helpers/worldHelpers';
import { RuntimeCommandProducer } from '@/application/commandProduction/RuntimeCommandProducer';
import { CanvasToolController } from '@/application/tools/CanvasToolController';
import { ProcessHistoryUseCases } from '@/application/processHistory/ProcessHistoryUseCases';

describe('atomic user actions', () => {
  function setup() {
    const runtime = createTestRuntimeContext();
    const commands = new RuntimeCommandProducer(runtime.operationContext, runtime.commandStack);
    return { ...runtime, tools: new CanvasToolController({ operationContext: runtime.operationContext, commands }),
      history: new ProcessHistoryUseCases(runtime.operationContext.processTree, commands) };
  }

  it('undoes creation and entry together, including nested redo, without removing siblings', () => {
    const { history, operationContext: { processTree }, commandStack } = setup();
    history.pushSubprocess({ name: 'unrelated' });
    history.popSubprocess();
    const before = processTree.getRootSnapshot();
    history.pushSubprocess({ name: 'outer' });
    const outer = processTree.getRootSnapshot();
    history.pushSubprocess({ name: 'inner' });
    const inner = processTree.getRootSnapshot();
    commandStack.undo();
    expect(processTree.getRootSnapshot()).toEqual(outer);
    expect(processTree.getStackDepth()).toBe(2);
    commandStack.undo();
    expect(processTree.getRootSnapshot()).toEqual(before);
    expect(processTree.getStackDepth()).toBe(1);
    commandStack.redo();
    commandStack.redo();
    expect(processTree.getRootSnapshot()).toEqual(inner);
    expect(processTree.getStackDepth()).toBe(3);
  });

  it('rolls back a subordinate position change when a later parameter rejects, retaining redo', () => {
    const { world, tools, commandStack } = setup();
    const plane = getHorizontalPlane(world);
    tools.executeConstructionIntent({ type: 'point', planeId: plane.id, position: new Vector3(10, 20, 1), description: 'point' });
    const id = plane.getAllPoints().find(p => p.label === 'A')!.id;
    const before = JSON.parse(JSON.stringify(plane.getPoint(id)));
    tools.updateElementStyle({ elementId: id, planeId: plane.id, style: { color: '#ff0000' } });
    commandStack.undo();
    const count = commandStack.getUndoCount();
    expect(() => tools.updateElementProperties({ elementId: id, planeId: plane.id,
      position: new Vector3(30, 40, 1), parameter: { kind: 'radius', value: -1 } })).toThrow('Radius must be at least');
    expect(JSON.parse(JSON.stringify(plane.getPoint(id)))).toEqual(before);
    expect(commandStack.getUndoCount()).toBe(count);
    expect(commandStack.canRedo()).toBe(true);
    commandStack.redo();
    expect(plane.getPoint(id)!.visualStyle?.color).toBe('#ff0000');
    commandStack.undo();
    tools.updateElementProperties({ elementId: id, planeId: plane.id, style: { color: '#00ff00' } });
    expect(commandStack.canRedo()).toBe(false);
  });

  it('groups position and style, and preserves both across one undo/redo', () => {
    const { world, tools, commandStack } = setup();
    const plane = getHorizontalPlane(world);
    expect(tools.executeConstructionIntent({ type: 'point', planeId: plane.id, position: new Vector3(10, 20, 1), description: 'point' }).success).toBe(true);
    const point = plane.getAllPoints().find(p => p.label === 'A');
    expect(point).toBeDefined();
    const id = point!.id;
    const before = JSON.parse(JSON.stringify(plane.getPoint(id)));
    const count = commandStack.getUndoCount();
    expect(tools.updateElementProperties({ elementId: id, planeId: plane.id, position: new Vector3(30, 40, 1), style: { color: '#ff0000' } }).success).toBe(true);
    const after = JSON.parse(JSON.stringify(plane.getPoint(id)));
    expect(commandStack.getUndoCount()).toBe(count + 1);
    commandStack.undo();
    expect(JSON.parse(JSON.stringify(plane.getPoint(id)))).toEqual(before);
    commandStack.redo();
    expect(JSON.parse(JSON.stringify(plane.getPoint(id)))).toEqual(after);
  });
});

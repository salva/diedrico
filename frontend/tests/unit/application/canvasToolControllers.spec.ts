import { describe, expect, it, vi } from 'vitest';
import svgCanvasSource from '@/components/workspace/SvgCanvas.vue?raw';
import { Vector3 } from 'three';
import { executeConstructionIntent } from '@/application/construction/ConstructionUseCases';
import { CanvasPointMovementUseCase } from '@/application/canvas/CanvasPointMovementUseCase';
import { CanvasStyleUseCase } from '@/application/canvas/CanvasStyleUseCase';
import { CanvasToolController } from '@/application/tools/CanvasToolController';
import { RuntimeCommandProducer } from '@/application/commandProduction/RuntimeCommandProducer';
import { PointTool } from '@/tools/PointTool';
import { IntersectionTool } from '@/tools/IntersectionTool';
import { TangentLineToCircleThroughPointTool } from '@/tools/TangentLineToCircleThroughPointTool';
import { TangentLineToCircleParallelToLineTool } from '@/tools/TangentLineToCircleParallelToLineTool';
import { CanvasInteractionQuery } from '@/application/canvasPresentation/CanvasInteractionQuery';
import type { ToolContext } from '@/tools/ITool';
import type { ToolCommandSink, ToolConstructionIntent } from '@/tools/ToolCommandIntents';
import type { ArgumentValue } from '@/tools/ToolArgumentCollector';
import { createTestWorld, getHorizontalPlane, getHorizontalPlaneId, buildOperationContext } from '../../helpers/worldHelpers';
import { createToolInteractionReadPort } from '@/application/tools/ToolInteractionReadPort';

function userPoints(world: any, planeId: string) {
  return world.getProjectionPlaneById(planeId).getAllPoints().filter((point: any) => !point.locked);
}

function makeToolContext(overrides: Partial<ToolContext>): ToolContext {
  return {
    planeId: overrides.planeId!,
    planeCoords: overrides.planeCoords ?? new Vector3(0, 0, 1),
    canvasCoords: overrides.canvasCoords ?? { x: 0, y: 0 },
    commandSink: overrides.commandSink!,
    readPort: overrides.readPort!,
    interactionQuery: overrides.interactionQuery ?? new CanvasInteractionQuery([]),
    paperToPlaneTransform: overrides.paperToPlaneTransform,
    viewport: overrides.viewport ?? { zoom: 1, panX: 0, panY: 0 },
  };
}

function arg(element: any, planeCoords = new Vector3(0, 0, 1)): ArgumentValue {
  return { element, planeCoords };
}

describe('Wave 006a canvas/tool command controllers', () => {
  it('executes construction intents and rolls failed construction back without stack pollution', () => {
    const { world, visibilityModel, commandStack } = createTestWorld();
    const planeId = getHorizontalPlaneId(world);
    const beforeUndoCount = commandStack.getUndoCount();

    const success = executeConstructionIntent({
      world,
      commands: new RuntimeCommandProducer(buildOperationContext(world, visibilityModel), commandStack),
      intent: {
        type: 'point',
        description: 'Create free point',
        planeId,
        args: new Map([['position', arg(null, new Vector3(12, 34, 1))]])
      }
    });

    expect(success.success).toBe(true);
    expect(userPoints(world, planeId)).toHaveLength(1);
    expect(commandStack.getUndoCount()).toBe(beforeUndoCount + 1);

    const failure = executeConstructionIntent({
      world,
      commands: new RuntimeCommandProducer(buildOperationContext(world, visibilityModel), commandStack),
      intent: {
        type: 'point',
        description: 'Create invalid point',
        planeId: 'missing-plane',
        args: new Map([['position', arg(null, new Vector3(99, 99, 1))]])
      }
    });

    expect(failure.success).toBe(false);
    expect(commandStack.getUndoCount()).toBe(beforeUndoCount + 1);
    expect(userPoints(world, planeId)).toHaveLength(1);
  });

  it('uses typed intersection metadata to choose the intended line-circle intersection', () => {
    const { world, visibilityModel, commandStack } = createTestWorld();
    const plane = getHorizontalPlane(world);
    const planeId = plane.id;
    const center = world.getConstructionService().addFreePoint2D(plane, new Vector3(0, 0, 1));
    const radius = world.getConstructionService().addFreePoint2D(plane, new Vector3(5, 0, 1));
    const p1 = world.getConstructionService().addFreePoint2D(plane, new Vector3(-10, 3, 1));
    const p2 = world.getConstructionService().addFreePoint2D(plane, new Vector3(10, 3, 1));
    const line = world.getConstructionService().addLine2DBetweenTwoPoints(plane, p1.id, p2.id);
    const circle = world.getConstructionService().addCircle2DByCenterAndPoint(plane, center.id, radius.id);

    const result = executeConstructionIntent({
      world,
      commands: new RuntimeCommandProducer(buildOperationContext(world, visibilityModel), commandStack),
      intent: {
        type: 'intersection',
        description: 'Create intersection point',
        planeId,
        args: new Map([
          ['element1', arg(line)],
          ['element2', arg(circle, new Vector3(-4, 3, 1))]
        ]),
        metadata: { selectionPoint: new Vector3(-4, 3, 1) }
      }
    });

    expect(result.success).toBe(true);
    const created = userPoints(world, planeId).at(-1)!;
    const realization = created.realize2D(world);
    expect(realization.position.x).toBeLessThan(0);
    expect(realization.position.y).toBeCloseTo(3);
  });

  it('uses typed tangent metadata instead of defaulting tangent choices to index zero', () => {
    const { world, visibilityModel, commandStack } = createTestWorld();
    const plane = getHorizontalPlane(world);
    const planeId = plane.id;
    const center = world.getConstructionService().addFreePoint2D(plane, new Vector3(0, 0, 1));
    const radius = world.getConstructionService().addFreePoint2D(plane, new Vector3(5, 0, 1));
    const throughPoint = world.getConstructionService().addFreePoint2D(plane, new Vector3(10, 0, 1));
    const circle = world.getConstructionService().addCircle2DByCenterAndPoint(plane, center.id, radius.id);

    const result = executeConstructionIntent({
      world,
      commands: new RuntimeCommandProducer(buildOperationContext(world, visibilityModel), commandStack),
      intent: {
        type: 'tangent-line-to-circle-through-point',
        description: 'Create tangent line to circle through point',
        planeId,
        args: new Map([
          ['circle', arg(circle)],
          ['throughPoint', arg(throughPoint, new Vector3(10, -5, 1))]
        ]),
        metadata: { tangentIndex: 1, selectionPoint: new Vector3(10, -5, 1) }
      }
    });

    expect(result.success).toBe(true);
    const tangent = plane.getAllLines().at(-1) as any;
    expect(tangent.tangentIndex).toBe(1);
  });

  it('previews, cancels, commits, and undoes free-point moves through the movement use case', () => {
    const { world, visibilityModel, commandStack } = createTestWorld();
    const plane = getHorizontalPlane(world);
    const point = world.getConstructionService().addFreePoint2D(plane, new Vector3(1, 2, 1));
    const useCase = new CanvasPointMovementUseCase(new RuntimeCommandProducer(buildOperationContext(world, visibilityModel), commandStack));

    const cancelled = useCase.start({ planeId: plane.id, pointId: point.id, label: point.label });
    expect(cancelled.preview(new Vector3(3, 4, 1)).success).toBe(true);
    expect((plane.getPoint(point.id) as any).position.x).toBe(3);
    cancelled.cancel();
    expect((plane.getPoint(point.id) as any).position.x).toBe(1);

    const beforeUndoCount = commandStack.getUndoCount();
    const committed = useCase.start({ planeId: plane.id, pointId: point.id, label: point.label });
    expect(committed.preview(new Vector3(7, 8, 1)).success).toBe(true);
    expect(committed.commit().success).toBe(true);
    expect(commandStack.getUndoCount()).toBe(beforeUndoCount + 1);
    expect((plane.getPoint(point.id) as any).position.x).toBe(7);
    commandStack.undo();
    expect((plane.getPoint(point.id) as any).position.x).toBe(1);
  });

  it('updates element styles through the style use case with undo support', () => {
    const { world, visibilityModel, commandStack } = createTestWorld();
    const plane = getHorizontalPlane(world);
    const point = world.getConstructionService().addFreePoint2D(plane, new Vector3(1, 2, 1));
    const useCase = new CanvasStyleUseCase(new RuntimeCommandProducer(buildOperationContext(world, visibilityModel), commandStack));
    const beforeUndoCount = commandStack.getUndoCount();

    const result = useCase.update({
      planeId: plane.id,
      elementId: point.id,
      style: { color: '#ff0000', lineWidth: 2, lineStyle: 'dashed', opacity: 0.5, visible: true }
    });

    expect(result.success).toBe(true);
    expect(commandStack.getUndoCount()).toBe(beforeUndoCount + 1);
    expect(plane.getPoint(point.id)?.visualStyle?.color).toBe('#ff0000');
    commandStack.undo();
    expect(plane.getPoint(point.id)?.visualStyle).toBeUndefined();
  });

  it('lets tools emit typed construction intents with ambiguous-choice metadata through the command sink', () => {
    const { world, visibilityModel } = createTestWorld();
    const plane = getHorizontalPlane(world);
    const center = world.getConstructionService().addFreePoint2D(plane, new Vector3(0, 0, 1));
    const radius = world.getConstructionService().addFreePoint2D(plane, new Vector3(5, 0, 1));
    const external = world.getConstructionService().addFreePoint2D(plane, new Vector3(10, 0, 1));
    const l1p = world.getConstructionService().addFreePoint2D(plane, new Vector3(-10, 3, 1));
    const l2p = world.getConstructionService().addFreePoint2D(plane, new Vector3(10, 3, 1));
    const refLine = world.getConstructionService().addLine2DBetweenTwoPoints(plane, l1p.id, l2p.id);
    const circle = world.getConstructionService().addCircle2DByCenterAndPoint(plane, center.id, radius.id);

    const intents: ToolConstructionIntent[] = [];
    const sink: ToolCommandSink = {
      executeConstructionIntent: vi.fn((intent: ToolConstructionIntent) => {
        intents.push(intent);
        return { success: true };
      }),
      startFreePointMove: vi.fn(() => ({ preview: vi.fn(() => ({ success: true })), commit: vi.fn(() => ({ success: true })), cancel: vi.fn() })),
      updateElementStyle: vi.fn(() => ({ success: true }))
    };
    const interactionQuery = new CanvasInteractionQuery([]);
    vi.spyOn(interactionQuery, 'hitTest')
      .mockReturnValueOnce({ elementId: circle.id } as any)
      .mockReturnValueOnce({ elementId: external.id } as any)
      .mockReturnValueOnce({ elementId: refLine.id } as any)
      .mockReturnValueOnce({ elementId: circle.id } as any)
      .mockReturnValueOnce({ elementId: refLine.id } as any)
      .mockReturnValueOnce({ elementId: circle.id } as any);

    const base = { planeId: plane.id, readPort: createToolInteractionReadPort(world), interactionQuery,
      viewport: { zoom: 1, panX: 0, panY: 0 }, commandSink: sink };
    const throughTool = new TangentLineToCircleThroughPointTool();
    throughTool.handleClick(makeToolContext({ ...base, planeCoords: new Vector3(0, 0, 1) }));
    throughTool.handleClick(makeToolContext({ ...base, planeCoords: new Vector3(10, -5, 1) }));

    const parallelTool = new TangentLineToCircleParallelToLineTool();
    parallelTool.handleClick(makeToolContext({ ...base, planeCoords: new Vector3(-10, 3, 1) }));
    parallelTool.handleClick(makeToolContext({ ...base, planeCoords: new Vector3(0, 0, 1) }));

    const intersectionTool = new IntersectionTool();
    intersectionTool.handleClick(makeToolContext({ ...base, planeCoords: new Vector3(-10, 3, 1) }));
    intersectionTool.handleClick(makeToolContext({ ...base, planeCoords: new Vector3(-4, 3, 1) }));

    expect(intents[0].type).toBe('tangent-line-to-circle-through-point');
    if (intents[0].type === 'tangent-line-to-circle-through-point') {
      expect(intents[0].metadata.tangentIndex).toBe(1);
      expect(intents[0].metadata.selectionPoint.y).toBe(-5);
    }
    expect(intents[1].type).toBe('tangent-line-to-circle-parallel');
    if (intents[1].type === 'tangent-line-to-circle-parallel') {
      expect(intents[1].metadata.tangentIndex).toBe(0);
    }
    expect(intents[2].type).toBe('intersection');
    if (intents[2].type === 'intersection') {
      expect(intents[2].metadata.selectionPoint.x).toBe(-4);
    }
  });


  it('keeps SvgCanvas on the controller boundary for movement and style delegation', () => {
    const source = svgCanvasSource;

    expect(source).toContain('CanvasCommandProducerInjectionKey');
    expect(source).not.toContain("inject('commandStack')");
    expect(source).toContain('getMovableFreePointMoveSession');
    expect(source).toContain('.updateElementStyle(');
    expect(source).not.toContain("from '@/commands/Command'");
    expect(source).not.toContain('UpdateFreePoint2DPositionOp');
    expect(source).not.toContain('UpdateElementStyleOp');
    expect(source).not.toContain('new Command(');
  });

  it('delegates through CanvasToolController rather than exposing command construction to tools', () => {
    const { world, visibilityModel, commandStack } = createTestWorld();
    const planeId = getHorizontalPlaneId(world);
    const controller = new CanvasToolController({ world, commands: new RuntimeCommandProducer(buildOperationContext(world, visibilityModel), commandStack) });
    const pointTool = new PointTool();
    const result = pointTool.handleClick(makeToolContext({
      planeId,
      planeCoords: new Vector3(21, 22, 1),
      readPort: createToolInteractionReadPort(world),
      interactionQuery: new CanvasInteractionQuery([]) as any,
      commandSink: controller
    }));

    expect(result.success).toBe(true);
    expect(userPoints(world, planeId)).toHaveLength(1);
  });
});

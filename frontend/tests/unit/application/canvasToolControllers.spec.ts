import { describe, expect, it, vi } from 'vitest';
import svgCanvasSource from '@/components/workspace/SvgCanvas.vue?raw';
import { Vector3 } from 'three';
import { executeConstructionIntent } from '@/application/construction/ConstructionUseCases';
import { CanvasPointMovementUseCase } from '@/application/canvas/CanvasPointMovementUseCase';
import { CanvasStyleUseCase } from '@/application/canvas/CanvasStyleUseCase';
import { CanvasToolController } from '@/application/tools/CanvasToolController';
import { RuntimeCommandProducer } from '@/application/commandProduction/RuntimeCommandProducer';
import { PointTool } from '@/tools/PointTool';
import { LineTool } from '@/tools/LineTool';
import { SegmentTool } from '@/tools/SegmentTool';
import { CircleTool } from '@/tools/CircleTool';
import { GuideTool } from '@/tools/GuideTool';
import { ParallelLineTool } from '@/tools/ParallelLineTool';
import { PerpendicularLineTool } from '@/tools/PerpendicularLineTool';
import { IntersectionTool } from '@/tools/IntersectionTool';
import { TangentLineToCircleThroughPointTool } from '@/tools/TangentLineToCircleThroughPointTool';
import { TangentLineToCircleParallelToLineTool } from '@/tools/TangentLineToCircleParallelToLineTool';
import { Create3DPointTool } from '@/tools/Create3DPointTool';
import { Create3DLineTool } from '@/tools/Create3DLineTool';
import { Create3DSegmentTool } from '@/tools/Create3DSegmentTool';
import { Create3DPlaneTool } from '@/tools/Create3DPlaneTool';
import { CreateProjectionPlaneTool } from '@/tools/CreateProjectionPlaneTool';
import { CanvasInteractionQuery } from '@/application/canvasPresentation/CanvasInteractionQuery';
import { resolveVisibility } from '@/application/canvasPresentation/styleService';
import type { ToolContext } from '@/tools/ITool';
import type { ToolCommandSink, ToolConstructionIntent } from '@/tools/ToolCommandIntents';
import type { ArgumentValue } from '@/tools/ToolArgumentCollector';
import { createTestWorld, getHorizontalPlane, getHorizontalPlaneId, getVerticalPlane } from '../../helpers/worldHelpers';
import { createToolInteractionReadPort } from '@/application/tools/ToolInteractionReadPort';

function userPoints(world: any, planeId: string) {
  return world.getProjectionPlaneById(planeId).getAllPoints().filter((point: any) => !point.locked);
}

function realizedPosition(element: any, operationContext: any) {
  return element.realize2D(operationContext.realizationContext).position;
}

function findPointAt(points: any[], operationContext: any, x: number, y: number) {
  return points.find(point => {
    const position = realizedPosition(point, operationContext);
    return Math.abs(position.x - x) < 1e-6 && Math.abs(position.y - y) < 1e-6;
  });
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

function buildIntent(tool: any, args: [string, ArgumentValue][], context: ToolContext): ToolConstructionIntent {
  return tool.buildConstructionIntent(new Map(args), context);
}

describe('Wave 006a canvas/tool command controllers', () => {
  it('executes construction intents and rolls failed construction back without stack pollution', () => {
    const { world, visibilityModel, commandStack, operationContext } = createTestWorld();
    const planeId = getHorizontalPlaneId(world);
    const beforeUndoCount = commandStack.getUndoCount();

    const success = executeConstructionIntent({
      operationContext,
      commands: new RuntimeCommandProducer(operationContext, commandStack),
      intent: {
        type: 'point',
        description: 'Create free point',
        planeId,
        position: new Vector3(12, 34, 1)
      }
    });

    expect(success.success).toBe(true);
    expect(userPoints(world, planeId)).toHaveLength(1);
    expect(commandStack.getUndoCount()).toBe(beforeUndoCount + 1);

    expect(() => executeConstructionIntent({
      operationContext,
      commands: new RuntimeCommandProducer(operationContext, commandStack),
      intent: {
        type: 'point',
        description: 'Create invalid point',
        planeId: 'missing-plane',
        position: new Vector3(99, 99, 1)
      }
    })).toThrow('target plane not found: missing-plane');

    expect(commandStack.getUndoCount()).toBe(beforeUndoCount + 1);
    expect(userPoints(world, planeId)).toHaveLength(1);
  });

  it('uses typed intersection metadata to choose the intended line-circle intersection', () => {
    const { world, visibilityModel, commandStack, operationContext } = createTestWorld();
    const plane = getHorizontalPlane(world);
    const planeId = plane.id;
    const center = operationContext.projectionConstruction.addFreePoint2D(plane, new Vector3(0, 0, 1));
    const radius = operationContext.projectionConstruction.addFreePoint2D(plane, new Vector3(5, 0, 1));
    const p1 = operationContext.projectionConstruction.addFreePoint2D(plane, new Vector3(-10, 3, 1));
    const p2 = operationContext.projectionConstruction.addFreePoint2D(plane, new Vector3(10, 3, 1));
    const line = operationContext.projectionConstruction.addLine2DBetweenTwoPoints(plane, p1.id, p2.id);
    const circle = operationContext.projectionConstruction.addCircle2DByCenterAndPoint(plane, center.id, radius.id);

    const result = executeConstructionIntent({
      operationContext,
      commands: new RuntimeCommandProducer(operationContext, commandStack),
      intent: {
        type: 'intersection',
        description: 'Create intersection point',
        planeId,
        element1Id: line.id,
        element2Id: circle.id,
        selectionPoint: new Vector3(-4, 3, 1)
      }
    });

    expect(result.success).toBe(true);
    const created = userPoints(world, planeId).at(-1)!;
    const realization = created.realize2D(operationContext.realizationContext);
    expect(realization.position.x).toBeLessThan(0);
    expect(realization.position.y).toBeCloseTo(3);
  });

  it('uses typed tangent metadata instead of defaulting tangent choices to index zero', () => {
    const { world, visibilityModel, commandStack, operationContext } = createTestWorld();
    const plane = getHorizontalPlane(world);
    const planeId = plane.id;
    const center = operationContext.projectionConstruction.addFreePoint2D(plane, new Vector3(0, 0, 1));
    const radius = operationContext.projectionConstruction.addFreePoint2D(plane, new Vector3(5, 0, 1));
    const throughPoint = operationContext.projectionConstruction.addFreePoint2D(plane, new Vector3(10, 0, 1));
    const circle = operationContext.projectionConstruction.addCircle2DByCenterAndPoint(plane, center.id, radius.id);

    const result = executeConstructionIntent({
      operationContext,
      commands: new RuntimeCommandProducer(operationContext, commandStack),
      intent: {
        type: 'tangent-line-to-circle-through-point',
        description: 'Create tangent line to circle through point',
        planeId,
        circleId: circle.id,
        throughPointId: throughPoint.id,
        tangentIndex: 1,
        selectionPoint: new Vector3(10, -5, 1)
      }
    });

    expect(result.success).toBe(true);
    const tangent = plane.getAllLines().at(-1) as any;
    expect(tangent.tangentIndex).toBe(1);
  });

  it('creates a 3D point from XYZ coordinates as an encapsulated construction procedure', () => {
    const { world, visibilityModel, commandStack, operationContext } = createTestWorld();
    const horizontalPlane = getHorizontalPlane(world);
    const verticalPlane = getVerticalPlane(world);
    const initialLineIds = new Set([
      ...horizontalPlane.getAllLines().map(line => line.id),
      ...verticalPlane.getAllLines().map(line => line.id),
    ]);
    const beforeUndoCount = commandStack.getUndoCount();

    const result = executeConstructionIntent({
      operationContext,
      commands: new RuntimeCommandProducer(operationContext, commandStack),
      intent: {
        type: 'create3dpoint-by-coordinates',
        description: 'Create 3D point (3, -4, 5)',
        coordinates: new Vector3(3, -4, 5)
      }
    });

    expect(result.success).toBe(true);
    expect(commandStack.getUndoCount()).toBe(beforeUndoCount + 1);

    const pointA = findPointAt(horizontalPlane.getAllPoints(), operationContext, 3, -4);
    const pointB = findPointAt(verticalPlane.getAllPoints(), operationContext, 2, 5);
    const pointC = findPointAt(verticalPlane.getAllPoints(), operationContext, 3, 5);
    expect(pointA).toBeTruthy();
    expect(pointB).toBeTruthy();
    expect(pointC).toBeTruthy();

    const [point3D] = world.getAll3DPoints();
    expect(point3D).toBeTruthy();
    const point3DRealization = point3D.realize3D(operationContext.realizationContext);
    expect(point3DRealization.isFeasible()).toBe(true);
    expect(point3DRealization.position.x).toBeCloseTo(3);
    expect(point3DRealization.position.y).toBeCloseTo(-4);
    expect(point3DRealization.position.z).toBeCloseTo(5);

    const createdLines = [
      ...horizontalPlane.getAllLines(),
      ...verticalPlane.getAllLines(),
    ].filter(line => !initialLineIds.has(line.id));
    expect(createdLines).toHaveLength(3);

    const subprocess = operationContext.processTree.root.children.find(
      child => child.type === 'subprocess' && child.name === 'Create 3D point from coordinates'
    );
    expect(subprocess).toBeTruthy();
    expect(visibilityModel.get(subprocess!.id, 'subprocess').showIntermediates).toBe(false);

    expect(resolveVisibility(pointA, operationContext.processTree, visibilityModel)).toBe(true);
    expect(resolveVisibility(pointC, operationContext.processTree, visibilityModel)).toBe(true);
    expect(resolveVisibility(point3D, operationContext.processTree, visibilityModel)).toBe(true);
    expect(resolveVisibility(pointB, operationContext.processTree, visibilityModel)).toBe(false);
    expect(createdLines.every(line => resolveVisibility(line, operationContext.processTree, visibilityModel) === false)).toBe(true);

    commandStack.undo();
    expect(world.getAll3DPoints()).toHaveLength(0);
    expect(findPointAt(horizontalPlane.getAllPoints(), operationContext, 3, -4)).toBeUndefined();
    expect(findPointAt(verticalPlane.getAllPoints(), operationContext, 3, 5)).toBeUndefined();
  });

  it('previews, cancels, commits, and undoes free-point moves through the movement use case', () => {
    const { world, visibilityModel, commandStack, operationContext } = createTestWorld();
    const plane = getHorizontalPlane(world);
    const point = operationContext.projectionConstruction.addFreePoint2D(plane, new Vector3(1, 2, 1));
    const useCase = new CanvasPointMovementUseCase(new RuntimeCommandProducer(operationContext, commandStack));

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
    const { world, visibilityModel, commandStack, operationContext } = createTestWorld();
    const plane = getHorizontalPlane(world);
    const point = operationContext.projectionConstruction.addFreePoint2D(plane, new Vector3(1, 2, 1));
    const useCase = new CanvasStyleUseCase(new RuntimeCommandProducer(operationContext, commandStack));
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
    const { world, visibilityModel, operationContext } = createTestWorld();
    const plane = getHorizontalPlane(world);
    const center = operationContext.projectionConstruction.addFreePoint2D(plane, new Vector3(0, 0, 1));
    const radius = operationContext.projectionConstruction.addFreePoint2D(plane, new Vector3(5, 0, 1));
    const external = operationContext.projectionConstruction.addFreePoint2D(plane, new Vector3(10, 0, 1));
    const l1p = operationContext.projectionConstruction.addFreePoint2D(plane, new Vector3(-10, 3, 1));
    const l2p = operationContext.projectionConstruction.addFreePoint2D(plane, new Vector3(10, 3, 1));
    const refLine = operationContext.projectionConstruction.addLine2DBetweenTwoPoints(plane, l1p.id, l2p.id);
    const circle = operationContext.projectionConstruction.addCircle2DByCenterAndPoint(plane, center.id, radius.id);

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

    const base = { planeId: plane.id, readPort: createToolInteractionReadPort(world, operationContext.realizations), interactionQuery,
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
      expect(intents[0].tangentIndex).toBe(1);
      expect(intents[0].selectionPoint.y).toBe(-5);
      expect(intents[0].circleId).toBe(circle.id);
      expect(intents[0].throughPointId).toBe(external.id);
    }
    expect(intents[1].type).toBe('tangent-line-to-circle-parallel');
    if (intents[1].type === 'tangent-line-to-circle-parallel') {
      expect(intents[1].tangentIndex).toBe(0);
      expect(intents[1].circleId).toBe(circle.id);
      expect(intents[1].referenceLineId).toBe(refLine.id);
    }
    expect(intents[2].type).toBe('intersection');
    if (intents[2].type === 'intersection') {
      expect(intents[2].selectionPoint.x).toBe(-4);
      expect(intents[2].element1Id).toBe(refLine.id);
      expect(intents[2].element2Id).toBe(circle.id);
    }
  });

  it('builds typed construction intents for every construction tool path', () => {
    const { world, operationContext } = createTestWorld();
    const plane = getHorizontalPlane(world);
    const context = makeToolContext({
      planeId: plane.id,
      planeCoords: new Vector3(9, 9, 1),
      readPort: createToolInteractionReadPort(world, operationContext.realizations),
      commandSink: { executeConstructionIntent: vi.fn(), startFreePointMove: vi.fn(), updateElementStyle: vi.fn() } as any,
    });
    const p1 = { id: `${plane.id}/p1`, planeId: plane.id };
    const p2 = { id: `${plane.id}/p2`, planeId: plane.id };
    const line = { id: `${plane.id}/l1`, planeId: plane.id };
    const circle = { id: `${plane.id}/c1`, planeId: plane.id };
    const otherLine = { id: 'other/l2', planeId: 'other' };
    const t2Prime = { id: `${plane.id}/l3`, planeId: plane.id };

    expect(buildIntent(new PointTool(), [['position', arg(null, new Vector3(1, 2, 1))]], context)).toMatchObject({ type: 'point', planeId: plane.id, position: new Vector3(1, 2, 1) });
    expect(buildIntent(new LineTool(), [['point1', arg(p1)], ['point2', arg(p2)]], context)).toMatchObject({ type: 'line', point1Id: p1.id, point2Id: p2.id });
    expect(buildIntent(new SegmentTool(), [['point1', arg(p1)], ['point2', arg(p2)]], context)).toMatchObject({ type: 'segment', point1Id: p1.id, point2Id: p2.id });
    expect(buildIntent(new CircleTool(), [['center', arg(p1)], ['circumferencePoint', arg(p2)]], context)).toMatchObject({ type: 'circle', centerPointId: p1.id, circumferencePointId: p2.id });
    expect(buildIntent(new GuideTool(), [['referenceLine', arg(line)], ['throughPoint', arg(p1)]], context)).toMatchObject({ type: 'guide', referenceLineId: line.id, throughPointId: p1.id });
    expect(buildIntent(new ParallelLineTool(), [['referenceLine', arg(line)], ['throughPoint', arg(p1)]], context)).toMatchObject({ type: 'parallel-line', referenceLineId: line.id, throughPointId: p1.id });
    expect(buildIntent(new PerpendicularLineTool(), [['referenceLine', arg(line)], ['throughPoint', arg(p1)]], context)).toMatchObject({ type: 'perpendicular-line', referenceLineId: line.id, throughPointId: p1.id });
    expect(buildIntent(new IntersectionTool(), [['element1', arg(line)], ['element2', arg(circle, new Vector3(3, 4, 1))]], context)).toMatchObject({ type: 'intersection', element1Id: line.id, element2Id: circle.id, selectionPoint: new Vector3(3, 4, 1) });
    expect(buildIntent(new TangentLineToCircleThroughPointTool(), [['circle', arg(circle)], ['throughPoint', arg(p1, new Vector3(5, 6, 1))]], context)).toMatchObject({ type: 'tangent-line-to-circle-through-point', circleId: circle.id, throughPointId: p1.id, selectionPoint: new Vector3(5, 6, 1) });
    expect(buildIntent(new TangentLineToCircleParallelToLineTool(), [['circle', arg(circle)], ['referenceLine', arg(line, new Vector3(7, 8, 1))]], context)).toMatchObject({ type: 'tangent-line-to-circle-parallel', circleId: circle.id, referenceLineId: line.id, selectionPoint: new Vector3(7, 8, 1) });
    expect(buildIntent(new Create3DPointTool(), [['projection1', arg(p1)], ['projection2', arg({ ...p2, planeId: 'other' })]], context)).toMatchObject({ type: 'create3dpoint', projection1PointId: p1.id, projection2PointId: p2.id });
    expect(buildIntent(new Create3DLineTool(), [['projection1', arg(line)], ['projection2', arg(otherLine)]], context)).toMatchObject({ type: 'create3dline', projection1LineId: line.id, projection2LineId: otherLine.id });
    expect(buildIntent(new Create3DSegmentTool(), [['projection1', arg(line)], ['projection2', arg(otherLine)]], context)).toMatchObject({ type: 'create3dsegment', projection1SegmentId: line.id, projection2SegmentId: otherLine.id });
    expect(buildIntent(new Create3DPlaneTool(), [['trace1', arg(line)], ['trace2', arg(otherLine)]], context)).toMatchObject({ type: 'create3dplane', trace1LineId: line.id, trace2LineId: otherLine.id });
    expect(buildIntent(new CreateProjectionPlaneTool(), [['t1HingeTrace', arg(line)], ['t2OtherTrace', arg(otherLine)], ['t2PrimePositionLine', arg(t2Prime)]], context)).toMatchObject({ type: 'createprojectionplane', t1HingeTraceLineId: line.id, t2OtherTraceLineId: otherLine.id, t2PrimePositionLineId: t2Prime.id });
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
    const { world, visibilityModel, commandStack, operationContext } = createTestWorld();
    const planeId = getHorizontalPlaneId(world);
    const controller = new CanvasToolController({ operationContext, commands: new RuntimeCommandProducer(operationContext, commandStack) });
    const pointTool = new PointTool();
    const result = pointTool.handleClick(makeToolContext({
      planeId,
      planeCoords: new Vector3(21, 22, 1),
      readPort: createToolInteractionReadPort(world, operationContext.realizations),
      interactionQuery: new CanvasInteractionQuery([]) as any,
      commandSink: controller
    }));

    expect(result.success).toBe(true);
    expect(userPoints(world, planeId)).toHaveLength(1);
  });
});

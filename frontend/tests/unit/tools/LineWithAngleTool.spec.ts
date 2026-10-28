import { describe, it, expect, beforeEach } from 'vitest';
import { Matrix3, Vector3 } from 'three';
import { LineWithAngleTool } from '@/tools/LineWithAngleTool';
import { AddFreePoint2DOp } from '@/commands/operations/world/AddFreePointOp';
import { AddLine2DByTwoPointsOp } from '@/commands/operations/world/AddLineOp';
import { CanvasToolController } from '@/application/tools/CanvasToolController';
import { RuntimeCommandProducer } from '@/application/commandProduction/RuntimeCommandProducer';
import { Command } from '@/commands/Command';
import { CanvasPresentationSelector } from '@/application/canvasPresentation/CanvasPresentationSelector';
import { CanvasInteractionQuery } from '@/application/canvasPresentation/CanvasInteractionQuery';
import { createToolInteractionReadPort, type ToolInteractionReadPort } from '@/application/tools/ToolInteractionReadPort';
import { Line2DByPointAndRelativeAngle } from '@/domain/world/Line';
import { createTestWorld, getHorizontalPlane } from '../../helpers/worldHelpers';
import type { World } from '@/domain/world/World';
import type { CommandStack } from '@/commands/CommandStack';
import type { VisibilityModel } from '@/application/processTree/VisibilityModel';
import type { OperationContext } from '@/commands/operations/OperationContext';
import type { ToolContext } from '@/tools/ITool';

function liveInteractionQuery(
  worldRef: () => World,
  visibilityModelRef: () => VisibilityModel,
  operationContextRef: () => OperationContext,
  planeIdRef: () => string,
): CanvasInteractionQuery {
  return {
    hitTest(canvasPos: any, snapRadiusPixels: number, context: any, selectionMask?: any) {
      const world = worldRef();
      const activePlaneId = context.activePlaneId ?? planeIdRef();
      const operationContext = operationContextRef();
      const model = new CanvasPresentationSelector().select(
        world,
        { zoom: 1, panX: 0, panY: 0, width: 800, height: 600 },
        {
          activePlaneId,
          visibilityModel: visibilityModelRef(),
          processTree: operationContext.processTree,
          realizations: operationContext.realizations,
        },
      );
      return new CanvasInteractionQuery(model.queryItems).hitTest(canvasPos, snapRadiusPixels, context, selectionMask);
    },
  } as CanvasInteractionQuery;
}

describe('LineWithAngleTool', () => {
  let tool: LineWithAngleTool;
  let world: World;
  let visibilityModel: VisibilityModel;
  let commandStack: CommandStack;
  let operationContext: OperationContext;
  let horizontalPlaneId: string;
  let interactionQuery: CanvasInteractionQuery;
  let readPort: ToolInteractionReadPort;
  let referenceLineId: string;
  let throughPointId: string;

  beforeEach(() => {
    tool = new LineWithAngleTool();
    const context = createTestWorld();
    world = context.world;
    visibilityModel = context.visibilityModel;
    commandStack = context.commandStack;
    operationContext = context.operationContext;
    horizontalPlaneId = getHorizontalPlane(world).id!;
    interactionQuery = liveInteractionQuery(() => world, () => visibilityModel, () => operationContext, () => horizontalPlaneId);
    readPort = createToolInteractionReadPort(world, operationContext.realizations);

    const setupCmd = new Command('Setup line with angle test geometry', operationContext);
    const p1 = new AddFreePoint2DOp(horizontalPlaneId, new Vector3(0, 40, 1));
    setupCmd.addAndExecute(p1);
    const p2 = new AddFreePoint2DOp(horizontalPlaneId, new Vector3(100, 40, 1));
    setupCmd.addAndExecute(p2);
    const through = new AddFreePoint2DOp(horizontalPlaneId, new Vector3(0, 60, 1));
    setupCmd.addAndExecute(through);
    const referenceLine = new AddLine2DByTwoPointsOp(horizontalPlaneId, p1.outputs.pointId as string, p2.outputs.pointId as string);
    setupCmd.addAndExecute(referenceLine);
    setupCmd.commit();
    commandStack.push(setupCmd);

    referenceLineId = referenceLine.outputs.lineId as string;
    throughPointId = through.outputs.pointId as string;
  });

  function makeContext(planeCoords: Vector3): ToolContext {
    return {
      planeId: horizontalPlaneId,
      planeCoords,
      canvasCoords: planeCoords,
      commandSink: new CanvasToolController({
        operationContext,
        commands: new RuntimeCommandProducer(operationContext, commandStack),
      }),
      readPort,
      interactionQuery,
      viewport: { zoom: 1, panX: 0, panY: 0 },
      paperToPlaneTransform: new Matrix3().identity(),
    };
  }

  it('should create a line with angle using the mouse as angle control', () => {
    const lineResult = tool.handleClick(makeContext(new Vector3(50, 40, 1)));
    expect(lineResult.success).toBe(true);

    const pointResult = tool.handleClick(makeContext(new Vector3(0, 60, 1)));
    expect(pointResult.success).toBe(true);
    expect(pointResult.message).toContain('angle');

    const angleResult = tool.handleClick(makeContext(new Vector3(0, 160, 1)));
    expect(angleResult.success).toBe(true);
    expect(angleResult.message).toContain('completed successfully');

    const plane = world.getProjectionPlaneById(horizontalPlaneId);
    const lines = plane?.getAllLines().filter((line): line is Line2DByPointAndRelativeAngle => (
      line instanceof Line2DByPointAndRelativeAngle
    )) || [];
    expect(lines.length).toBe(1);
    expect(lines[0]).toBeInstanceOf(Line2DByPointAndRelativeAngle);

    const created = lines[0] as Line2DByPointAndRelativeAngle;
    expect(created.referenceLineId).toBe(referenceLineId);
    expect(created.throughPointId).toBe(throughPointId);
    expect(created.angleRadians).toBeCloseTo(Math.PI / 2, 4);

    const realization = created.realize2D(operationContext.realizationContext);
    expect(realization.feasible).toBe(true);
    expect(realization.point1.x).toBeCloseTo(0, 4);
    expect(realization.point1.y).toBeCloseTo(60, 4);
    expect(realization.getDirection().x).toBeCloseTo(0, 4);
    expect(realization.getDirection().y).toBeGreaterThan(0);
  });

  it('should create a line with angle using numeric angle input', () => {
    expect(tool.handleClick(makeContext(new Vector3(50, 40, 1))).success).toBe(true);
    expect(tool.handleClick(makeContext(new Vector3(0, 60, 1))).success).toBe(true);

    const request = tool.getToolArgumentInputRequest();
    expect(request).toMatchObject({ kind: 'scalar', valueKind: 'angle', label: 'angle' });

    const inputResult = tool.handleToolArgumentInput(makeContext(new Vector3(0, 60, 1)), {
      kind: 'scalar',
      valueKind: 'angle',
      radians: Math.PI / 4,
    });
    expect(inputResult.success).toBe(true);

    const plane = world.getProjectionPlaneById(horizontalPlaneId);
    const created = plane?.getAllLines().find((line): line is Line2DByPointAndRelativeAngle => (
      line instanceof Line2DByPointAndRelativeAngle
    ));
    expect(created).toBeInstanceOf(Line2DByPointAndRelativeAngle);
    expect(created?.angleRadians).toBeCloseTo(Math.PI / 4, 4);
  });
});

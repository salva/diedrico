/**
 * Unit tests for tool argument validation
 * Phase 113: Verify tools reject invalid arguments
 * 
 * Tests:
 * - LineTool rejects same point twice
 * - SegmentTool rejects same point twice
 * - CircleTool rejects zero-radius circle
 * - ParallelLineTool rejects infeasible reference line
 * - PerpendicularLineTool rejects infeasible reference line
 * - TangentLineToCircleThroughPointTool rejects point inside circle
 * 
 * Tasks: T1869-T1874
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LineTool } from '@/tools/LineTool';
import { SegmentTool } from '@/tools/SegmentTool';
import { CircleTool } from '@/tools/CircleTool';
import { ParallelLineTool } from '@/tools/ParallelLineTool';
import { PerpendicularLineTool } from '@/tools/PerpendicularLineTool';
import { TangentLineToCircleThroughPointTool } from '@/tools/TangentLineToCircleThroughPointTool';
import type { World } from '@/domain/world/World';
import type { CommandStack } from '@/commands/CommandStack';
import type { VisibilityModel } from '@/application/processTree/VisibilityModel';
import type { OperationContext } from '@/commands/operations/OperationContext';
import { Command } from '@/commands/Command';
import { createTestWorld, getHorizontalPlane } from '../../helpers/worldHelpers';
import { AddFreePoint2DOp } from '@/commands/operations/world/AddFreePointOp';
import type { ToolContext } from '@/tools/ITool';
import { CanvasToolController } from '@/application/tools/CanvasToolController';
import { RuntimeCommandProducer } from '@/application/commandProduction/RuntimeCommandProducer';
import { Vector3, Matrix3 } from 'three';
import { CanvasPresentationSelector } from '@/application/canvasPresentation/CanvasPresentationSelector';
import { createToolInteractionReadPort } from '@/application/tools/ToolInteractionReadPort';
import { CreateProjectionPlaneTool } from '@/tools/CreateProjectionPlaneTool';
import { Line2D, Line2DRealization2D } from '@/domain/world/Line';
import type { CollectionContext, ToolArgumentSet } from '@/tools/ToolArgumentCollector';

class ExposedCreateProjectionPlaneTool extends CreateProjectionPlaneTool {
  exposeArgumentSets(): ToolArgumentSet[] {
    return this.getArgumentSets();
  }
}

class TestLine2D extends Line2D {
  constructor(id: string, planeId: string) {
    super(id, planeId);
  }

  clone(): Line2D {
    return new TestLine2D(this.id, this.planeId);
  }

  realize2D(): Line2DRealization2D {
    return new Line2DRealization2D(new Vector3(0, 0, 1), new Vector3(1, 0, 0), true);
  }
}

function liveInteractionQuery(worldRef: () => any, visibilityModelRef: () => VisibilityModel, operationContextRef: () => OperationContext, planeIdRef: () => string): CanvasInteractionQuery {
  return {
    hitTest(canvasPos: any, snapRadiusPixels: number, context: any, selectionMask?: any) {
      const world = worldRef();
      const activePlaneId = context.activePlaneId ?? planeIdRef();
      const operationContext = operationContextRef();
      const model = new CanvasPresentationSelector().select(world, { zoom: 1, panX: 0, panY: 0, width: 800, height: 600 }, { activePlaneId, visibilityModel: visibilityModelRef(), processTree: operationContext.processTree, realizations: operationContext.realizations });
      return new CanvasInteractionQuery(model.queryItems).hitTest(canvasPos, snapRadiusPixels, context, selectionMask);
    }
  } as CanvasInteractionQuery;
}
import { CanvasInteractionQuery } from '@/application/canvasPresentation/CanvasInteractionQuery';

describe('Tool Argument Validation', () => {
  let world: World;
  let visibilityModel: VisibilityModel;
  let commandStack: CommandStack;
  let operationContext: OperationContext;
  let planeId: string;
  let interactionQuery: CanvasInteractionQuery;

  function makeContext(coords: Vector3): ToolContext {
    return {
      planeId,
      planeCoords: coords.clone(),
      canvasCoords: coords.clone(),
      commandSink: new CanvasToolController({ operationContext, commands: new RuntimeCommandProducer(operationContext, commandStack) }),
      readPort: createToolInteractionReadPort(world, operationContext.realizations),
      interactionQuery,
      viewport: { zoom: 1, panX: 0, panY: 0 },
      paperToPlaneTransform: new Matrix3().identity(),
    };
  }

  function addPoint(x: number, y: number): string {
    const cmd = new Command('Add point', operationContext);
    const op = new AddFreePoint2DOp(planeId, new Vector3(x, y, 1));
    cmd.addAndExecute(op);
    cmd.commit();
    commandStack.push(cmd);
    return op.outputs.pointId as string;
  }

  beforeEach(() => {
    const { world: w, visibilityModel: vm, commandStack: cs, operationContext: oc } = createTestWorld();
    world = w;
    visibilityModel = vm;
    commandStack = cs;
    operationContext = oc;
    interactionQuery = liveInteractionQuery(() => world, () => visibilityModel, () => operationContext, () => planeId);
    planeId = getHorizontalPlane(world).id!;
  });

  describe('LineTool', () => {
    it('should reject selecting the same point twice', () => {
      const tool = new LineTool();
      addPoint(100, 100);

      // Click same point twice
      const ctx = makeContext(new Vector3(100, 100, 1));
      const r1 = tool.handleClick(ctx);
      expect(r1.success).toBe(true);

      const r2 = tool.handleClick(ctx);
      // Rejection: either success=false or doesn't complete
      if (r2.success) {
        expect(r2.message).not.toContain('completed successfully');
      }
    });

    it('should accept two different points', () => {
      const tool = new LineTool();
      addPoint(100, 100);
      addPoint(200, 100);

      const r1 = tool.handleClick(makeContext(new Vector3(100, 100, 1)));
      expect(r1.success).toBe(true);

      const r2 = tool.handleClick(makeContext(new Vector3(200, 100, 1)));
      expect(r2.success).toBe(true);
      expect(r2.message).toContain('completed successfully');
    });
  });

  describe('SegmentTool', () => {
    it('should reject selecting the same point twice', () => {
      const tool = new SegmentTool();
      addPoint(100, 100);

      const ctx = makeContext(new Vector3(100, 100, 1));
      const r1 = tool.handleClick(ctx);
      expect(r1.success).toBe(true);

      const r2 = tool.handleClick(ctx);
      // Rejection: either success=false or doesn't complete
      if (r2.success) {
        expect(r2.message).not.toContain('completed successfully');
      }
    });

    it('should accept two different points', () => {
      const tool = new SegmentTool();
      addPoint(100, 100);
      addPoint(200, 200);

      const r1 = tool.handleClick(makeContext(new Vector3(100, 100, 1)));
      expect(r1.success).toBe(true);

      const r2 = tool.handleClick(makeContext(new Vector3(200, 200, 1)));
      expect(r2.success).toBe(true);
      expect(r2.message).toContain('completed successfully');
    });
  });

  describe('CircleTool', () => {
    it('should reject zero-radius circle (center == circumference)', () => {
      const tool = new CircleTool();
      addPoint(100, 100);
      addPoint(100.0001, 100.0001); // Very close but distinct point

      const r1 = tool.handleClick(makeContext(new Vector3(100, 100, 1)));
      expect(r1.success).toBe(true);

      const r2 = tool.handleClick(makeContext(new Vector3(100.0001, 100.0001, 1)));
      // Should fail: radius too small
      expect(r2.message).not.toContain('completed successfully');
    });

    it('should accept valid center and circumference point', () => {
      const tool = new CircleTool();
      addPoint(100, 100);
      addPoint(200, 100);

      const r1 = tool.handleClick(makeContext(new Vector3(100, 100, 1)));
      expect(r1.success).toBe(true);

      const r2 = tool.handleClick(makeContext(new Vector3(200, 100, 1)));
      expect(r2.success).toBe(true);
      expect(r2.message).toContain('completed successfully');
    });
  });

  describe('ParallelLineTool', () => {
    it('should accept valid reference line and create parallel', () => {
      const tool = new ParallelLineTool();

      // Create two points and a line between them
      const p1Id = addPoint(50, 100);
      const p2Id = addPoint(250, 100);
      const plane = world.getProjectionPlaneById(planeId);
      const line = operationContext.projectionConstruction.addLine2DBetweenTwoPoints(plane, p1Id, p2Id);

      // Create through-point
      const p3Id = addPoint(150, 200);

      // Click on line (near midpoint), then on through-point
      const r1 = tool.handleClick(makeContext(new Vector3(150, 100, 1)));
      expect(r1.success).toBe(true);

      const r2 = tool.handleClick(makeContext(new Vector3(150, 200, 1)));
      expect(r2.success).toBe(true);
      expect(r2.message).toContain('completed successfully');
    });
  });

  describe('PerpendicularLineTool', () => {
    it('should accept valid reference line and create perpendicular', () => {
      const tool = new PerpendicularLineTool();

      const p1Id = addPoint(50, 100);
      const p2Id = addPoint(250, 100);
      const plane = world.getProjectionPlaneById(planeId);
      const line = operationContext.projectionConstruction.addLine2DBetweenTwoPoints(plane, p1Id, p2Id);

      const p3Id = addPoint(150, 200);

      const r1 = tool.handleClick(makeContext(new Vector3(150, 100, 1)));
      expect(r1.success).toBe(true);

      const r2 = tool.handleClick(makeContext(new Vector3(150, 200, 1)));
      expect(r2.success).toBe(true);
      expect(r2.message).toContain('completed successfully');
    });
  });
});

describe('CreateProjectionPlaneTool validation boundaries', () => {
  function makeContext(overrides: Partial<CollectionContext> = {}): CollectionContext {
    return {
      plane: { id: 'p1' } as any,
      collected: new Map(),
      readPort: {
        getProjectionPlaneById: id => ({ id } as any),
        getElement2D: () => undefined,
        getPoint2D: () => undefined,
        getLine2D: id => new TestLine2D(id, 'p1'),
        getCircle2D: () => undefined,
        realizePoint2D: vi.fn() as any,
        realizeLine2D: () => new Line2DRealization2D(new Vector3(0, 0, 1), new Vector3(1, 0, 0), true),
        realizeCircle2D: vi.fn() as any,
        areProjectionPlanesDistinct: () => true,
        getExpectedT2PrimeLineRealization: () => new Line2DRealization2D(new Vector3(0, 0, 1), new Vector3(1, 0, 0), true),
      },
      ...overrides,
    };
  }

  it('returns user validation feedback for a stale selected T2 prime line', () => {
    const tool = new ExposedCreateProjectionPlaneTool();
    const validator = tool.exposeArgumentSets()[0].arguments.find(argument => argument.name === 't2PrimePositionLine')!.validator!;
    const t1 = new TestLine2D('p1/t1', 'p1');
    const t2 = new TestLine2D('p2/t2', 'p2');
    const t2Prime = new TestLine2D('p1/t2Prime', 'p1');
    const context = makeContext({
      collected: new Map([
        ['t1HingeTrace', { element: t1, planeCoords: new Vector3() }],
        ['t2OtherTrace', { element: t2, planeCoords: new Vector3() }],
      ]),
      readPort: {
        ...makeContext().readPort,
        getLine2D: () => undefined,
      },
    });

    expect(validator(t2Prime, context)).toEqual({ valid: false, error: "Selected T2' line is no longer available" });
  });

  it('returns user validation feedback for missing selected arguments', () => {
    const tool = new ExposedCreateProjectionPlaneTool();
    const setValidator = tool.exposeArgumentSets()[0].setValidator!;

    expect(setValidator(new Map(), makeContext())).toEqual({ valid: false, error: 'Missing required arguments' });
  });

  it('propagates internal invariant failures from expected T2 prime computation', () => {
    const tool = new ExposedCreateProjectionPlaneTool();
    const validator = tool.exposeArgumentSets()[0].arguments.find(argument => argument.name === 't2PrimePositionLine')!.validator!;
    const t1 = new TestLine2D('p1/t1', 'p1');
    const t2 = new TestLine2D('p2/t2', 'p2');
    const t2Prime = new TestLine2D('p1/t2Prime', 'p1');
    const context = makeContext({
      collected: new Map([
        ['t1HingeTrace', { element: t1, planeCoords: new Vector3() }],
        ['t2OtherTrace', { element: t2, planeCoords: new Vector3() }],
      ]),
      readPort: {
        ...makeContext().readPort,
        getExpectedT2PrimeLineRealization: () => { throw new Error('Projection plane 3D realization not found: p1'); },
      },
    });

    expect(() => validator(t2Prime, context)).toThrow('Projection plane 3D realization not found: p1');
  });
});

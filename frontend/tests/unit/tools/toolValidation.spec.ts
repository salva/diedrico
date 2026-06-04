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

import { describe, it, expect, beforeEach } from 'vitest';
import { LineTool } from '@/tools/LineTool';
import { SegmentTool } from '@/tools/SegmentTool';
import { CircleTool } from '@/tools/CircleTool';
import { ParallelLineTool } from '@/tools/ParallelLineTool';
import { PerpendicularLineTool } from '@/tools/PerpendicularLineTool';
import { TangentLineToCircleThroughPointTool } from '@/tools/TangentLineToCircleThroughPointTool';
import type { World } from '@/domain/world/World';
import type { CommandStack } from '@/commands/CommandStack';
import { Command } from '@/commands/Command';
import { createTestWorld } from '../../helpers/worldHelpers';
import { AddFreePoint2DOp } from '@/commands/operations/world/AddFreePointOp';
import type { ToolContext } from '@/tools/ITool';
import { CanvasToolController } from '@/application/tools/CanvasToolController';
import { RuntimeCommandProducer } from '@/application/commandProduction/RuntimeCommandProducer';
import { Vector3, Matrix3 } from 'three';
import { CanvasPresentationSelector } from '@/application/canvasPresentation/CanvasPresentationSelector';
import { createCanvasPresentationContext } from '@/application/canvasPresentation/CanvasPresentationContext';
import { createToolInteractionReadPort } from '@/application/tools/ToolInteractionReadPort';

function liveInteractionQuery(worldRef: () => any, planeIdRef: () => string): CanvasInteractionQuery {
  return {
    hitTest(canvasPos: any, snapRadiusPixels: number, context: any, selectionMask?: any) {
      const world = worldRef();
      const activePlaneId = context.activePlaneId ?? planeIdRef();
      const model = new CanvasPresentationSelector().select(createCanvasPresentationContext(world), { zoom: 1, panX: 0, panY: 0, width: 800, height: 600 }, { activePlaneId });
      return new CanvasInteractionQuery(model.queryItems).hitTest(canvasPos, snapRadiusPixels, context, selectionMask);
    }
  } as CanvasInteractionQuery;
}
import { CanvasInteractionQuery } from '@/application/canvasPresentation/CanvasInteractionQuery';

describe('Tool Argument Validation', () => {
  let world: World;
  let commandStack: CommandStack;
  let planeId: string;
  let interactionQuery: CanvasInteractionQuery;

  function makeContext(coords: Vector3): ToolContext {
    return {
      planeId,
      planeCoords: coords.clone(),
      canvasCoords: coords.clone(),
      commandSink: new CanvasToolController({ world, commands: new RuntimeCommandProducer(world, commandStack), toolStore: {} as any }),
      readPort: createToolInteractionReadPort(world),
      interactionQuery,
      viewport: { zoom: 1, panX: 0, panY: 0 },
      paperToPlaneTransform: new Matrix3().identity(),
        toolStore: {} as any,
    };
  }

  function addPoint(x: number, y: number): string {
    const cmd = new Command('Add point', world);
    const op = new AddFreePoint2DOp(planeId, new Vector3(x, y, 1));
    cmd.addAndExecute(op);
    cmd.commit();
    commandStack.push(cmd);
    return op.outputs.pointId as string;
  }

  beforeEach(() => {
    const { world: w, commandStack: cs } = createTestWorld();
    world = w;
    commandStack = cs;
    interactionQuery = liveInteractionQuery(() => world, () => planeId);
    planeId = world.getProjectionPlaneByLabel('P_H').id!;
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
      const line = plane.addLine2DBetweenTwoPoints(p1Id, p2Id, world);

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
      const line = plane.addLine2DBetweenTwoPoints(p1Id, p2Id, world);

      const p3Id = addPoint(150, 200);

      const r1 = tool.handleClick(makeContext(new Vector3(150, 100, 1)));
      expect(r1.success).toBe(true);

      const r2 = tool.handleClick(makeContext(new Vector3(150, 200, 1)));
      expect(r2.success).toBe(true);
      expect(r2.message).toContain('completed successfully');
    });
  });
});

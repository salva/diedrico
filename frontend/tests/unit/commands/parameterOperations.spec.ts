import { CanvasToolController } from '@/application/tools/CanvasToolController';
import { RuntimeCommandProducer } from '@/application/commandProduction/RuntimeCommandProducer';
import { describe, it, expect } from 'vitest';
import { Vector3 } from 'three';
import { createTestWorld, getHorizontalPlane } from '../../helpers/worldHelpers';
import { AddCircle2DByCenterAndRadiusVectorOp, UpdateCircle2DRadiusVectorOp } from '@/commands/operations/world/AddCircleOp';
import { AddLine2DByPointAndRelativeAngleOp, UpdateLine2DRelativeAngleOp } from '@/commands/operations/world/AddLineOp';
import { deserializeOperation, serializeOperation } from '@/commands/operations/OperationRegistry';

describe('parameter operation replay and undo', () => {
  it('preserves IDs, updates realizations, and restores parameters on undo', () => {
    const { world, commandStack, operationContext: ctx } = createTestWorld();
    const plane = getHorizontalPlane(world);
    const a = ctx.projectionConstruction.addFreePoint2D(plane, new Vector3(0, 0, 1));
    const b = ctx.projectionConstruction.addFreePoint2D(plane, new Vector3(10, 0, 1));
    const ref = ctx.projectionConstruction.addLine2DBetweenTwoPoints(plane, a.id, b.id);
    const circle = new AddCircle2DByCenterAndRadiusVectorOp(plane.id, a.id, new Vector3(5, 0, 0));
    const line = new AddLine2DByPointAndRelativeAngleOp(plane.id, ref.id, a.id, 0);
    expect(circle.apply(ctx).success).toBe(true);
    expect(line.apply(ctx).success).toBe(true);
    const cid = circle.outputs.circleId!;
    const controller = new CanvasToolController({ operationContext: ctx, commands: new RuntimeCommandProducer(ctx, commandStack) });
    expect(controller.updateElementParameter({ planeId: plane.id, elementId: cid, parameter: { kind: 'radius', value: -5 } }).success).toBe(false);
    const lid = line.outputs.lineId!;
    const radius = () => plane.getCircle(cid)!.realize2D(ctx.realizationContext).getRadius();
    const direction = () => plane.getLine(lid)!.realize2D(ctx.realizationContext).getDirection().normalize();
    expect(radius()).toBeCloseTo(5);
    expect(Math.abs(direction().x)).toBeCloseTo(1);
    for (const op of [circle, line]) {
      const restored = deserializeOperation(JSON.parse(JSON.stringify(serializeOperation(op))));
      op.undo(ctx);
      expect(restored.apply(ctx).success).toBe(true);
    }
    const updates = [
      new UpdateCircle2DRadiusVectorOp(plane.id, cid, new Vector3(9, 0, 0)),
      new UpdateLine2DRelativeAngleOp(plane.id, lid, Math.PI / 2),
    ].map(op => deserializeOperation(JSON.parse(JSON.stringify(serializeOperation(op)))));
    for (const op of updates) expect(op.apply(ctx).success).toBe(true);
    expect(radius()).toBeCloseTo(9);
    expect(Math.abs(direction().y)).toBeCloseTo(1);
    for (const op of updates) op.undo(ctx);
    expect(radius()).toBeCloseTo(5);
    expect(Math.abs(direction().x)).toBeCloseTo(1);
  });
});

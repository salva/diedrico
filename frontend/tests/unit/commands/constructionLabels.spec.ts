import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { createTestWorld } from '../../helpers/worldHelpers';
import { AddFreePoint2DOp } from '@/commands/operations/world/AddFreePointOp';
import { AddLine2DByTwoPointsOp, AddLine2DParallelToLineOp, AddLine2DPerpendicularToLineOp, AddLine2DByPointAndRelativeAngleOp, AddLine2DTangentToCircleThroughPointOp, AddLine2DTangentToCircleParallelToLineOp } from '@/commands/operations/world/AddLineOp';
import { AddSegment2DByPointsOp } from '@/commands/operations/world/AddSegmentOp';
import { AddCircle2DByCenterAndPointOp, AddCircle2DByCenterAndRadiusVectorOp } from '@/commands/operations/world/AddCircleOp';
import { deserializeOperation, serializeOperation } from '@/commands/operations/OperationRegistry';
import type { IOperation } from '@/commands/operations/IOperation';

describe('construction label identity', () => {
  it('reserves replayed reconstruction IDs before allocating new elements', () => {
    const { operationContext: ctx } = createTestWorld();
    const params = { projection1Id: 'unused/a', projection2Id: 'unused/b', plane1Id: 'a', plane2Id: 'b' };
    const restored = ctx.reconstructionConstruction.addPointFromProjections({ ...params, pointId: 'point3d7' });
    const next = ctx.reconstructionConstruction.addPointFromProjections(params);
    expect(next.id).toBe('point3d8');
    expect(ctx.world.get3DPoint(restored.id)).toBe(restored);
    for (const [prefix, generate] of [
      ['line3d', () => ctx.idAllocator.generate3DLineId()],
      ['segment3d', () => ctx.idAllocator.generate3DSegmentId()],
      ['plane3d', () => ctx.idAllocator.generate3DPlaneId()],
    ] as const) {
      ctx.idAllocator.reserve3DId(`${prefix}9`);
      expect(generate()).toBe(`${prefix}10`);
    }
  });

  it('preserves labels through redo and descriptor replay after abandoned labels', () => {
    const { world, operationContext: ctx } = createTestWorld();
    const plane = world.getAllProjectionPlanes()[0];
    const seedDescriptors = [];
    const point = (x: number, y: number) => {
      const op = new AddFreePoint2DOp(plane.id, new Vector3(x, y, 1));
      expect(op.apply(ctx).success).toBe(true);
      seedDescriptors.push(serializeOperation(op));
      return op.outputs.pointId!;
    };
    const a = point(0, 0), b = point(10, 0), c = point(20, 20);
    const base = new AddLine2DByTwoPointsOp(plane.id, a, b);
    expect(base.apply(ctx).success).toBe(true);
    const circle = new AddCircle2DByCenterAndPointOp(plane.id, a, b);
    expect(circle.apply(ctx).success).toBe(true);
    const descriptors = [serializeOperation(base), serializeOperation(circle)];
    const ops: IOperation[] = [
      new AddFreePoint2DOp(plane.id, new Vector3(30, 40, 1)),
      new AddLine2DByTwoPointsOp(plane.id, a, c),
      new AddLine2DParallelToLineOp(plane.id, base.outputs.lineId!, c),
      new AddLine2DPerpendicularToLineOp(plane.id, base.outputs.lineId!, c),
      new AddLine2DByPointAndRelativeAngleOp(plane.id, base.outputs.lineId!, c, 0.4),
      new AddLine2DTangentToCircleThroughPointOp(plane.id, circle.outputs.circleId!, c, 0),
      new AddLine2DTangentToCircleParallelToLineOp(plane.id, circle.outputs.circleId!, base.outputs.lineId!, 0),
      new AddSegment2DByPointsOp(plane.id, a, c),
      new AddCircle2DByCenterAndPointOp(plane.id, a, c),
      new AddCircle2DByCenterAndRadiusVectorOp(plane.id, a, new Vector3(15, 0, 0)),
    ];
    for (const op of ops) {
      for (let i = 0; i < 30; i++) {
        ctx.labelGenerator.next('Point2D'); ctx.labelGenerator.next('Line2D'); ctx.labelGenerator.next('Circle2D');
      }
      expect(op.apply(ctx).success, op.type).toBe(true);
      const descriptor = serializeOperation(op);
      expect(typeof descriptor.label, op.type).toBe('string');
      descriptors.push(descriptor);
      op.undo(ctx);
      expect(op.apply(ctx).success).toBe(true);
      expect(serializeOperation(op).label).toBe(descriptor.label);
      op.undo(ctx);
      const restored = deserializeOperation(JSON.parse(JSON.stringify(descriptor)));
      expect(restored.apply(ctx).success).toBe(true);
      expect(serializeOperation(restored).label).toBe(descriptor.label);
    }
    const fresh = createTestWorld();
    for (const descriptor of [...seedDescriptors, ...descriptors]) {
      const restored = deserializeOperation(JSON.parse(JSON.stringify(descriptor)));
      expect(restored.apply(fresh.operationContext).success, descriptor.opType).toBe(true);
      expect(serializeOperation(restored).label).toBe(descriptor.label);
    }
  });
});

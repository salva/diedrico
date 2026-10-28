import { describe, it, expect } from 'vitest';
import { Vector3, Vector4 } from 'three';
import { createTestWorld, getHorizontalPlane } from '../../helpers/worldHelpers';
import { Point3DByCoordinates, Point3DFromProjectionOnPlane, Point3DByPlaneNormalOffset } from '@/domain/world/Point3D';
import { Segment3DByPoints } from '@/domain/world/Segment3D';
import { createVisualStyle } from '@/domain/world/VisualStyle';

describe('preparatory 3D primitives (domain only)', () => {
  it('lifts projection points, offsets along signed normals and realizes endpoint segments', () => {
    const { world, operationContext: ctx } = createTestWorld();
    const plane = getHorizontalPlane(world);
    const a = ctx.projectionConstruction.addFreePoint2D(plane, new Vector3(2, 3, 1));
    const b = ctx.projectionConstruction.addFreePoint2D(plane, new Vector3(5, 7, 1));
    const segment = ctx.projectionConstruction.addSegment2DBetweenPoints(plane, a.id, b.id);
    const lifted = new Point3DFromProjectionOnPlane('lifted', 'A', a.id, plane.id, createVisualStyle());
    world.putPoint3D(lifted);
    const foot = lifted.realize3D(ctx.realizationContext);
    expect(foot.feasible).toBe(true);
    const sourcePlane = world.getAllPlanes().find(p => p.realize3D(ctx.realizationContext).getNormalVector().z !== 0)!;
    const plus = new Point3DByPlaneNormalOffset('plus', 'B', lifted.id, sourcePlane.id, segment.id, plane.id, 1, createVisualStyle());
    const minus = new Point3DByPlaneNormalOffset('minus', 'C', lifted.id, sourcePlane.id, segment.id, plane.id, -1, createVisualStyle());
    const p = plus.realize3D(ctx.realizationContext);
    const m = minus.realize3D(ctx.realizationContext);
    expect(p.feasible).toBe(true);
    expect(Math.hypot(p.position.x - foot.position.x, p.position.y - foot.position.y, p.position.z - foot.position.z)).toBeCloseTo(5);
    expect(p.position.z + m.position.z).toBeCloseTo(2 * foot.position.z);
    world.putPoint3D(new Point3DByCoordinates('end', 'D', new Vector4(1, 2, 3, 1), createVisualStyle()));
    const edge = new Segment3DByPoints('edge', 's', lifted.id, 'end', createVisualStyle());
    expect(edge.realize3D(ctx.realizationContext).feasible).toBe(true);
    expect(edge.clone().getDependencies()).toEqual([lifted.id, 'end']);
    world.deletePoint3D('end');
    expect(edge.realize3D(ctx.realizationContext).feasible).toBe(false);
  });
});

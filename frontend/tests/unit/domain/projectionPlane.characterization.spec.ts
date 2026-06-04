import { describe, expect, it } from 'vitest';
import { Matrix3, Vector3 } from 'three';
import { Circle2DRealization2D } from '@/domain/world/Circle';
import { Line2DRealization2D } from '@/domain/world/Line';
import { Point2DRealization2D } from '@/domain/world/Point';
import { AuxiliaryProjectionPlane } from '@/domain/world/projectionPlane/AuxiliaryProjectionPlane';
import type { ProjectionPlane } from '@/domain/world/projectionPlane/ProjectionPlane';
import { mat4x3 } from '@/utils/threeUtils';
import { createTestWorld, getHorizontalPlane } from '../../helpers/worldHelpers';

function matrix3Elements(matrix: Matrix3): number[] {
  return matrix.elements.map(value => Number(value.toFixed(12)));
}

function createLineCircleFixture(plane: ProjectionPlane, world: ReturnType<typeof createTestWorld>['world']) {
  const p1 = plane.addFreePoint2D(new Vector3(0, 0, 1), world);
  const p2 = plane.addFreePoint2D(new Vector3(10, 0, 1), world);
  const p3 = plane.addFreePoint2D(new Vector3(0, 10, 1), world);
  const line = plane.addLine2DBetweenTwoPoints(p1.id, p2.id, world);
  const circle = plane.addCircle2DByCenterAndPoint(p1.id, p3.id, world);

  return { p1, p2, p3, line, circle };
}

describe('ProjectionPlane characterization before responsibility extraction', () => {
  it('registers dependencies when points, lines, and circles are added', () => {
    const { world } = createTestWorld();
    const plane = getHorizontalPlane(world);
    const { p1, p2, p3, line, circle } = createLineCircleFixture(plane, world);
    const intersection = plane.addLineCircleIntersection(line.id, circle.id, 0, world);
    const dependencyQuery = world.getDependencyQuery();

    expect(dependencyQuery.getDependencies(p1.id)).toEqual([]);
    expect(dependencyQuery.getDependencies(line.id)).toEqual([p1.id, p2.id]);
    expect(dependencyQuery.getDependencies(circle.id)).toEqual([p1.id, p3.id]);
    expect(dependencyQuery.getDependencies(intersection.id)).toEqual([line.id, circle.id]);
    expect(dependencyQuery.getDependents(p1.id)).toEqual([line.id, circle.id]);
    expect(dependencyQuery.getDependents(line.id)).toEqual([intersection.id]);
    expect(dependencyQuery.getDependents(circle.id)).toEqual([intersection.id]);
  });

  it('clears point, line, and circle realization caches through the plane-level facade', () => {
    const { world } = createTestWorld();
    const plane = getHorizontalPlane(world);
    const { p1, p2 } = createLineCircleFixture(plane, world);

    plane.setPointRealization2D(p1.id, new Point2DRealization2D(new Vector3(1, 2, 1)));
    plane.setLineRealization2D(p1.id, new Line2DRealization2D(new Vector3(0, 0, 1), new Vector3(1, 0, 0)));
    plane.setCircleRealization2D(p1.id, new Circle2DRealization2D(new Vector3(0, 0, 1), new Vector3(1, 0, 0)));
    plane.setPointRealization2D(p2.id, new Point2DRealization2D(new Vector3(3, 4, 1)));

    plane.clearRealizationCaches(p1.id);

    expect(plane.getPointRealization2D(p1.id)).toBeUndefined();
    expect(plane.getLineRealization2D(p1.id)).toBeUndefined();
    expect(plane.getCircleRealization2D(p1.id)).toBeUndefined();
    expect(plane.getPointRealization2D(p2.id)).toBeDefined();
  });

  it('keeps fixed projection plane 2D and 3D realization values stable across calls', () => {
    const { world } = createTestWorld();
    const plane = getHorizontalPlane(world);

    const first2D = plane.realize2D(world);
    const second2D = plane.realize2D(world);
    const first3D = plane.realize3D(world);
    const second3D = plane.realize3D(world);

    expect(second2D.planeId).toBe(first2D.planeId);
    expect(second2D.feasible).toBe(first2D.feasible);
    expect(matrix3Elements(second2D.planeToPaper2D)).toEqual(matrix3Elements(first2D.planeToPaper2D));
    expect(matrix3Elements(second2D.paperToPlane2D)).toEqual(matrix3Elements(first2D.paperToPlane2D));
    expect(second3D.planeId).toBe(first3D.planeId);
    expect(second3D.feasible).toBe(first3D.feasible);
    expect(second3D.planeTo3D.toArray()).toEqual(first3D.planeTo3D.toArray());
    expect(second3D.threeDToPlane.toArray()).toEqual(first3D.threeDToPlane.toArray());
  });

  it('returns infeasible fallback realizations for an auxiliary plane with missing dependencies', () => {
    const { world } = createTestWorld();
    const plane = new AuxiliaryProjectionPlane(
      'auxiliary-plane',
      'Auxiliary Plane',
      'missing-t1',
      'missing-t2',
      'missing-t2-prime'
    );

    const realization2D = plane.realize2D(world);
    const realization3D = plane.realize3D(world);

    expect(plane.getDependencies()).toEqual(['missing-t1', 'missing-t2', 'missing-t2-prime']);
    expect(realization2D.planeId).toBe(plane.id);
    expect(realization2D.feasible).toBe(false);
    expect(matrix3Elements(realization2D.planeToPaper2D)).toEqual(matrix3Elements(new Matrix3().identity()));
    expect(matrix3Elements(realization2D.paperToPlane2D)).toEqual(matrix3Elements(new Matrix3().identity()));
    expect(realization3D.planeId).toBe(plane.id);
    expect(realization3D.feasible).toBe(false);
    expect(realization3D.planeTo3D.toArray()).toEqual(mat4x3(1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0).toArray());
  });

  it('preserves element lookup and getAll insertion order shape for plane-owned elements', () => {
    const { world } = createTestWorld();
    const plane = getHorizontalPlane(world);
    const initialPointCount = plane.getAllPoints().length;
    const initialLineCount = plane.getAllLines().length;

    const p1 = plane.addFreePoint2D(new Vector3(1, 1, 1), world);
    const p2 = plane.addFreePoint2D(new Vector3(5, 1, 1), world);
    const line = plane.addLine2DBetweenTwoPoints(p1.id, p2.id, world);
    const circle = plane.addCircle2DByCenterAndPoint(p1.id, p2.id, world);

    expect(plane.getPoint(p1.id)).toBe(p1);
    expect(plane.getLine(line.id)).toBe(line);
    expect(plane.getCircle(circle.id)).toBe(circle);
    expect(world.getElement2D(p1.id)).toBe(p1);
    expect(world.getElement2D(line.id)).toBe(line);
    expect(world.getElement2D(circle.id)).toBe(circle);
    expect(world.getPlaneForElement(circle.id)).toBe(plane);
    expect(plane.getAllPoints()).toHaveLength(initialPointCount + 2);
    expect(plane.getAllPoints().slice(-2)).toEqual([p1, p2]);
    expect(plane.getAllLines()).toHaveLength(initialLineCount + 1);
    expect(plane.getAllLines().at(-1)).toBe(line);
    expect(plane.getAllCircles()).toEqual([circle]);
  });
});

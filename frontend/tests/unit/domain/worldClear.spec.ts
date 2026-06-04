import { describe, expect, it } from 'vitest';
import { Matrix3, Vector3, Vector4 } from 'three';
import { World } from '@/domain/world/World';
import { Point3DByCoordinates } from '@/domain/world/Point3D';
import { Line3DFromProjections } from '@/domain/world/Line3D';
import { Segment3DFromProjections } from '@/domain/world/Segment3D';
import { Plane3DFromTraces } from '@/domain/world/Plane';
import { Matrix4x3 } from '@/utils/threeUtils';
import { createVisualStyle } from '@/domain/world/VisualStyle';

function planeToPaper(): Matrix3 {
  return new Matrix3().identity();
}

function horizontalPlaneTo3D(): Matrix4x3 {
  return new Matrix4x3().set(
    1, 0, 0,
    0, 1, 0,
    0, 0, 0,
    0, 0, 1
  );
}

function verticalPlaneTo3D(): Matrix4x3 {
  return new Matrix4x3().set(
    1, 0, 0,
    0, 0, 0,
    0, 1, 0,
    0, 0, 1
  );
}

describe('World clear', () => {
  it('clears world-owned storage, realizations, dependencies, process state, ids, and labels', () => {
    const world = new World();

    const firstPlane3DId = world.generatePlaneId();
    const firstPoint3DId = world.generate3DPointId();
    const firstLine3DId = world.generate3DLineId();
    const firstSegment3DId = world.generate3DSegmentId();
    const firstUserPlane3DId = world.generate3DPlaneId();
    const firstPointLabel = world.generateDefaultLabel(firstPoint3DId, 'Point3D');

    const planeH3D = world.addPlane3DFixed(new Vector4(0, 0, 0, 1), new Vector4(0, 0, 1, 0), firstPlane3DId, 'P_H');
    const planeV3D = world.addPlane3DFixed(new Vector4(0, 0, 0, 1), new Vector4(0, 1, 0, 0), undefined, 'P_V');
    const planeH = world.addProjectionPlane(planeH3D.id, planeToPaper(), horizontalPlaneTo3D(), undefined, 'P_H');
    const planeV = world.addProjectionPlane(planeV3D.id, planeToPaper(), verticalPlaneTo3D(), undefined, 'P_V');
    const hingeLine = world.addHingeLine(planeH.id, planeV.id);
    const halfHingeLine = world.getConstructionService().addHalfHingeLine2D(planeH, hingeLine.id);

    const p1 = world.getConstructionService().addFreePoint2D(planeH, new Vector3(0, 0, 1));
    const p2 = world.getConstructionService().addFreePoint2D(planeH, new Vector3(1, 0, 1));
    const p3 = world.getConstructionService().addFreePoint2D(planeV, new Vector3(0, 0, 1));
    const p4 = world.getConstructionService().addFreePoint2D(planeV, new Vector3(1, 0, 1));
    const lineH = world.getConstructionService().addLine2DBetweenTwoPoints(planeH, p1.id, p2.id);
    const lineV = world.getConstructionService().addLine2DBetweenTwoPoints(planeV, p3.id, p4.id);
    const segmentH = world.getConstructionService().addSegment2DBetweenPoints(planeH, p1.id, p2.id);
    const segmentV = world.getConstructionService().addSegment2DBetweenPoints(planeV, p3.id, p4.id);

    const point3D = new Point3DByCoordinates(firstPoint3DId, 'A', new Vector4(1, 2, 3, 1), createVisualStyle());
    const line3D = new Line3DFromProjections(firstLine3DId, 'r', lineH.id, lineV.id, planeH.id, planeV.id, createVisualStyle());
    const segment3D = new Segment3DFromProjections(firstSegment3DId, 's', segmentH.id, segmentV.id, planeH.id, planeV.id, createVisualStyle());
    const userPlane3D = new Plane3DFromTraces(firstUserPlane3DId, 'Q', lineH.id, lineV.id, planeH.id, planeV.id);

    world.add3DPoint(point3D);
    world.add3DLine(line3D);
    world.add3DSegment(segment3D);
    world.add3DPlane(userPlane3D);
    const subprocess = world.getProcessTree().addSubprocess('test subprocess');

    expect(world.getProjectionPlane3DRealization(planeH.id)).toBeDefined();
    expect(world.get3DPointRealization(point3D.id)).toBeDefined();
    expect(world.get3DLineRealization(line3D.id)).toBeDefined();
    expect(world.get3DSegmentRealization(segment3D.id)).toBeDefined();
    expect(world.get3DPlaneRealization(userPlane3D.id)).toBeDefined();
    expect(world.getDependencyQuery().getDependencies(line3D.id)).toContain(lineH.id);
    expect(world.getDependencyQuery().getDependents(hingeLine.id)).toContain(halfHingeLine.id);
    expect(world.getProcessTree().findSubprocessById(subprocess.id)).toBeDefined();

    world.clear();

    expect(world.getAllProjectionPlanes()).toEqual([]);
    expect(world.getAllHingeLines()).toEqual([]);
    expect(world.getAllPlanes()).toEqual([]);
    expect(world.getAll3DPoints()).toEqual([]);
    expect(world.getAll3DLines()).toEqual([]);
    expect(world.getAll3DSegments()).toEqual([]);
    expect(world.getElement2D(p1.id)).toBeUndefined();
    expect(world.getElement2D(lineH.id)).toBeUndefined();
    expect(world.getProjectionPlane3DRealization(planeH.id)).toBeUndefined();
    expect(world.get3DPointRealization(point3D.id)).toBeUndefined();
    expect(world.get3DLineRealization(line3D.id)).toBeUndefined();
    expect(world.get3DSegmentRealization(segment3D.id)).toBeUndefined();
    expect(world.get3DPlaneRealization(userPlane3D.id)).toBeUndefined();
    expect(world.getDependencyQuery().getDependencies(line3D.id)).toEqual([]);
    expect(world.getDependencyQuery().getDependents(hingeLine.id)).toEqual([]);
    expect(world.getProcessTree().root.children).toEqual([]);
    expect(world.getProcessTree().findSubprocessById(subprocess.id)).toBeUndefined();

    expect(world.generatePlaneId()).toBe(new World().generatePlaneId());
    expect(world.generate3DPointId()).toBe(firstPoint3DId);
    expect(world.generate3DLineId()).toBe(firstLine3DId);
    expect(world.generate3DSegmentId()).toBe(firstSegment3DId);
    expect(world.generate3DPlaneId()).toBe(firstUserPlane3DId);
    expect(world.generateDefaultLabel('point3d1', 'Point3D')).toBe(firstPointLabel);
  });
});

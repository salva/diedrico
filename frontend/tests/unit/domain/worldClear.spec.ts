import { describe, expect, it } from 'vitest';
import { Matrix3, Vector3, Vector4 } from 'three';
import { World } from '@/domain/world/World';
import { LabelGenerator } from '@/domain/world/LabelGenerator';
import { WorldIdAllocator } from '@/domain/world/WorldIdAllocator';
import { Point3DByCoordinates } from '@/domain/world/Point3D';
import { Line3DFromProjections } from '@/domain/world/Line3D';
import { Segment3DFromProjections } from '@/domain/world/Segment3D';
import { Plane3DFromTraces } from '@/domain/world/Plane';
import { Matrix4x3 } from '@/utils/threeUtils';
import { createVisualStyle } from '@/domain/world/VisualStyle';
import { createTestRuntimeContext, getElement2D } from '../../helpers/worldHelpers';
import { VisibilityModel } from '@/application/processTree/VisibilityModel';
import { RealizationService } from '@/domain/world/RealizationService';
import { GeometryElementLookup } from '@/domain/world/GeometryElementLookup';

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
  it('clears world-owned storage and realizations without clearing process state', () => {
    const ids = new WorldIdAllocator();
    const labels = new LabelGenerator();
    const realizations = new RealizationService();
    const world = new World();
    const context = createTestRuntimeContext({ initialized: false, world, visibilityModel: new VisibilityModel(), ids, labels, realizations }).operationContext;
    const realizationContext = context.realizationContext;
    const processTree = context.processTree;
    const projectionConstruction = context.projectionConstruction;

    const firstPlane3DId = context.idAllocator.prefixed('plane');
    const firstPoint3DId = 'point3d-fixture';
    const firstLine3DId = 'line3d-fixture';
    const firstSegment3DId = 'segment3d-fixture';
    const firstUserPlane3DId = 'plane3d-fixture';

    const planeH3D = context.projectionPlaneConstruction.addFixed3DPlane({ point: new Vector4(0, 0, 0, 1), normal: new Vector4(0, 0, 1, 0), planeId: firstPlane3DId, label: 'P_H' });
    const planeV3D = context.projectionPlaneConstruction.addFixed3DPlane({ point: new Vector4(0, 0, 0, 1), normal: new Vector4(0, 1, 0, 0), label: 'P_V' });
    const planeH = context.projectionPlaneConstruction.addFixedProjectionPlane({ plane3DId: planeH3D.id, planeToPaper2D: planeToPaper(), planeTo3D: horizontalPlaneTo3D(), name: 'P_H' });
    const planeV = context.projectionPlaneConstruction.addFixedProjectionPlane({ plane3DId: planeV3D.id, planeToPaper2D: planeToPaper(), planeTo3D: verticalPlaneTo3D(), name: 'P_V' });
    const hingeLine = context.projectionPlaneConstruction.addHingeLine({ horizontalPlaneId: planeH.id, verticalPlaneId: planeV.id });
    const halfHingeLine = projectionConstruction.addHalfHingeLine2D(planeH, hingeLine.id);

    const p1 = projectionConstruction.addFreePoint2D(planeH, new Vector3(0, 0, 1));
    const p2 = projectionConstruction.addFreePoint2D(planeH, new Vector3(1, 0, 1));
    const p3 = projectionConstruction.addFreePoint2D(planeV, new Vector3(0, 0, 1));
    const p4 = projectionConstruction.addFreePoint2D(planeV, new Vector3(1, 0, 1));
    const lineH = projectionConstruction.addLine2DBetweenTwoPoints(planeH, p1.id, p2.id);
    const lineV = projectionConstruction.addLine2DBetweenTwoPoints(planeV, p3.id, p4.id);
    const segmentH = projectionConstruction.addSegment2DBetweenPoints(planeH, p1.id, p2.id);
    const segmentV = projectionConstruction.addSegment2DBetweenPoints(planeV, p3.id, p4.id);

    const point3D = new Point3DByCoordinates(firstPoint3DId, 'A', new Vector4(1, 2, 3, 1), createVisualStyle());
    const line3D = new Line3DFromProjections(firstLine3DId, 'r', lineH.id, lineV.id, planeH.id, planeV.id, createVisualStyle());
    const segment3D = new Segment3DFromProjections(firstSegment3DId, 's', segmentH.id, segmentV.id, planeH.id, planeV.id, createVisualStyle());
    const userPlane3D = new Plane3DFromTraces(firstUserPlane3DId, 'Q', lineH.id, lineV.id, planeH.id, planeV.id);

    world.putPoint3D(point3D);
    world.putLine3D(line3D);
    world.putSegment3D(segment3D);
    world.putPlane3D(userPlane3D);
    context.dependencies.registerNode(line3D.id, line3D.getDependencies());
    const subprocess = processTree.addSubprocess('test subprocess');

    const planeHRealization = context.realizations.realizeProjectionPlane3D(planeH, realizationContext);
    const point3DRealization = context.realizations.realizePoint3D(point3D, realizationContext);
    const line3DRealization = context.realizations.realizeLine3D(line3D, realizationContext);
    const segment3DRealization = context.realizations.realizeSegment3D(segment3D, realizationContext);
    const userPlane3DRealization = context.realizations.realizePlane3D(userPlane3D, realizationContext);

    expect(planeHRealization).toBeDefined();
    expect(point3DRealization).toBeDefined();
    expect(line3DRealization).toBeDefined();
    expect(segment3DRealization).toBeDefined();
    expect(userPlane3DRealization).toBeDefined();
    expect(context.dependencies.getDependencies(line3D.id)).toContain(lineH.id);
    expect(context.dependencies.getDependents(hingeLine.id)).toContain(halfHingeLine.id);
    expect(processTree.findSubprocessById(subprocess.id)).toBeDefined();

    world.clear();
    context.realizations.clear();

    expect(world.getAllProjectionPlanes()).toEqual([]);
    expect(world.getAllHingeLines()).toEqual([]);
    expect(world.getAllPlanes()).toEqual([]);
    expect(world.getAll3DPoints()).toEqual([]);
    expect(world.getAll3DLines()).toEqual([]);
    expect(world.getAll3DSegments()).toEqual([]);
    const lookup = new GeometryElementLookup(world);
    expect(() => lookup.getElement2D(p1.id)).toThrow('[INTERNAL ERROR] Plane');
    expect(() => lookup.getElement2D(lineH.id)).toThrow('[INTERNAL ERROR] Plane');
    expect(context.realizations.realizeProjectionPlane3D(planeH, realizationContext)).not.toBe(planeHRealization);
    expect(context.realizations.realizePoint3D(point3D, realizationContext)).not.toBe(point3DRealization);
    expect(context.realizations.realizeLine3D(line3D, realizationContext)).not.toBe(line3DRealization);
    expect(context.realizations.realizeSegment3D(segment3D, realizationContext)).not.toBe(segment3DRealization);
    expect(() => context.realizations.realizePlane3D(userPlane3D, realizationContext)).toThrow('[INTERNAL ERROR] Plane');
    expect(processTree.findSubprocessById(subprocess.id)).toBeDefined();
  });
});

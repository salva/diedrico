import { describe, expect, it } from 'vitest';
import { Vector3, Vector4 } from 'three';
import { Guide2D } from '@/domain/world/Guide';
import { mat4x3 } from '@/utils/threeUtils';
import { ProjectionPlane3DSelector } from '@/application/threePresentation/ProjectionPlane3DSelector';
import { PlanarElement3DSelector } from '@/application/threePresentation/PlanarElement3DSelector';
import { ReconstructedElement3DSelector } from '@/application/threePresentation/ReconstructedElement3DSelector';
import { Guide3DSelector } from '@/application/threePresentation/Guide3DSelector';
import { Hinge3DSelector } from '@/application/threePresentation/Hinge3DSelector';

const planeTo3D = mat4x3(1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1);
const feasiblePlaneRealization = { feasible: true, planeTo3D };
const plane = { id: 'PH', getAllPoints: () => [], getAllLines: () => [], getAllCircles: () => [] };

function feasible(realization: object) { return { ...realization, feasible: true, isFeasible: () => true }; }

describe('threePresentation concern selectors', () => {
  it('builds projection-plane surface/grid DTOs and reference-axis/label DTOs without scene objects', () => {
    const world = {
      getAllProjectionPlanes: () => [plane],
      getProjectionPlane3DRealization: () => feasiblePlaneRealization,
      getProjectionPlaneById: () => plane,
      get3DPlaneRealization: () => undefined,
    } as any;

    const dtos = new ProjectionPlane3DSelector().select(world, true, true, true);

    expect(dtos.some(dto => dto.kind === 'projection-plane-surface' && dto.renderGroup === 'projectionPlanes')).toBe(true);
    expect(dtos.some(dto => dto.kind === 'projection-plane-grid' && dto.renderGroup === 'projectionPlanes')).toBe(true);
    expect(dtos.filter(dto => dto.kind === 'reference-axis')).toHaveLength(3);
    expect(dtos.filter(dto => dto.kind === 'axis-label')).toHaveLength(3);
    expect(dtos.every(dto => !(dto as any).isObject3D)).toBe(true);
  });

  it('builds planar 2D-on-3D DTOs from projection-plane realizations only when the display option is enabled', () => {
    const point = { id: 'p1', visualStyle: { color: 0x123456 }, realize2D: () => feasible({ position: new Vector3(2, 3, 1) }) };
    const world = {
      getAllProjectionPlanes: () => [{ ...plane, getAllPoints: () => [point] }],
      getProjectionPlane3DRealization: () => feasiblePlaneRealization,
    } as any;

    expect(new PlanarElement3DSelector().select(world, false)).toEqual([]);
    const dtos = new PlanarElement3DSelector().select(world, true);

    expect(dtos).toHaveLength(1);
    expect(dtos[0]).toMatchObject({ id: 'planar-point-p1', kind: 'planar-point', sourceEntityId: 'p1', planeId: 'PH', renderGroup: 'planarElements' });
  });

  it('builds reconstructed 3D point, line, segment, and plane DTOs behind a single concern boundary', () => {
    const point = { id: 'p3', visualStyle: { color: 0xaa0000 } };
    const line = { id: 'l3', visualStyle: { color: 0x00aa00 } };
    const segment = { id: 's3', visualStyle: { color: 0x0000aa } };
    const plane3D = { id: 'plane3' };
    const world = {
      getAll3DPoints: () => [point],
      get3DPointRealization: () => feasible({ getCartesian: () => [1, 2, 3] }),
      getAll3DLines: () => [line],
      get3DLineRealization: () => feasible({ point: new Vector4(0, 0, 0, 1), getDirection: () => new Vector3(1, 0, 0) }),
      getAll3DSegments: () => [segment],
      get3DSegmentRealization: () => feasible({ startPoint: new Vector4(0, 0, 0, 1), endPoint: new Vector4(1, 0, 0, 1) }),
      getAllPlanes: () => [plane3D],
      get3DPlaneRealization: () => ({ feasible: true, originPoint: new Vector4(0, 0, 0, 1), normal: new Vector3(0, 0, 1) }),
    } as any;

    const kinds = new ReconstructedElement3DSelector().select(world, true).map(dto => dto.kind);

    expect(kinds).toEqual(expect.arrayContaining(['reconstructed-point', 'reconstructed-line', 'reconstructed-segment', 'reconstructed-plane']));
    expect(new ReconstructedElement3DSelector().select(world, false)).toEqual([]);
  });

  it('builds selected-guide perpendicular-plane and intersection-marker DTOs from selected IDs', () => {
    const guide = new Guide2D('PH/guide-1', 'PH/ref', 'PH/through', 'PH');
    guide.realize2D = () => feasible({ point1: new Vector3(0, 0, 1), point2: new Vector3(1, 0, 1), getDirection: () => new Vector3(1, 0, 0) }) as any;
    const point3D = { id: 'p3', visualStyle: { visible: true } };
    const world = {
      getLine2D: (id: string) => id === 'PH/guide-1' ? guide : undefined,
      getProjectionPlane3DRealization: () => feasiblePlaneRealization,
      getAll3DPoints: () => [point3D],
      get3DPointRealization: () => feasible({ getCartesian: () => [0, 0, 0] }),
      getAll3DLines: () => [],
      getAll3DSegments: () => [],
    } as any;

    const selected = new Guide3DSelector().select(world, ['PH/guide-1']);
    const unselected = new Guide3DSelector().select(world, ['unrelated']);

    expect(selected.map(dto => dto.kind)).toEqual(expect.arrayContaining(['guide-perpendicular-plane', 'guide-intersection-marker']));
    expect(selected[0]).toMatchObject({ sourceEntityId: 'PH/guide-1', planeId: 'PH', renderGroup: 'guides' });
    expect(unselected).toEqual([]);
  });

  it('builds hinge DTOs only from feasible hinge-line realizations when planes are visible', () => {
    const hinge = { id: 'h1', realize3D: () => feasible({ point: new Vector4(0, 0, 0, 1), direction: new Vector3(0, 1, 0) }) };
    const world = { getAllHingeLines: () => [hinge] } as any;

    const dtos = new Hinge3DSelector().select(world, true);

    expect(dtos).toHaveLength(1);
    expect(dtos[0]).toMatchObject({ id: 'hinge-line-h1', kind: 'hinge-line', sourceEntityId: 'h1', renderGroup: 'hinges' });
    expect(new Hinge3DSelector().select(world, false)).toEqual([]);
  });
});

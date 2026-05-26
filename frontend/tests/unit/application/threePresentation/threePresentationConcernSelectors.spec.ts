import { describe, expect, it } from 'vitest';
import { Vector3, Vector4 } from 'three';
import { Guide2D } from '@/domain/world/Guide';
import { mat4x3 } from '@/utils/threeUtils';
import { createThreeWorldReadPort } from '@/application/threePresentation/ThreeWorldReadPort';
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
    const readPort = {
      getProjectionPlaneModels: () => [{ id: 'PH', kind: 'fixed', plane3DId: 'PH', realization: feasiblePlaneRealization }],
      getProjectionPlaneGridSource: () => ({ plane3DRealization: undefined, projectionRealization: feasiblePlaneRealization }),
    } as any;

    const dtos = new ProjectionPlane3DSelector().select(readPort, true, true, true);

    expect(dtos.some(dto => dto.kind === 'projection-plane-surface' && dto.renderGroup === 'projectionPlanes')).toBe(true);
    expect(dtos.some(dto => dto.kind === 'projection-plane-grid' && dto.renderGroup === 'projectionPlanes')).toBe(true);
    expect(dtos.filter(dto => dto.kind === 'reference-axis')).toHaveLength(3);
    expect(dtos.filter(dto => dto.kind === 'axis-label')).toHaveLength(3);
    expect(dtos.every(dto => !(dto as any).isObject3D)).toBe(true);
  });

  it('builds planar 2D-on-3D DTOs from projection-plane realizations only when the display option is enabled', () => {
    const point = { id: 'p1', visualStyle: { color: 0x123456 }, realization: feasible({ position: new Vector3(2, 3, 1) }) };
    const readPort = {
      getPlanarPlaneModels: () => [{ id: 'PH', realization: feasiblePlaneRealization, points: [point], lines: [], circles: [] }],
    } as any;

    expect(new PlanarElement3DSelector().select(readPort, false)).toEqual([]);
    const dtos = new PlanarElement3DSelector().select(readPort, true);

    expect(dtos).toHaveLength(1);
    expect(dtos[0]).toMatchObject({ id: 'planar-point-p1', kind: 'planar-point', sourceEntityId: 'p1', planeId: 'PH', renderGroup: 'planarElements' });
  });

  it('builds reconstructed 3D point, line, segment, and plane DTOs behind a single concern boundary', () => {
    const readPort = {
      getReconstructedModels: () => ({
        points: [{ id: 'p3', visualStyle: { color: 0xaa0000 }, realization: feasible({ getCartesian: () => [1, 2, 3] }) }],
        lines: [{ id: 'l3', visualStyle: { color: 0x00aa00 }, realization: feasible({ point: new Vector4(0, 0, 0, 1), getDirection: () => new Vector3(1, 0, 0) }) }],
        segments: [{ id: 's3', visualStyle: { color: 0x0000aa }, realization: feasible({ startPoint: new Vector4(0, 0, 0, 1), endPoint: new Vector4(1, 0, 0, 1) }) }],
        planes: [{ id: 'plane3', realization: { feasible: true, originPoint: new Vector4(0, 0, 0, 1), normal: new Vector3(0, 0, 1) } }],
      }),
    } as any;

    const kinds = new ReconstructedElement3DSelector().select(readPort, true).map(dto => dto.kind);

    expect(kinds).toEqual(expect.arrayContaining(['reconstructed-point', 'reconstructed-line', 'reconstructed-segment', 'reconstructed-plane']));
    expect(new ReconstructedElement3DSelector().select(readPort, false)).toEqual([]);
  });

  it('builds selected-guide perpendicular-plane and intersection-marker DTOs from selected IDs', () => {
    const readPort = {
      getSelectedGuideModels: (selectedIds: readonly string[]) => selectedIds.includes('PH/guide-1') ? [{ id: 'PH/guide-1', planeId: 'PH', planeRealization: feasiblePlaneRealization, realization: feasible({ point1: new Vector3(0, 0, 1), point2: new Vector3(1, 0, 1), getDirection: () => new Vector3(1, 0, 0) }) }] : [],
      getGuideIntersectionModels: () => ({
        points: [{ id: 'p3', visualStyle: { visible: true }, cartesian: [0, 0, 0] }],
        lines: [],
        segments: [],
      }),
    } as any;

    const selected = new Guide3DSelector().select(readPort, ['PH/guide-1']);
    const unselected = new Guide3DSelector().select(readPort, ['unrelated']);

    expect(selected.map(dto => dto.kind)).toEqual(expect.arrayContaining(['guide-perpendicular-plane', 'guide-intersection-marker']));
    expect(selected[0]).toMatchObject({ sourceEntityId: 'PH/guide-1', planeId: 'PH', renderGroup: 'guides' });
    expect(unselected).toEqual([]);
  });

  it('builds hinge DTOs only from feasible hinge-line realizations when planes are visible', () => {
    const readPort = { getHingeModels: () => [{ id: 'h1', realization: feasible({ point: new Vector4(0, 0, 0, 1), direction: new Vector3(0, 1, 0) }) }] } as any;

    const dtos = new Hinge3DSelector().select(readPort, true);

    expect(dtos).toHaveLength(1);
    expect(dtos[0]).toMatchObject({ id: 'hinge-line-h1', kind: 'hinge-line', sourceEntityId: 'h1', renderGroup: 'hinges' });
    expect(new Hinge3DSelector().select(readPort, false)).toEqual([]);
  });

  it('adapts injected World to the narrow three-presentation read port at the boundary', () => {
    const guide = new Guide2D('PH/guide-1', 'PH/ref', 'PH/through', 'PH');
    guide.realize2D = () => feasible({ point1: new Vector3(0, 0, 1), point2: new Vector3(1, 0, 1), getDirection: () => new Vector3(1, 0, 0) }) as any;
    const point = { id: 'p1', visualStyle: { color: 0x123456 }, realize2D: () => feasible({ position: new Vector3(2, 3, 1) }) };
    const world = {
      getAllProjectionPlanes: () => [{ ...plane, getAllPoints: () => [point] }],
      getProjectionPlane3DRealization: () => feasiblePlaneRealization,
      getProjectionPlaneById: () => plane,
      get3DPlaneRealization: () => undefined,
      getAll3DPoints: () => [],
      getAll3DLines: () => [],
      getAll3DSegments: () => [],
      getAllPlanes: () => [],
      getLine2D: (id: string) => id === 'PH/guide-1' ? guide : undefined,
      getAllHingeLines: () => [],
    } as any;

    const readPort = createThreeWorldReadPort(world);

    expect(readPort.getProjectionPlaneModels()).toHaveLength(1);
    expect(readPort.getPlanarPlaneModels()[0].points[0]).toMatchObject({ id: 'p1' });
    expect(readPort.getSelectedGuideModels(['PH/guide-1'])[0]).toMatchObject({ id: 'PH/guide-1', planeId: 'PH' });
  });
});

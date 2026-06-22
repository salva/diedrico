import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { Guide2D } from '@/domain/world/Guide';
import { RealizationService } from '@/domain/world/RealizationService';
import { mat4x3 } from '@/utils/threeUtils';
import { buildThreePresentationModel } from '@/application/threePresentation/ThreePresentationSelector';
import { ProjectionPlane3DSelector } from '@/application/threePresentation/ProjectionPlane3DSelector';
import { PlanarElement3DSelector } from '@/application/threePresentation/PlanarElement3DSelector';
import { ReconstructedElement3DSelector } from '@/application/threePresentation/ReconstructedElement3DSelector';
import { Guide3DSelector } from '@/application/threePresentation/Guide3DSelector';
import { Hinge3DSelector } from '@/application/threePresentation/Hinge3DSelector';

const planeTo3D = mat4x3(1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1);
const feasiblePlaneRealization = { feasible: true, planeTo3D, threeDToPlane: { elements: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0] } };
const plane = { id: 'PH', getAllPoints: () => [], getAllLines: () => [], getAllCircles: () => [] };
const visibleStyle = { visible: true, color: 0x123456 };

function feasible(realization: object) { return { ...realization, feasible: true, isFeasible: () => true }; }

describe('threePresentation concern selectors', () => {
  it('builds projection-plane surface/grid DTOs and reference-axis/label DTOs from DTO-native plane sources', () => {
    const planes = [{ id: 'PH', kind: 'fixed' as const, plane3DId: 'PH', surface: { center: { x: 0, y: 0, z: 0 }, normal: { x: 0, y: 0, z: 1 }, size: 10 }, gridSegments: [{ start: { x: 0, y: 0, z: 0 }, end: { x: 1, y: 0, z: 0 } }] }];

    const dtos = new ProjectionPlane3DSelector().select(planes, true, true, true);

    expect(dtos.some(dto => dto.kind === 'projection-plane-surface' && dto.renderGroup === 'projectionPlanes')).toBe(true);
    expect(dtos.some(dto => dto.kind === 'projection-plane-grid' && dto.renderGroup === 'projectionPlanes')).toBe(true);
    expect(dtos.filter(dto => dto.kind === 'reference-axis')).toHaveLength(3);
    expect(dtos.filter(dto => dto.kind === 'axis-label')).toHaveLength(3);
    expect(dtos.every(dto => !(dto as any).isObject3D)).toBe(true);
  });

  it('builds planar 2D-on-3D DTOs from DTO-native planar sources only when the display option is enabled', () => {
    const point = { id: 'p1', kind: 'planar-point' as const, planeId: 'PH', visible: true, style: { color: 0x123456 }, position: { x: 2, y: 3, z: 1 } };
    const planes = [{ id: 'PH', elements: [point] }];

    expect(new PlanarElement3DSelector().select(planes, false)).toEqual([]);
    const dtos = new PlanarElement3DSelector().select(planes, true);

    expect(dtos).toHaveLength(1);
    expect(dtos[0]).toMatchObject({ id: 'planar-point-p1', kind: 'planar-point', sourceEntityId: 'p1', planeId: 'PH', renderGroup: 'planarElements', position: point.position });
  });

  it('builds reconstructed 3D point, line, segment, and plane DTOs behind a single concern boundary', () => {
    const models = {
        points: [{ id: 'p3', kind: 'reconstructed-point' as const, visible: true, style: { color: 0xaa0000 }, position: { x: 1, y: 2, z: 3 } }],
        lines: [{ id: 'l3', kind: 'reconstructed-line' as const, visible: true, style: { color: 0x00aa00 }, start: { x: -1, y: 0, z: 0 }, end: { x: 1, y: 0, z: 0 } }],
        segments: [{ id: 's3', kind: 'reconstructed-segment' as const, visible: true, style: { color: 0x0000aa }, start: { x: 0, y: 0, z: 0 }, end: { x: 1, y: 0, z: 0 } }],
        planes: [{ id: 'plane3', kind: 'reconstructed-plane' as const, visible: true, style: { color: 0xbdbdbd }, geometry: { center: { x: 0, y: 0, z: 0 }, normal: { x: 0, y: 0, z: 1 }, size: 10 } }],
    };

    const kinds = new ReconstructedElement3DSelector().select(models, true).map(dto => dto.kind);

    expect(kinds).toEqual(expect.arrayContaining(['reconstructed-point', 'reconstructed-line', 'reconstructed-segment', 'reconstructed-plane']));
    expect(new ReconstructedElement3DSelector().select(models, false)).toEqual([]);
  });

  it('builds selected-guide perpendicular-plane and intersection-marker DTOs from selected IDs', () => {
    const guides = [{ id: 'PH/guide-1', planeId: 'PH', visible: true, style: { color: 0x00bcd4 }, planePoint: { x: 0, y: 0, z: 0 }, planeNormal: { x: 1, y: 0, z: 0 }, geometry: { center: { x: 0, y: 0, z: 0 }, normal: { x: 1, y: 0, z: 0 }, size: 10 } }];
    const intersections = { points: [{ id: 'p3', visible: true, style: { color: 0xffd700 }, position: { x: 0, y: 0, z: 0 } }], lines: [], segments: [] };

    const selected = new Guide3DSelector().select(guides, intersections);
    const unselected = new Guide3DSelector().select([], undefined);

    expect(selected.map(dto => dto.kind)).toEqual(expect.arrayContaining(['guide-perpendicular-plane', 'guide-intersection-marker']));
    expect(selected[0]).toMatchObject({ sourceEntityId: 'PH/guide-1', planeId: 'PH', renderGroup: 'guides' });
    expect(unselected).toEqual([]);
  });

  it('builds hinge DTOs only from DTO-native hinge-line sources when planes are visible', () => {
    const hinges = [{ id: 'h1', visible: true, style: { color: 0x333333 }, start: { x: 0, y: 0, z: 0 }, end: { x: 1, y: 0, z: 0 } }];

    const dtos = new Hinge3DSelector().select(hinges, true);

    expect(dtos).toHaveLength(1);
    expect(dtos[0]).toMatchObject({ id: 'hinge-line-h1', kind: 'hinge-line', sourceEntityId: 'h1', renderGroup: 'hinges' });
    expect(new Hinge3DSelector().select(hinges, false)).toEqual([]);
  });

  it('builds the three presentation model directly from world and realization context', () => {
    const guide = new Guide2D('PH/guide-1', 'PH/ref', 'PH/through', 'PH');
    guide.visualStyle = visibleStyle as never;
    guide.realize2D = () => feasible({ point1: new Vector3(0, 0, 1), point2: new Vector3(1, 0, 1), getDirection: () => new Vector3(1, 0, 0) }) as never;
    const point = { id: 'p1', visualStyle: visibleStyle, realize2D: () => feasible({ position: new Vector3(2, 3, 1) }) };
    const projectionPlane = { ...plane, getAllPoints: () => [point], getLine: (id: string) => id === 'PH/guide-1' ? guide : undefined };
    const world = {
      getAllProjectionPlanes: () => [projectionPlane],
      getProjectionPlaneById: (id: string) => id === 'PH' ? projectionPlane : undefined,
      getPoint2D: (id: string) => id === 'p1' ? point : undefined,
      getCircle2D: () => undefined,
      get3DPlane: () => undefined,
      get3DPoint: () => undefined,
      get3DLine: () => undefined,
      get3DSegment: () => undefined,
      getAll3DPoints: () => [],
      getAll3DLines: () => [],
      getAll3DSegments: () => [],
      getAllPlanes: () => [],
      getLine2D: (id: string) => id === 'PH/guide-1' ? guide : undefined,
      getAllHingeLines: () => [],
      getHingeLineById: () => undefined,
    };
    const realizations = Object.assign(new RealizationService(), {
      realizeProjectionPlane3D: () => feasiblePlaneRealization,
    });

    const model = buildThreePresentationModel({
      world: world as never,
      realizations: realizations as never,
      selectedIds: ['PH/guide-1'],
      displayOptions: { showPlanes: true, show2DElementsOnPlanes: true, showGrid: true, showReferenceAxes: false },
    });

    expect(model.projectionPlanes[0]).not.toHaveProperty('realization');
    expect(model.planarElements[0]).toMatchObject({ sourceEntityId: 'p1', kind: 'planar-point', style: { color: 0x123456 } });
    expect(model.guides[0]).toMatchObject({ sourceEntityId: 'PH/guide-1', planeId: 'PH', geometry: expect.any(Object) });
  });
});

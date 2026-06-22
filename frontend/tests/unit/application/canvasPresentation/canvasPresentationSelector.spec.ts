import { describe, expect, it } from 'vitest';
import { Vector3, Vector4 } from 'three';
import { buildCanvasPresentationModel } from '@/application/canvasPresentation/CanvasPresentationSelector';
import { Point3DByCoordinates } from '@/domain/world/Point3D';
import { createVisualStyle } from '@/domain/world/VisualStyle';
import { createTestWorld, getHorizontalPlane } from '../../../helpers/worldHelpers';

describe('CanvasPresentationSelector', () => {
  it('builds render/query DTOs and grid labels from one world/view snapshot', () => {
    const { world, visibilityModel, operationContext } = createTestWorld();
    const plane = getHorizontalPlane(world);
    const a = operationContext.projectionConstruction.addFreePoint2D(plane, new Vector3(0, 0, 1));
    const b = operationContext.projectionConstruction.addFreePoint2D(plane, new Vector3(10, 0, 1));
    const segment = operationContext.projectionConstruction.addSegment2DBetweenPoints(plane, a.id!, b.id!);
    const circle = operationContext.projectionConstruction.addCircle2DByCenterAndPoint(plane, a.id!, b.id!);
    const model = buildCanvasPresentationModel(world, { zoom: 1, panX: 0, panY: 0, width: 400, height: 300 }, { activePlaneId: plane.id, visibilityModel, processTree: operationContext.processTree, realizations: operationContext.realizations, selectedIds: new Set([segment.id!]), hoveredIds: new Set([circle.id!]), gridVisible: true });
    expect(model.renderItems.some(item => item.kind === 'point')).toBe(true);
    expect(model.renderItems.some(item => item.kind === 'finite-segment')).toBe(true);
    expect(model.renderItems.some(item => item.kind === 'circle')).toBe(true);
    expect(model.queryItems.some(item => item.kind === 'finite-segment' && item.planeGeometry.type === 'segment')).toBe(true);
    expect(model.gridLines.length).toBeGreaterThan(0);
    expect(model.planeTransforms.get(plane.id)?.paperToPlane).toBeDefined();
  });

  it('creates query items for selectable plane-backed render items', () => {
    const { world, visibilityModel, operationContext } = createTestWorld();
    const plane = getHorizontalPlane(world);
    const a = operationContext.projectionConstruction.addFreePoint2D(plane, new Vector3(0, 0, 1));
    const b = operationContext.projectionConstruction.addFreePoint2D(plane, new Vector3(10, 0, 1));
    const line = operationContext.projectionConstruction.addLine2DBetweenTwoPoints(plane, a.id, b.id);
    const segment = operationContext.projectionConstruction.addSegment2DBetweenPoints(plane, a.id, b.id);
    const circle = operationContext.projectionConstruction.addCircle2DByCenterAndPoint(plane, a.id, b.id);
    const guide = operationContext.projectionConstruction.addGuide2D(plane, line.id, a.id);

    const model = buildCanvasPresentationModel(world, { zoom: 1, panX: 0, panY: 0, width: 400, height: 300 }, { activePlaneId: plane.id, visibilityModel, processTree: operationContext.processTree, realizations: operationContext.realizations, gridVisible: false });
    const expectedElementIds = new Set([a.id, line.id, segment.id, circle.id, guide.id]);
    const selectableRenderItems = model.renderItems.filter(item => expectedElementIds.has(item.sourceEntityId ?? ''));

    expect(selectableRenderItems.map(item => item.kind)).toEqual(expect.arrayContaining(['point', 'infinite-line', 'finite-segment', 'circle', 'guide']));
    for (const renderItem of selectableRenderItems) {
      expect(model.queryItems.some(queryItem => queryItem.id === renderItem.id && queryItem.kind === renderItem.kind && queryItem.elementId === renderItem.sourceEntityId)).toBe(true);
    }
  });

  it('keeps decorative arcs and projected 3D overlays out of query items', () => {
    const { world, visibilityModel, operationContext } = createTestWorld();
    const plane = getHorizontalPlane(world);
    const a = operationContext.projectionConstruction.addFreePoint2D(plane, new Vector3(0, 0, 1));
    const b = operationContext.projectionConstruction.addFreePoint2D(plane, new Vector3(10, 0, 1));
    const line = operationContext.projectionConstruction.addLine2DBetweenTwoPoints(plane, a.id, b.id);
    const guide = operationContext.projectionConstruction.addGuide2D(plane, line.id, a.id);
    guide.arcGeometry = {
      startPoint: { x: 0, y: 0 },
      endPoint: { x: 10, y: 0 },
      controlPoints: [{ x: 5, y: 5 }],
      style: { color: '#000000', width: 1, opacity: 1 },
    };
    const point3D = new Point3DByCoordinates(operationContext.idAllocator.generate3DPointId(), 'A', new Vector4(1, 2, 3, 1), createVisualStyle());
    world.putPoint3D(point3D);

    const model = buildCanvasPresentationModel(world, { zoom: 1, panX: 0, panY: 0, width: 400, height: 300 }, { activePlaneId: plane.id, visibilityModel, processTree: operationContext.processTree, realizations: operationContext.realizations, showProjectedElements: true, gridVisible: false });
    const arcRenderItem = model.renderItems.find(item => item.kind === 'arc' && item.sourceEntityId === guide.id);
    const projectedRenderItems = model.renderItems.filter(item => item.kind.startsWith('projected-3d-'));

    expect(arcRenderItem).toBeDefined();
    expect(projectedRenderItems.some(item => item.sourceEntityId === point3D.id)).toBe(true);
    expect(model.queryItems.some(item => item.id === arcRenderItem?.id || item.elementId === point3D.id || item.id.startsWith('proj3d-'))).toBe(false);
  });
});

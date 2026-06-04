import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { CanvasPresentationSelector } from '@/application/canvasPresentation/CanvasPresentationSelector';
import { createCanvasPresentationContext } from '@/application/canvasPresentation/CanvasPresentationContext';
import { createTestWorld } from '../../../helpers/worldHelpers';

describe('CanvasPresentationSelector', () => {
  it('builds render/query DTOs and grid labels from one world/view snapshot', () => {
    const { world } = createTestWorld();
    const plane = world.getProjectionPlaneByLabel('P_H');
    const a = plane.addFreePoint2D(new Vector3(0, 0, 1), world as any);
    const b = plane.addFreePoint2D(new Vector3(10, 0, 1), world as any);
    const segment = plane.addSegment2DBetweenPoints(a.id!, b.id!, world as any);
    const circle = plane.addCircle2DByCenterAndPoint(a.id!, b.id!, world as any);
    const selector = new CanvasPresentationSelector();
    const model = selector.select(createCanvasPresentationContext(world), { zoom: 1, panX: 0, panY: 0, width: 400, height: 300 }, { activePlaneId: plane.id, selectedIds: new Set([segment.id!]), hoveredIds: new Set([circle.id!]), gridVisible: true });
    expect(model.renderItems.some(item => item.kind === 'point')).toBe(true);
    expect(model.renderItems.some(item => item.kind === 'finite-segment')).toBe(true);
    expect(model.renderItems.some(item => item.kind === 'circle')).toBe(true);
    expect(model.queryItems.some(item => item.kind === 'finite-segment' && item.planeGeometry.type === 'segment')).toBe(true);
    expect(model.gridLines.length).toBeGreaterThan(0);
    expect(model.planeTransforms.get(plane.id)?.paperToPlane).toBeDefined();
  });
});

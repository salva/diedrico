import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { buildCanvasPresentationModel, CanvasPresentationSelector } from '@/application/canvasPresentation/CanvasPresentationSelector';
import { createCanvasPresentationContext, getCanvasPlaneCanvasItems, getCanvasPlaneTransforms, getPlaneCanvasItems } from '@/application/canvasPresentation/CanvasPresentationContext';
import selectorSource from '../../../../src/application/canvasPresentation/CanvasPresentationSelector.ts?raw';
import contextSource from '../../../../src/application/canvasPresentation/CanvasPresentationContext.ts?raw';
import { createTestWorld } from '../../../helpers/worldHelpers';

describe('CanvasPresentationContext boundary', () => {
  it('builds canvas presentation directly from world while returning transforms for rendering and input', () => {
    const { world } = createTestWorld();
    const plane = world.getProjectionPlaneByLabel('P_H');
    const a = plane.addFreePoint2D(new Vector3(0, 0, 1), world);
    const b = plane.addFreePoint2D(new Vector3(10, 0, 1), world);
    const segment = plane.addSegment2DBetweenPoints(a.id, b.id, world);

    const model = buildCanvasPresentationModel(world, { zoom: 1, panX: 0, panY: 0, width: 400, height: 300 }, { activePlaneId: plane.id, selectedIds: new Set([segment.id]), gridVisible: true });

    expect(model.renderItems.some(item => item.sourceEntityId === a.id && item.kind === 'point')).toBe(true);
    expect(model.queryItems.some(item => item.elementId === segment.id && item.kind === 'finite-segment')).toBe(true);
    expect(model.planeTransforms.get(plane.id)?.paperToPlane).toBeDefined();
  });

  it('exposes the Stage 2D world/viewport/state model builder shape', () => {
    const selectorSelect: (typeof CanvasPresentationSelector.prototype)['select'] = CanvasPresentationSelector.prototype.select;

    expect(selectorSelect.length).toBe(3);
    expect(buildCanvasPresentationModel.length).toBe(3);
  });

  it('builds transforms once and passes those same transform objects into plane item collection', () => {
    const { world } = createTestWorld();
    const plane = world.getProjectionPlaneByLabel('P_H');
    const context = createCanvasPresentationContext(world);
    const transforms = getCanvasPlaneTransforms(world);
    const transform = transforms.find(item => item.planeId === plane.id)!;
    const items = getPlaneCanvasItems(plane, transform, { realizationContext: context.realizationContext } as never);

    const model = buildCanvasPresentationModel(world, { zoom: 1, panX: 0, panY: 0, width: 400, height: 300 }, { activePlaneId: plane.id });

    expect(items.length).toBeGreaterThan(0);
    expect(model.planeTransforms.get(plane.id)?.paperToPlane).toBeDefined();
    expect(selectorSource.match(/getCanvasPlaneTransforms\(world\)/g)).toHaveLength(1);
    expect(selectorSource).toContain('getCanvasPlaneCanvasItems(world, planeTransforms, state)');
    expect(contextSource).toContain('getPlaneCanvasItems(plane, transform, itemState)');
    expect(getCanvasPlaneCanvasItems(world, new Map(transforms.map(item => [item.planeId, item])), { realizationContext: context.realizationContext } as never)).toHaveLength(transforms.length);
  });

});

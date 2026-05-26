import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { CanvasPresentationController } from '@/application/canvasPresentation/CanvasPresentationController';
import { CanvasPresentationSelector } from '@/application/canvasPresentation/CanvasPresentationSelector';
import { createCanvasWorldReadPort } from '@/application/canvasPresentation/CanvasWorldReadPort';
import type { World } from '@/domain/world/World';
import { createTestWorld } from '../../../helpers/worldHelpers';

describe('CanvasWorldReadPort boundary', () => {
  it('lets canvas presentation consume a narrow read port instead of a full World selector API', () => {
    const { world } = createTestWorld();
    const plane = world.getProjectionPlaneByLabel('P_H');
    const a = plane.addFreePoint2D(new Vector3(0, 0, 1), world);
    const b = plane.addFreePoint2D(new Vector3(10, 0, 1), world);
    const segment = plane.addSegment2DBetweenPoints(a.id, b.id, world);

    const readPort = createCanvasWorldReadPort(world);
    const model = new CanvasPresentationController().buildModel(readPort, { zoom: 1, panX: 0, panY: 0, width: 400, height: 300 }, { activePlaneId: plane.id, selectedIds: new Set([segment.id]), gridVisible: true });

    expect(model.renderItems.some(item => item.sourceEntityId === a.id && item.kind === 'point')).toBe(true);
    expect(model.queryItems.some(item => item.elementId === segment.id && item.kind === 'finite-segment')).toBe(true);
    expect(model.planeTransforms.get(plane.id)?.paperToPlane).toBeDefined();
  });

  it('does not expose the legacy full-World selector/controller API shape', () => {
    const selectorSelect: (typeof CanvasPresentationSelector.prototype)['select'] = CanvasPresentationSelector.prototype.select;
    const controllerBuild: (typeof CanvasPresentationController.prototype)['buildModel'] = CanvasPresentationController.prototype.buildModel;

    expect(selectorSelect.length).toBe(3);
    expect(controllerBuild.length).toBe(3);

    // Compile-time guard: the API accepts a read port, not a concrete World parameter.
    type SelectorFirstParameter = Parameters<typeof selectorSelect>[0];
    type ControllerFirstParameter = Parameters<typeof controllerBuild>[0];
    type SelectorStillWorld = SelectorFirstParameter extends World ? true : false;
    type ControllerStillWorld = ControllerFirstParameter extends World ? true : false;
    const selectorStillWorld: SelectorStillWorld = false;
    const controllerStillWorld: ControllerStillWorld = false;
    expect(selectorStillWorld).toBe(false);
    expect(controllerStillWorld).toBe(false);
  });
});

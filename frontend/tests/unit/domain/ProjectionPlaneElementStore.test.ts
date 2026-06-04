import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { Circle2DRealization2D } from '@/domain/world/Circle';
import { Line2DRealization2D } from '@/domain/world/Line';
import { Point2DRealization2D } from '@/domain/world/Point';
import { ProjectionPlaneElementStore } from '@/domain/world/projectionPlane/ProjectionPlaneElementStore';

describe('ProjectionPlaneElementStore', () => {
  it('clears all realization caches for an element id', () => {
    const store = new ProjectionPlaneElementStore();
    const id = 'projPlane1/element1';
    const otherId = 'projPlane1/element2';

    store.setPointRealization2D(id, new Point2DRealization2D(new Vector3(0, 0, 1)));
    store.setLineRealization2D(id, new Line2DRealization2D(new Vector3(0, 0, 1), new Vector3(1, 0, 0)));
    store.setCircleRealization2D(id, new Circle2DRealization2D(new Vector3(0, 0, 1), new Vector3(1, 0, 0)));
    store.setPointRealization2D(otherId, new Point2DRealization2D(new Vector3(1, 1, 1)));

    store.clearRealizationCaches(id);

    expect(store.getPointRealization2D(id)).toBeUndefined();
    expect(store.getLineRealization2D(id)).toBeUndefined();
    expect(store.getCircleRealization2D(id)).toBeUndefined();
    expect(store.getPointRealization2D(otherId)).toBeDefined();
  });
});

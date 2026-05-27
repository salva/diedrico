import { describe, expect, it } from 'vitest';
import { Matrix3, Vector4 } from 'three';
import { Projected3DCanvasSelector, type Projected3DCanvasReadPort } from '@/application/canvasPresentation/Projected3DCanvasSelector';
import { Point3DRealization3D } from '@/domain/world/Element3DRealization3D';
import { mat3x4 } from '@/utils/threeUtils';

function readPort(): Projected3DCanvasReadPort {
  return {
    getProjectionPlanes: () => [{ id: 'plane-a' }],
    getProjectionPlane3DRealization: () => ({
      planeId: 'plane-a',
      planeTo3D: undefined as never,
      threeDToPlane: mat3x4(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1),
    }),
    get3DPoints: () => [{ id: 'point3d1', realization: new Point3DRealization3D(new Vector4(2, 3, 0, 1)) }],
    get3DLines: () => [],
    get3DSegments: () => [],
  };
}

describe('Projected3DCanvasSelector', () => {
  it('owns projected 3D-on-2D render DTO creation outside the 2D selector loop', () => {
    const selector = new Projected3DCanvasSelector();
    const items = selector.selectWorldProjection(readPort(), new Map([['plane-a', { planeToPaper: new Matrix3().identity() }]]));

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ kind: 'projected-3d-point', id: 'proj3d-point-point3d1-on-plane-a', sourceEntityId: 'point3d1', planeId: 'plane-a' });
    expect(items[0].primitive.type).toBe('point');
  });
});

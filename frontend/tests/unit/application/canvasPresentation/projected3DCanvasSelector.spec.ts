import { describe, expect, it } from 'vitest';
import { Matrix3, Vector4 } from 'three';
import { Projected3DCanvasSelector } from '@/application/canvasPresentation/Projected3DCanvasSelector';
import type { CanvasWorldReadPort } from '@/application/canvasPresentation/CanvasWorldReadPort';
import type { ProjectionPlane } from '@/domain/world/projectionPlane/ProjectionPlane';
import { Point3DRealization3D } from '@/domain/world/Element3DRealization3D';
import { mat3x4 } from '@/utils/threeUtils';

const plane = { id: 'plane-a' } as ProjectionPlane;
const point3D = { id: 'point3d1' } as never;

function readPort(): CanvasWorldReadPort {
  return {
    getAllProjectionPlanes: () => [plane],
    getProjectionPlane2DTransform: () => undefined,
    getProjectionPlane3DRealization: () => ({
      planeId: 'plane-a',
      planeTo3D: undefined as never,
      threeDToPlane: mat3x4(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1),
    }),
    getAll3DPoints: () => [point3D],
    getAll3DLines: () => [],
    getAll3DSegments: () => [],
    realizePoint2D: () => undefined,
    realizeLine2D: () => undefined,
    realizeCircle2D: () => undefined,
    realizePoint3D: () => new Point3DRealization3D(new Vector4(2, 3, 0, 1)),
    realizeLine3D: () => { throw new Error('not used'); },
    realizeSegment3D: () => { throw new Error('not used'); },
    isElementVisible: () => true,
  };
}

describe('Projected3DCanvasSelector', () => {
  it('owns projected 3D-on-2D render DTO creation outside the 2D selector loop', () => {
    const selector = new Projected3DCanvasSelector();
    const items = selector.select(readPort(), new Map([['plane-a', { planeToPaper: new Matrix3().identity() }]]));

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ kind: 'projected-3d-point', id: 'proj3d-point-point3d1-on-plane-a', sourceEntityId: 'point3d1', planeId: 'plane-a' });
    expect(items[0].primitive.type).toBe('point');
  });
});

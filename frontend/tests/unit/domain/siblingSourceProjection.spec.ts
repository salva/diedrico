import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { SiblingIntersectionPoint2D, FreePoint2D } from '@/domain/world/Point';
import { mat3x4, Matrix4x3 } from '@/utils/threeUtils';
import type { ProjectionElementRealizationContext } from '@/domain/world/projectionPlane/ProjectionPlaneContext';

describe('sibling source-plane projection', () => {
  it('uses frames without requiring line1/line2 properties on the source point', () => {
    const source = new FreePoint2D('source-plane/source', new Vector3(2, 3, 1), 'source-plane');
    const sibling = new SiblingIntersectionPoint2D('target-plane/sibling', source.id, 'target-plane');
    const context = {
      getPoint2D: () => source,
      getProjectionPlane3DRealization: (id: string) => ({ feasible: true,
        planeTo3D: new Matrix4x3().fromArray([1, 0, 10, 0, 1, 20, 0, 0, 0, 0, 0, 1]),
        threeDToPlane: id === 'target-plane' ? mat3x4(1, 0, 0, -5, 0, 1, 0, -7, 0, 0, 0, 1) : undefined,
      }),
    } as unknown as ProjectionElementRealizationContext;
    const result = sibling.realize2D(context);
    expect(result.feasible).toBe(true);
    expect(result.position.x).toBeCloseTo(7);
    expect(result.position.y).toBeCloseTo(16);
  });
});

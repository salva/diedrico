import { createTestWorld } from '../../helpers/worldHelpers';
import { RuntimeCommandProducer } from '@/application/commandProduction/RuntimeCommandProducer';
import { executeConstructionIntent } from '@/application/construction/ConstructionUseCases';
import { applyMatrix4x3, applyMatrix3x4 } from '@/utils/threeUtils';
import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { SiblingIntersectionPoint2D, FreePoint2D } from '@/domain/world/Point';
import { mat3x4, Matrix4x3 } from '@/utils/threeUtils';
import type { ProjectionElementRealizationContext } from '@/domain/world/projectionPlane/ProjectionPlaneContext';

describe('sibling source-plane projection', () => {
  it('projects regular, auxiliary regular-hinge and broken-hinge plane pairs through their actual frames', () => {
    const { world, operationContext: ctx, commandStack } = createTestWorld();
    expect(executeConstructionIntent({ operationContext: ctx, commands: new RuntimeCommandProducer(ctx, commandStack),
      intent: { type: 'create-yz-projection-plane', description: 'YZ' } }).success).toBe(true);
    const [h, v] = world.getAllProjectionPlanes();
    const yz = world.getAllProjectionPlanes().find(p => p.name === 'P_YZ')!;
    for (const [sourcePlane, targetPlane] of [[h, v], [v, yz], [h, yz]]) {
      const source = ctx.projectionConstruction.addFreePoint2D(sourcePlane, new Vector3(12, 23, 1));
      const sibling = new SiblingIntersectionPoint2D(`${targetPlane.id}/frame-probe`, source.id, targetPlane.id);
      const sourceFrame = ctx.realizationContext.getProjectionPlane3DRealization(sourcePlane.id)!;
      const targetFrame = ctx.realizationContext.getProjectionPlane3DRealization(targetPlane.id)!;
      expect(sourceFrame.feasible && targetFrame.feasible).toBe(true);
      const expected = applyMatrix3x4(applyMatrix4x3(source.position, sourceFrame.planeTo3D), targetFrame.threeDToPlane);
      const result = sibling.realize2D(ctx.realizationContext);
      expect(result.feasible).toBe(true);
      expect(result.position.x).toBeCloseTo(expected.x);
      expect(result.position.y).toBeCloseTo(expected.y);
    }
  });

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

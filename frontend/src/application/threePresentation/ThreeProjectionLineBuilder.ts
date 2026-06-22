import { Vector3, Vector4 } from 'three';
import { Point3DByCoordinates, Point3DFromProjections } from '@/domain/world/Point3D';
import { applyMatrix4x3, domainToThreeJS, type Matrix4x3 } from '@/utils/threeUtils';
import type { ThreePresentationContext } from './ThreePresentationContext';
import type { ThreeProjectionLineSourceDto } from './ThreePresentationReadModel';
import type { Vec3 } from './ThreePresentationModel';
import { THREE_STYLE, visibleFromDomain } from './ThreeStylePolicy';

interface ProjectionRef {
  readonly pointId: string;
  readonly planeId?: string;
}

export type { ThreeProjectionLineSourceDto as ThreeProjectionLineReadModel } from './ThreePresentationReadModel';

export function buildProjectionLineModels(context: ThreePresentationContext): ThreeProjectionLineSourceDto[] {
  return context.get3DPoints().flatMap(point => {
    if (!visibleFromDomain(point) || !context.isElementVisible(point)) return [];
    const realization = context.get3DPointRealization(point.id);
    if (!realization) throw new Error(`Missing 3D point realization for ${point.id}`);
    if (!realization.isFeasible()) return [];
    const [x, y, z] = realization.getCartesian();
    const point3DPosition = v(domainToThreeJS(new Vector4(x, y, z, 1)));

    return getProjectionRefs(point).flatMap(ref => {
      const projection = context.getPoint2D(ref.pointId);
      const planeId = ref.planeId ?? projection?.planeId;
      if (!projection || !planeId || !visibleFromDomain(projection) || !context.isElementVisible(projection)) return [];
      const planeRealization = context.getProjectionPlane3DRealization(planeId);
      if (!planeRealization?.feasible) return [];
      const projectionRealization = projection.realize2D(context.realizationContext);
      if (!projectionRealization.isFeasible()) return [];
      return [{
        id: `${point.id}-${projection.id}`,
        kind: 'projection-line' as const,
        planeId,
        visible: true,
        style: THREE_STYLE.projectionLine,
        start: point3DPosition,
        end: v(liftProjectionPoint(projectionRealization.position, planeRealization.planeTo3D)),
      }];
    });
  });
}

function getProjectionRefs(point: unknown): ProjectionRef[] {
  if (point instanceof Point3DFromProjections) {
    return [
      { pointId: point.projection1, planeId: point.plane1Id },
      { pointId: point.projection2, planeId: point.plane2Id },
    ];
  }
  if (point instanceof Point3DByCoordinates) {
    return [point.projectionH, point.projectionV].filter((id): id is string => Boolean(id)).map(pointId => ({ pointId }));
  }
  return [];
}

function liftProjectionPoint(point: Vector3, matrix: Matrix4x3) {
  const domain = applyMatrix4x3(point, matrix);
  const e = matrix.elements;
  const normal = new Vector3().crossVectors(new Vector3(e[0], e[3], e[6]), new Vector3(e[1], e[4], e[7])).normalize();
  domain.x += normal.x * THREE_STYLE.zOffset;
  domain.y += normal.y * THREE_STYLE.zOffset;
  domain.z += normal.z * THREE_STYLE.zOffset;
  return domainToThreeJS(domain);
}

function v(vector: { x: number; y: number; z: number }): Vec3 { return { x: vector.x, y: vector.y, z: vector.z }; }

import { Quaternion, Vector3 } from 'three';
import type { World } from '@/domain/world/World';
import { isGuide2D, isSiblingGuide2D } from '@/domain/world/Guide';
import { getPlaneMeshSize } from '@/config/rendering3D';
import { applyMatrix4x3, domainDirectionToThreeJS, domainToThreeJS } from '@/utils/threeUtils';
import type { ThreeGuideIntersectionReadModel, ThreeGuideSourceDto } from './ThreePresentationReadModel';
import { THREE_STYLE, visibleFromDomain } from './ThreeStylePolicy';
import { createThreeRealizationContext } from './ThreeRealizationContext';
import type { Vec3 } from './ThreePresentationModel';

export type { ThreeGuideIntersectionReadModel, ThreeGuideSourceDto as ThreeGuideReadModel } from './ThreePresentationReadModel';

export interface ThreeGuideReadPort {
  getSelectedGuideModels(selectedIds: readonly string[]): ThreeGuideSourceDto[];
  getGuideIntersectionModels(): ThreeGuideIntersectionReadModel;
}

export function createThreeGuideReadPort(world: World): ThreeGuideReadPort {
  const realizationContext = createThreeRealizationContext(world, {
    getProjectionPlanes: () => [],
    getHingeLines: () => [],
  });
  return {
    getSelectedGuideModels: (selectedIds: readonly string[]) => selectedIds.flatMap(selectedId => {
      try {
        const line = world.getLine2D(selectedId);
        if (!line || (!isGuide2D(line) && !isSiblingGuide2D(line)) || !visibleFromDomain(line)) return [];
        const planeRealization = world.getProjectionPlane3DRealization(line.planeId);
        const guideRealization = line.realize2D(realizationContext);
        if (!planeRealization?.feasible || !guideRealization?.feasible) return [];
        const guidePoint3D = applyMatrix4x3(guideRealization.point1, planeRealization.planeTo3D);
        const guideDirection3D = directionFromPlane(guideRealization.getDirection(), planeRealization.planeTo3D.elements);
        const projectionNormal = projectionPlaneNormal(planeRealization.planeTo3D.elements);
        const perpendicularNormal = new Vector3().crossVectors(guideDirection3D, projectionNormal).normalize();
        if (perpendicularNormal.length() < 1e-10) return [];
        const normalThree = domainDirectionToThreeJS(perpendicularNormal).normalize();
        const centerThree = domainToThreeJS(guidePoint3D);
        const quaternion = new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), normalThree);
        return [{
          id: line.id,
          planeId: line.planeId,
          visible: true,
          style: THREE_STYLE.guidePlane,
          planePoint: v(guidePoint3D),
          planeNormal: v(perpendicularNormal),
          geometry: { center: v(centerThree), normal: v(normalThree), size: getPlaneMeshSize(line.planeId), quaternion: { x: quaternion.x, y: quaternion.y, z: quaternion.z, w: quaternion.w } },
        }];
      } catch {
        return [];
      }
    }),
    getGuideIntersectionModels: () => ({
      points: world.getAll3DPoints().flatMap(point => {
        if (!visibleFromDomain(point)) return [];
        const realization = world.get3DPointRealization(point.id!);
        if (!realization?.isFeasible()) return [];
        const [x, y, z] = realization.getCartesian();
        return [{ id: point.id!, visible: true, style: THREE_STYLE.guideMarker, position: { x, y, z } }];
      }),
      lines: world.getAll3DLines().flatMap(line => {
        if (!visibleFromDomain(line)) return [];
        const realization = world.get3DLineRealization(line.id!);
        if (!realization?.isFeasible()) return [];
        return [{ id: line.id!, visible: true, style: THREE_STYLE.guideMarker, point: v(realization.point), direction: v(realization.getDirection()) }];
      }),
      segments: world.getAll3DSegments().flatMap(segment => {
        if (!visibleFromDomain(segment)) return [];
        const realization = world.get3DSegmentRealization(segment.id!);
        if (!realization?.isFeasible()) return [];
        return [{ id: segment.id!, visible: true, style: THREE_STYLE.guideMarker, start: v(realization.startPoint), end: v(realization.endPoint) }];
      }),
    }),
  };
}

function directionFromPlane(direction2D: Vector3, matrix: number[]): Vector3 {
  const x = matrix[0] * direction2D.x + matrix[1] * direction2D.y;
  const y = matrix[3] * direction2D.x + matrix[4] * direction2D.y;
  const z = matrix[6] * direction2D.x + matrix[7] * direction2D.y;
  return new Vector3(x, y, z).normalize();
}

function projectionPlaneNormal(e: number[]): Vector3 { return new Vector3().crossVectors(new Vector3(e[0], e[3], e[6]), new Vector3(e[1], e[4], e[7])).normalize(); }
function v(vector: { x: number; y: number; z: number }): Vec3 { return { x: vector.x, y: vector.y, z: vector.z }; }


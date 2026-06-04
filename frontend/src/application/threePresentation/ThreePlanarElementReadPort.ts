import { Vector3 } from 'three';
import type { ThreePresentationContext } from './ThreePresentationContext';
import { Segment2D } from '@/domain/world/Segment';
import { applyMatrix4x3, domainToThreeJS, type Matrix4x3 } from '@/utils/threeUtils';
import type { ThreePlanarElementSourceDto, ThreePlanarPlaneReadModel } from './ThreePresentationReadModel';
import { planarStyleFromDomain, THREE_STYLE, visibleFromDomain } from './ThreeStylePolicy';
import type { Vec3 } from './ThreePresentationModel';

export type { ThreePlanarCircleSourceDto as ThreePlanarCircleReadModel, ThreePlanarElementSourceDto, ThreePlanarLineSourceDto as ThreePlanarLineReadModel, ThreePlanarPlaneReadModel, ThreePlanarPointSourceDto as ThreePlanarPointReadModel } from './ThreePresentationReadModel';

export interface ThreePlanarElementReadPort {
  getPlanarPlaneModels(): ThreePlanarPlaneReadModel[];
}

export function createThreePlanarElementReadPort(context: ThreePresentationContext): ThreePlanarElementReadPort {
  const getProjectionPlanes = () => context.getProjectionPlanes();
  const realizationContext = context.realizationContext;
  return {
    getPlanarPlaneModels: () => getProjectionPlanes().flatMap(plane => {
      const planeRealization = context.getProjectionPlane3DRealization(plane.id);
      if (!planeRealization?.feasible) return [];
      const elements: ThreePlanarElementSourceDto[] = [];
      for (const point of plane.getAllPoints()) {
        const realization = point.realize2D(realizationContext);
        if (!realization?.feasible || !visibleFromDomain(point)) continue;
        elements.push({ id: point.id, kind: 'planar-point', planeId: plane.id, visible: true, style: planarStyleFromDomain(point), position: v(lift(realization.position, planeRealization.planeTo3D)) });
      }
      for (const line of plane.getAllLines()) {
        const realization = line.realize2D(realizationContext);
        if (!realization?.feasible || !visibleFromDomain(line)) continue;
        const style = planarStyleFromDomain(line);
        if (line instanceof Segment2D || realization.isBounded()) {
          elements.push({ id: line.id, kind: 'planar-segment', planeId: plane.id, visible: true, style, start: v(lift(realization.point1, planeRealization.planeTo3D)), end: v(lift(realization.point2, planeRealization.planeTo3D)) });
        } else {
          const direction = realization.getDirection().clone().normalize();
          const start2D = realization.point1.clone().add(direction.clone().multiplyScalar(-THREE_STYLE.planarLineExtent / 2));
          const end2D = realization.point1.clone().add(direction.clone().multiplyScalar(THREE_STYLE.planarLineExtent / 2));
          elements.push({ id: line.id, kind: 'planar-line', planeId: plane.id, visible: true, style, start: v(lift(start2D, planeRealization.planeTo3D)), end: v(lift(end2D, planeRealization.planeTo3D)) });
        }
      }
      for (const circle of plane.getAllCircles()) {
        const realization = circle.realize2D(realizationContext);
        if (!realization?.feasible || !visibleFromDomain(circle)) continue;
        const radius = realization.getRadius();
        const circlePoints: Vec3[] = [];
        for (let i = 0; i < 64; i++) {
          const angle = (i / 64) * Math.PI * 2;
          const p = realization.center.clone();
          p.x += Math.cos(angle) * radius;
          p.y += Math.sin(angle) * radius;
          circlePoints.push(v(lift(p, planeRealization.planeTo3D)));
        }
        elements.push({ id: circle.id, kind: 'planar-circle', planeId: plane.id, visible: true, style: planarStyleFromDomain(circle), points: circlePoints });
      }
      return [{ id: plane.id, elements }];
    }),
  };
}

function lift(point2D: Vector3, matrix: Matrix4x3) {
  const domain = applyMatrix4x3(point2D, matrix);
  const e = matrix.elements;
  const normal = new Vector3().crossVectors(new Vector3(e[0], e[3], e[6]), new Vector3(e[1], e[4], e[7])).normalize();
  domain.x += normal.x * THREE_STYLE.zOffset;
  domain.y += normal.y * THREE_STYLE.zOffset;
  domain.z += normal.z * THREE_STYLE.zOffset;
  return domainToThreeJS(domain);
}

function v(vector: { x: number; y: number; z: number }): Vec3 { return { x: vector.x, y: vector.y, z: vector.z }; }

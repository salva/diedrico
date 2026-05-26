import { CatmullRomCurve3, Vector3 } from 'three';
import { applyMatrix4x3, domainToThreeJS, type Matrix4x3 } from '@/utils/threeUtils';
import type { PlanarElementPresentationDto, Vec3 } from './ThreePresentationModel';
import type { ThreeWorldReadPort } from './ThreeWorldReadPort';
import { isVisible2D, planarStyle, THREE_STYLE } from './ThreeStylePolicy';

export class PlanarElement3DSelector {
  select(readPort: Pick<ThreeWorldReadPort, 'getPlanarPlaneModels'>, show2DElementsOnPlanes: boolean): PlanarElementPresentationDto[] {
    if (!show2DElementsOnPlanes) return [];
    const items: PlanarElementPresentationDto[] = [];
    for (const plane of readPort.getPlanarPlaneModels()) {
      const planeRealization = plane.realization;
      if (!planeRealization?.feasible) continue;
      for (const point of plane.points) {
        if (!isVisible2D(point)) continue;
        const realization = point.realization;
        if (!realization?.feasible) continue;
        items.push({ id: `planar-point-${point.id}`, kind: 'planar-point', sourceEntityId: point.id, planeId: plane.id, visible: true, style: planarStyle(point), renderGroup: 'planarElements', position: v(lift(realization.position, planeRealization.planeTo3D)) });
      }
      for (const line of plane.lines) {
        if (!isVisible2D(line)) continue;
        const realization = line.realization;
        if (!realization?.feasible) continue;
        const style = planarStyle(line);
        if (line.isSegment || realization.isBounded()) {
          items.push({ id: `planar-segment-${line.id}`, kind: 'planar-segment', sourceEntityId: line.id, planeId: plane.id, visible: true, style, renderGroup: 'planarElements', start: v(lift(realization.point1, planeRealization.planeTo3D)), end: v(lift(realization.point2, planeRealization.planeTo3D)) });
        } else {
          const direction = realization.getDirection().clone().normalize();
          const start2D = realization.point1.clone().add(direction.clone().multiplyScalar(-THREE_STYLE.planarLineExtent / 2));
          const end2D = realization.point1.clone().add(direction.clone().multiplyScalar(THREE_STYLE.planarLineExtent / 2));
          items.push({ id: `planar-line-${line.id}`, kind: 'planar-line', sourceEntityId: line.id, planeId: plane.id, visible: true, style, renderGroup: 'planarElements', start: v(lift(start2D, planeRealization.planeTo3D)), end: v(lift(end2D, planeRealization.planeTo3D)) });
        }
      }
      for (const circle of plane.circles) {
        if (!isVisible2D(circle)) continue;
        const realization = circle.realization;
        if (!realization?.feasible) continue;
        const radius = realization.getRadius();
        const points: Vec3[] = [];
        for (let i = 0; i < 64; i++) {
          const angle = (i / 64) * Math.PI * 2;
          const p = realization.center.clone();
          p.x += Math.cos(angle) * radius;
          p.y += Math.sin(angle) * radius;
          points.push(v(lift(p, planeRealization.planeTo3D)));
        }
        void CatmullRomCurve3;
        items.push({ id: `planar-circle-${circle.id}`, kind: 'planar-circle', sourceEntityId: circle.id, planeId: plane.id, visible: true, style: planarStyle(circle), renderGroup: 'planarElements', points });
      }
    }
    return items;
  }
}

function lift(point2D: Vector3, matrix: Matrix4x3): Vector3 {
  const domain = applyMatrix4x3(point2D, matrix);
  const e = matrix.elements;
  const normal = new Vector3().crossVectors(new Vector3(e[0], e[3], e[6]), new Vector3(e[1], e[4], e[7])).normalize();
  domain.x += normal.x * THREE_STYLE.zOffset;
  domain.y += normal.y * THREE_STYLE.zOffset;
  domain.z += normal.z * THREE_STYLE.zOffset;
  return domainToThreeJS(domain);
}
function v(vector: { x: number; y: number; z: number }): Vec3 { return { x: vector.x, y: vector.y, z: vector.z }; }

import { Quaternion, Vector3, Vector4 } from 'three';
import type { World } from '@/domain/world/World';
import { domainDirectionToThreeJS, domainToThreeJS } from '@/utils/threeUtils';
import { getPlaneMeshSize } from '@/config/rendering3D';
import type { ReconstructedElementPresentationDto, Vec3 } from './ThreePresentationModel';
import { isVisible3D, reconstructedStyle, THREE_STYLE } from './ThreeStylePolicy';

export class ReconstructedElement3DSelector {
  select(world: World, showPlanes: boolean): ReconstructedElementPresentationDto[] {
    if (!showPlanes) return [];
    const items: ReconstructedElementPresentationDto[] = [];
    for (const point of world.getAll3DPoints()) {
      if (!isVisible3D(point)) continue;
      const realization = world.get3DPointRealization(point.id!);
      if (!realization?.isFeasible()) continue;
      const [x, y, z] = realization.getCartesian();
      items.push({ id: `reconstructed-point-${point.id}`, kind: 'reconstructed-point', sourceEntityId: point.id, visible: true, style: reconstructedStyle(point), renderGroup: 'reconstructedElements', position: v(domainToThreeJS(new Vector4(x, y, z, 1))) });
    }
    for (const line of world.getAll3DLines()) {
      if (!isVisible3D(line)) continue;
      const realization = world.get3DLineRealization(line.id!);
      if (!realization?.isFeasible()) continue;
      const point = domainToThreeJS(realization.point);
      const direction = domainDirectionToThreeJS(new Vector3(realization.getDirection().x, realization.getDirection().y, realization.getDirection().z)).normalize();
      items.push({ id: `reconstructed-line-${line.id}`, kind: 'reconstructed-line', sourceEntityId: line.id, visible: true, style: reconstructedStyle(line), renderGroup: 'reconstructedElements', start: v(point.clone().add(direction.clone().multiplyScalar(-THREE_STYLE.infiniteLineExtent / 2))), end: v(point.clone().add(direction.clone().multiplyScalar(THREE_STYLE.infiniteLineExtent / 2))) });
    }
    for (const segment of world.getAll3DSegments()) {
      if (!isVisible3D(segment)) continue;
      const realization = world.get3DSegmentRealization(segment.id!);
      if (!realization?.isFeasible()) continue;
      items.push({ id: `reconstructed-segment-${segment.id}`, kind: 'reconstructed-segment', sourceEntityId: segment.id, visible: true, style: reconstructedStyle(segment), renderGroup: 'reconstructedElements', start: v(domainToThreeJS(realization.startPoint)), end: v(domainToThreeJS(realization.endPoint)) });
    }
    for (const plane of world.getAllPlanes()) {
      const realization = world.get3DPlaneRealization(plane.id!);
      if (!realization?.feasible || !realization.originPoint || !realization.normal) continue;
      const origin = domainToThreeJS(realization.originPoint);
      const normal = domainDirectionToThreeJS(new Vector3(realization.normal.x, realization.normal.y, realization.normal.z)).normalize();
      const q = new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), normal);
      items.push({ id: `reconstructed-plane-${plane.id}`, kind: 'reconstructed-plane', sourceEntityId: plane.id, visible: true, style: THREE_STYLE.reconstructedPlane, renderGroup: 'reconstructedElements', geometry: { center: v(origin), normal: v(normal), size: getPlaneMeshSize(plane.id), quaternion: { x: q.x, y: q.y, z: q.z, w: q.w } } });
    }
    return items;
  }
}
function v(vector: { x: number; y: number; z: number }): Vec3 { return { x: vector.x, y: vector.y, z: vector.z }; }

import { Quaternion, Vector3, Vector4 } from 'three';
import { applyMatrix4x3, domainDirectionToThreeJS, domainToThreeJS, intersectLinePlane3D, intersectSegmentPlane3D, isPointOnPlane3D } from '@/utils/threeUtils';
import { getPlaneMeshSize } from '@/config/rendering3D';
import type { GuidePresentationDto, Vec3 } from './ThreePresentationModel';
import type { ThreeGuideIntersectionReadModel, ThreeGuideReadPort } from './ThreeGuideReadPort';
import { isVisible3D, THREE_STYLE } from './ThreeStylePolicy';

export class Guide3DSelector {
  select(readPort: ThreeGuideReadPort, selectedIds: readonly string[]): GuidePresentationDto[] {
    const items: GuidePresentationDto[] = [];
    for (const guide of readPort.getSelectedGuideModels(selectedIds)) {
      const planeReal = guide.planeRealization;
      const guideReal = guide.realization;
      if (!planeReal?.feasible || !guideReal?.feasible) continue;
      const guidePoint3D = applyMatrix4x3(guideReal.point1, planeReal.planeTo3D);
      const guideDirection3D = directionFromPlane(guideReal.getDirection(), planeReal.planeTo3D.elements);
      const projectionNormal = projectionPlaneNormal(planeReal.planeTo3D.elements);
      const perpendicularNormal = new Vector3().crossVectors(guideDirection3D, projectionNormal).normalize();
      if (perpendicularNormal.length() < 1e-10) continue;
      const normalThree = domainDirectionToThreeJS(perpendicularNormal).normalize();
      const centerThree = domainToThreeJS(guidePoint3D);
      const quaternion = new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), normalThree);
      items.push({ id: `guide-plane-${guide.id}`, kind: 'guide-perpendicular-plane', sourceEntityId: guide.id, planeId: guide.planeId, visible: true, style: THREE_STYLE.guidePlane, renderGroup: 'guides', geometry: { center: v(centerThree), normal: v(normalThree), size: getPlaneMeshSize(guide.planeId), quaternion: { x: quaternion.x, y: quaternion.y, z: quaternion.z, w: quaternion.w } } });
      items.push(...intersections(readPort.getGuideIntersectionModels(), guidePoint3D, perpendicularNormal, guide.id));
    }
    return items;
  }
}

function directionFromPlane(direction2D: Vector3, matrix: number[]): Vector3 {
  const x = matrix[0] * direction2D.x + matrix[1] * direction2D.y;
  const y = matrix[3] * direction2D.x + matrix[4] * direction2D.y;
  const z = matrix[6] * direction2D.x + matrix[7] * direction2D.y;
  return new Vector3(x, y, z).normalize();
}
function projectionPlaneNormal(e: number[]): Vector3 { return new Vector3().crossVectors(new Vector3(e[0], e[3], e[6]), new Vector3(e[1], e[4], e[7])).normalize(); }
function intersections(models: ThreeGuideIntersectionReadModel, planePoint: Vector4, planeNormal: Vector3, guideId: string): GuidePresentationDto[] {
  const items: GuidePresentationDto[] = [];
  const normal = { x: planeNormal.x, y: planeNormal.y, z: planeNormal.z };
  for (const point of models.points) {
    if (!isVisible3D(point) || !point.cartesian) continue;
    const [x, y, z] = point.cartesian;
    const position = new Vector4(x, y, z, 1);
    if (isPointOnPlane3D(position, planePoint, normal)) items.push(marker(`${guideId}-point-${point.id}`, point.id, position));
  }
  for (const line of models.lines) {
    if (!isVisible3D(line) || !line.point || !line.direction) continue;
    const hit = intersectLinePlane3D(line.point, line.direction, planePoint, normal);
    if (hit) items.push(marker(`${guideId}-line-${line.id}`, line.id, hit));
  }
  for (const segment of models.segments) {
    if (!isVisible3D(segment) || !segment.startPoint || !segment.endPoint) continue;
    const hit = intersectSegmentPlane3D(segment.startPoint, segment.endPoint, planePoint, normal);
    if (hit) items.push(marker(`${guideId}-segment-${segment.id}`, segment.id, hit));
  }
  return items;
}
function marker(id: string, sourceEntityId: string, position: Vector4): GuidePresentationDto { return { id: `guide-intersection-${id}`, kind: 'guide-intersection-marker', sourceEntityId, visible: true, style: THREE_STYLE.guideMarker, renderGroup: 'guides', position: v(domainToThreeJS(position)) }; }
function v(vector: { x: number; y: number; z: number }): Vec3 { return { x: vector.x, y: vector.y, z: vector.z }; }

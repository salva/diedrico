import { Quaternion, Vector3, Vector4 } from 'three';
import type { World } from '@/domain/world/World';
import { isGuide2D, isSiblingGuide2D } from '@/domain/world/Guide';
import { applyMatrix4x3, domainDirectionToThreeJS, domainToThreeJS, intersectLinePlane3D, intersectSegmentPlane3D, isPointOnPlane3D } from '@/utils/threeUtils';
import { getPlaneMeshSize } from '@/config/rendering3D';
import type { GuidePresentationDto, Vec3 } from './ThreePresentationModel';
import { isVisible3D, THREE_STYLE } from './ThreeStylePolicy';

export class Guide3DSelector {
  select(world: World, selectedIds: readonly string[]): GuidePresentationDto[] {
    const items: GuidePresentationDto[] = [];
    for (const selectedId of selectedIds) {
      const line = safeLine(world, selectedId);
      if (!line || (!isGuide2D(line) && !isSiblingGuide2D(line))) continue;
      const planeReal = world.getProjectionPlane3DRealization(line.planeId);
      const guideReal = line.realize2D(world);
      if (!planeReal?.feasible || !guideReal?.feasible) continue;
      const guidePoint3D = applyMatrix4x3(guideReal.point1, planeReal.planeTo3D);
      const guideDirection3D = directionFromPlane(guideReal.getDirection(), planeReal.planeTo3D.elements);
      const projectionNormal = projectionPlaneNormal(planeReal.planeTo3D.elements);
      const perpendicularNormal = new Vector3().crossVectors(guideDirection3D, projectionNormal).normalize();
      if (perpendicularNormal.length() < 1e-10) continue;
      const normalThree = domainDirectionToThreeJS(perpendicularNormal).normalize();
      const centerThree = domainToThreeJS(guidePoint3D);
      const quaternion = new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), normalThree);
      items.push({ id: `guide-plane-${line.id}`, kind: 'guide-perpendicular-plane', sourceEntityId: line.id, planeId: line.planeId, visible: true, style: THREE_STYLE.guidePlane, renderGroup: 'guides', geometry: { center: v(centerThree), normal: v(normalThree), size: getPlaneMeshSize(line.planeId), quaternion: { x: quaternion.x, y: quaternion.y, z: quaternion.z, w: quaternion.w } } });
      items.push(...intersections(world, guidePoint3D, perpendicularNormal, line.id));
    }
    return items;
  }
}

function safeLine(world: World, id: string) { try { return world.getLine2D(id); } catch { return undefined; } }
function directionFromPlane(direction2D: Vector3, matrix: number[]): Vector3 {
  const x = matrix[0] * direction2D.x + matrix[1] * direction2D.y;
  const y = matrix[3] * direction2D.x + matrix[4] * direction2D.y;
  const z = matrix[6] * direction2D.x + matrix[7] * direction2D.y;
  return new Vector3(x, y, z).normalize();
}
function projectionPlaneNormal(e: number[]): Vector3 { return new Vector3().crossVectors(new Vector3(e[0], e[3], e[6]), new Vector3(e[1], e[4], e[7])).normalize(); }
function intersections(world: World, planePoint: Vector4, planeNormal: Vector3, guideId: string): GuidePresentationDto[] {
  const items: GuidePresentationDto[] = [];
  const normal = { x: planeNormal.x, y: planeNormal.y, z: planeNormal.z };
  for (const point of world.getAll3DPoints()) {
    if (!isVisible3D(point)) continue;
    const real = world.get3DPointRealization(point.id!);
    if (!real?.isFeasible()) continue;
    const [x, y, z] = real.getCartesian();
    const position = new Vector4(x, y, z, 1);
    if (isPointOnPlane3D(position, planePoint, normal)) items.push(marker(`${guideId}-point-${point.id}`, point.id!, position));
  }
  for (const line of world.getAll3DLines()) {
    if (!isVisible3D(line)) continue;
    const real = world.get3DLineRealization(line.id!);
    if (!real?.isFeasible()) continue;
    const hit = intersectLinePlane3D(real.point, real.getDirection(), planePoint, normal);
    if (hit) items.push(marker(`${guideId}-line-${line.id}`, line.id!, hit));
  }
  for (const segment of world.getAll3DSegments()) {
    if (!isVisible3D(segment)) continue;
    const real = world.get3DSegmentRealization(segment.id!);
    if (!real?.isFeasible()) continue;
    const hit = intersectSegmentPlane3D(real.startPoint, real.endPoint, planePoint, normal);
    if (hit) items.push(marker(`${guideId}-segment-${segment.id}`, segment.id!, hit));
  }
  return items;
}
function marker(id: string, sourceEntityId: string, position: Vector4): GuidePresentationDto { return { id: `guide-intersection-${id}`, kind: 'guide-intersection-marker', sourceEntityId, visible: true, style: THREE_STYLE.guideMarker, renderGroup: 'guides', position: v(domainToThreeJS(position)) }; }
function v(vector: { x: number; y: number; z: number }): Vec3 { return { x: vector.x, y: vector.y, z: vector.z }; }

import { Vector4 } from 'three';
import { domainToThreeJS, intersectLinePlane3D, intersectSegmentPlane3D, isPointOnPlane3D } from '@/utils/threeUtils';
import type { GuidePresentationDto, Vec3 } from './ThreePresentationModel';
import type { ThreeGuideIntersectionReadModel, ThreeGuideSourceDto } from './ThreePresentationReadModel';
import { isVisible, THREE_STYLE } from './ThreeStylePolicy';

export class Guide3DSelector {
  select(guides: ThreeGuideSourceDto[], intersectionModels: ThreeGuideIntersectionReadModel | undefined): GuidePresentationDto[] {
    const items: GuidePresentationDto[] = [];
    for (const guide of guides) {
      if (!isVisible(guide)) continue;
      const planePoint = vec4(guide.planePoint);
      const planeNormal = guide.planeNormal;
      items.push({ id: `guide-plane-${guide.id}`, kind: 'guide-perpendicular-plane', sourceEntityId: guide.id, planeId: guide.planeId, visible: true, style: guide.style, renderGroup: 'guides', geometry: guide.geometry });
      if (intersectionModels) items.push(...intersections(intersectionModels, planePoint, planeNormal, guide.id));
    }
    return items;
  }
}

function intersections(models: ThreeGuideIntersectionReadModel, planePoint: Vector4, planeNormal: Vec3, guideId: string): GuidePresentationDto[] {
  const items: GuidePresentationDto[] = [];
  for (const point of models.points) {
    if (!isVisible(point)) continue;
    const position = vec4(point.position);
    if (isPointOnPlane3D(position, planePoint, planeNormal)) items.push(marker(`${guideId}-point-${point.id}`, point.id, position));
  }
  for (const line of models.lines) {
    if (!isVisible(line)) continue;
    const hit = intersectLinePlane3D(vec4(line.point), line.direction, planePoint, planeNormal);
    if (hit) items.push(marker(`${guideId}-line-${line.id}`, line.id, hit));
  }
  for (const segment of models.segments) {
    if (!isVisible(segment)) continue;
    const hit = intersectSegmentPlane3D(vec4(segment.start), vec4(segment.end), planePoint, planeNormal);
    if (hit) items.push(marker(`${guideId}-segment-${segment.id}`, segment.id, hit));
  }
  return items;
}

function marker(id: string, sourceEntityId: string, position: Vector4): GuidePresentationDto { return { id: `guide-intersection-${id}`, kind: 'guide-intersection-marker', sourceEntityId, visible: true, style: THREE_STYLE.guideMarker, renderGroup: 'guides', position: v(domainToThreeJS(position)) }; }
function vec4(vector: Vec3): Vector4 { return new Vector4(vector.x, vector.y, vector.z, 1); }
function v(vector: { x: number; y: number; z: number }): Vec3 { return { x: vector.x, y: vector.y, z: vector.z }; }

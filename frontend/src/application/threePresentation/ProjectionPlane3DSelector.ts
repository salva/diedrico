import { Vector3, Vector4 } from 'three';
import { domainDirectionToThreeJS, domainToThreeJS } from '@/utils/threeUtils';
import type { AxisDto, LabelDto, ProjectionPlanePresentationDto, Vec3 } from './ThreePresentationModel';
import type { ThreeProjectionPlaneReadModel } from './ThreeProjectionPlaneBuilder';
import { THREE_STYLE } from './ThreeStylePolicy';

export class ProjectionPlane3DSelector {
  select(planes: ThreeProjectionPlaneReadModel[], showPlanes: boolean, showGrid: boolean, showReferenceAxes: boolean): ProjectionPlanePresentationDto[] {
    const items: ProjectionPlanePresentationDto[] = [];
    if (showReferenceAxes) items.push(...referenceAxes());
    if (!showPlanes) return items;

    for (const plane of planes) {
      items.push({ id: `surface-${plane.id}`, kind: 'projection-plane-surface', sourceEntityId: plane.id, planeId: plane.id, visible: true, style: THREE_STYLE.projectionPlane, renderGroup: 'projectionPlanes', geometry: plane.surface });

      if (showGrid) {
        items.push({ id: `grid-${plane.id}`, kind: 'projection-plane-grid', sourceEntityId: plane.id, planeId: plane.id, visible: true, style: THREE_STYLE.grid, renderGroup: 'projectionPlanes', segments: plane.gridSegments });
      }

      if (plane.kind === 'auxiliary' && showReferenceAxes && plane.auxiliaryAxes) {
        const origin = domainToThreeJS(new Vector4(plane.auxiliaryAxes.origin.x, plane.auxiliaryAxes.origin.y, plane.auxiliaryAxes.origin.z, 1));
        const uDomain = new Vector3(plane.auxiliaryAxes.uDirection.x, plane.auxiliaryAxes.uDirection.y, plane.auxiliaryAxes.uDirection.z);
        const vDomain = new Vector3(plane.auxiliaryAxes.vDirection.x, plane.auxiliaryAxes.vDirection.y, plane.auxiliaryAxes.vDirection.z);
        items.push(...auxiliaryAxes(plane.id, origin, uDomain, vDomain));
      }
    }
    return items;
  }
}

function referenceAxes(): (AxisDto | LabelDto)[] {
  const axes = [ ['x', 'X', 0xff0000, new Vector3(1, 0, 0)], ['y', 'Y', 0x00ff00, new Vector3(0, 1, 0)], ['z', 'Z', 0x0000ff, new Vector3(0, 0, 1)] ] as const;
  return axes.flatMap(([axis, label, color, domainDir]) => axisDto(`reference-axis-${axis}`, 'reference-axis', axis, label, color, new Vector3(), domainDirectionToThreeJS(domainDir), THREE_STYLE.referenceAxisLength));
}

function auxiliaryAxes(planeId: string, origin: Vector3, uDomain: Vector3, vDomain: Vector3): (AxisDto | LabelDto)[] {
  return [
    ...axisDto(`auxiliary-axis-u-${planeId}`, 'auxiliary-axis', 'u', 'U', 0x8b008b, origin, domainDirectionToThreeJS(uDomain.clone().normalize()), THREE_STYLE.auxiliaryAxisLength, planeId),
    ...axisDto(`auxiliary-axis-v-${planeId}`, 'auxiliary-axis', 'v', 'V', 0x8b008b, origin, domainDirectionToThreeJS(vDomain.clone().normalize()), THREE_STYLE.auxiliaryAxisLength, planeId),
  ];
}

function axisDto(id: string, kind: AxisDto['kind'], axis: string, label: string, color: number, origin: Vector3, direction: Vector3, length: number, planeId?: string): (AxisDto | LabelDto)[] {
  const normalized = direction.clone().normalize();
  const position = origin.clone().add(normalized.clone().multiplyScalar(length + 1));
  return [
    { id, kind, axis, label, sourceEntityId: planeId, planeId, visible: true, style: { color }, renderGroup: 'axes', origin: v(origin), direction: v(normalized), length },
    { id: `${id}-label`, kind: 'axis-label', text: label, sourceEntityId: planeId, planeId, visible: true, style: { color: 0x333333 }, renderGroup: 'labels', position: v(position), className: 'axis-label' },
  ];
}

function v(vector: { x: number; y: number; z: number }): Vec3 { return { x: vector.x, y: vector.y, z: vector.z }; }

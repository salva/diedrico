import { Vector3, Vector4 } from 'three';
import { applyMatrix4x3, domainDirectionToThreeJS, domainToThreeJS, type Matrix4x3 } from '@/utils/threeUtils';
import { convertPlaneRectangleTo2D, generateClippedGrid, type Segment2D } from '@/utils/rectangleGrid';
import { getPlaneMeshSize, PLANE_RENDERING_CONFIG } from '@/config/rendering3D';
import type { AxisDto, LabelDto, ProjectionPlanePresentationDto, SegmentGeometryDto, Vec3 } from './ThreePresentationModel';
import type { ThreeProjectionPlaneReadModel, ThreeProjectionPlaneReadPort } from './ThreeProjectionPlaneReadPort';
import { THREE_STYLE } from './ThreeStylePolicy';

export class ProjectionPlane3DSelector {
  select(readPort: ThreeProjectionPlaneReadPort, showPlanes: boolean, showGrid: boolean, showReferenceAxes: boolean): ProjectionPlanePresentationDto[] {
    const items: ProjectionPlanePresentationDto[] = [];
    if (showReferenceAxes) items.push(...referenceAxes());
    if (!showPlanes) return items;

    for (const plane of readPort.getProjectionPlaneModels()) {
      const realization = plane.realization;
      if (!realization?.feasible) continue;
      const basis = planeBasis(realization.planeTo3D.elements);
      const size = getPlaneMeshSize(plane.id);
      const center = domainToThreeJS(new Vector4(basis.origin.x, basis.origin.y, basis.origin.z, 1));
      const normalThree = domainDirectionToThreeJS(basis.normal.clone().normalize());
      items.push({ id: `surface-${plane.id}`, kind: 'projection-plane-surface', sourceEntityId: plane.id, planeId: plane.id, visible: true, style: THREE_STYLE.projectionPlane, renderGroup: 'projectionPlanes', geometry: { center: v(center), normal: v(normalThree), size } });

      if (showGrid) {
        items.push({ id: `grid-${plane.id}`, kind: 'projection-plane-grid', sourceEntityId: plane.id, planeId: plane.id, visible: true, style: THREE_STYLE.grid, renderGroup: 'projectionPlanes', segments: gridSegments(readPort, plane.id).map(segment => to3DSegment(segment, realization.planeTo3D)) });
      }

      if (plane.kind === 'auxiliary' && showReferenceAxes) {
        items.push(...auxiliaryAxes(plane.id, basis.origin, basis.uAxis, basis.vAxis));
      }
    }
    return items;
  }
}

function gridSegments(readPort: ThreeProjectionPlaneReadPort, planeId: ThreeProjectionPlaneReadModel['id']): Segment2D[] {
  const { plane3DRealization, projectionRealization } = readPort.getProjectionPlaneGridSource(planeId);
  if (!plane3DRealization?.feasible || !projectionRealization) return fallbackGrid();
  const corners = plane3DRealization.getRectangleCorners(PLANE_RENDERING_CONFIG.MESH_SIZE / 2) as [Vector4, Vector4, Vector4, Vector4];
  return generateClippedGrid(convertPlaneRectangleTo2D(corners, projectionRealization.threeDToPlane), PLANE_RENDERING_CONFIG.FALLBACK_GRID.DIVISIONS);
}

function fallbackGrid(): Segment2D[] {
  const segments: Segment2D[] = [];
  const halfSize = PLANE_RENDERING_CONFIG.FALLBACK_GRID.HALF_SIZE;
  const step = (halfSize * 2) / PLANE_RENDERING_CONFIG.FALLBACK_GRID.DIVISIONS;
  for (let i = 0; i <= PLANE_RENDERING_CONFIG.FALLBACK_GRID.DIVISIONS; i++) {
    const t = -halfSize + i * step;
    segments.push({ start: { u: -halfSize, v: t }, end: { u: halfSize, v: t } }, { start: { u: t, v: -halfSize }, end: { u: t, v: halfSize } });
  }
  return segments;
}

function to3DSegment(segment: Segment2D, matrix: Matrix4x3): SegmentGeometryDto {
  const start = domainToThreeJS(applyMatrix4x3(new Vector3(segment.start.u, segment.start.v, 1), matrix));
  const end = domainToThreeJS(applyMatrix4x3(new Vector3(segment.end.u, segment.end.v, 1), matrix));
  return { start: v(start), end: v(end) };
}

function planeBasis(e: number[]) {
  const origin = new Vector3(e[2] / e[11], e[5] / e[11], e[8] / e[11]);
  const uAxis = new Vector3(e[0], e[3], e[6]);
  const vAxis = new Vector3(e[1], e[4], e[7]);
  const normal = new Vector3().crossVectors(uAxis, vAxis).normalize();
  return { origin, uAxis, vAxis, normal };
}

function referenceAxes(): (AxisDto | LabelDto)[] {
  const axes = [ ['x', 'X', 0xff0000, new Vector3(1, 0, 0)], ['y', 'Y', 0x00ff00, new Vector3(0, 1, 0)], ['z', 'Z', 0x0000ff, new Vector3(0, 0, 1)] ] as const;
  return axes.flatMap(([axis, label, color, domainDir]) => axisDto(`reference-axis-${axis}`, 'reference-axis', axis, label, color, new Vector3(), domainDirectionToThreeJS(domainDir), THREE_STYLE.referenceAxisLength));
}

function auxiliaryAxes(planeId: string, originDomain: Vector3, uDomain: Vector3, vDomain: Vector3): (AxisDto | LabelDto)[] {
  const origin = domainToThreeJS(new Vector4(originDomain.x, originDomain.y, originDomain.z, 1));
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

import { Vector3, Vector4 } from 'three';
import { AuxiliaryProjectionPlane } from '@/domain/world/projectionPlane/AuxiliaryProjectionPlane';
import type { ProjectionPlaneRealization3D } from '@/domain/world/projectionPlane/ProjectionPlaneRealization';
import type { Plane3DRealization3D } from '@/domain/world/Element3DRealization3D';
import type { ThreePresentationContext } from './ThreePresentationContext';
import { getPlaneMeshSize, PLANE_RENDERING_CONFIG } from '@/config/rendering3D';
import { applyMatrix4x3, domainDirectionToThreeJS, domainToThreeJS, type Matrix4x3 } from '@/utils/threeUtils';
import { convertPlaneRectangleTo2D, generateClippedGrid, type Segment2D } from '@/utils/rectangleGrid';
import type { SegmentGeometryDto, Vec3 } from './ThreePresentationModel';
import type { ThreeProjectionPlaneSourceDto } from './ThreePresentationReadModel';

export type ThreeProjectionPlaneReadModel = ThreeProjectionPlaneSourceDto;

export function buildProjectionPlaneModels(context: ThreePresentationContext): ThreeProjectionPlaneReadModel[] {
  return context.getProjectionPlanes().flatMap(plane => {
      if (!context.isElementVisible(plane)) return [];
      const projectionRealization = context.getProjectionPlane3DRealization(plane.id);
      if (!projectionRealization) throw new Error(`Missing 3D realization for projection plane ${plane.id}`);
      if (!projectionRealization.feasible) return [];
      const plane3DId = plane instanceof AuxiliaryProjectionPlane ? plane.plane3DId : plane.id;
      const basis = planeBasis(projectionRealization.planeTo3D.elements);
      const center = domainToThreeJS(new Vector4(basis.origin.x, basis.origin.y, basis.origin.z, 1));
      const normalThree = domainDirectionToThreeJS(basis.normal.clone().normalize());
      const surface = { center: v(center), normal: v(normalThree), size: getPlaneMeshSize(plane.id) };
      return [{
        id: plane.id,
        kind: plane instanceof AuxiliaryProjectionPlane ? 'auxiliary' : 'fixed',
        plane3DId,
        surface,
        gridSegments: gridSegments(plane3DId ? context.get3DPlaneRealization(plane3DId) : undefined, projectionRealization).map(segment => to3DSegment(segment, projectionRealization.planeTo3D)),
        auxiliaryAxes: plane instanceof AuxiliaryProjectionPlane ? { origin: v(basis.origin), uDirection: v(basis.uAxis), vDirection: v(basis.vAxis) } : undefined,
      }];
    });
}

function gridSegments(plane3DRealization: Plane3DRealization3D | undefined, projectionRealization: ProjectionPlaneRealization3D): Segment2D[] {
  if (!plane3DRealization?.feasible) return fallbackGrid();
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

function v(vector: { x: number; y: number; z: number }): Vec3 { return { x: vector.x, y: vector.y, z: vector.z }; }

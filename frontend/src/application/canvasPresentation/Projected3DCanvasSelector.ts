import { Matrix3 } from 'three';
import type { ProjectionPlaneRealization3D } from '@/domain/world/projectionPlane/ProjectionPlaneRealization';
import type { Point3DRealization3D, Line3DRealization3D, Segment3DRealization3D } from '@/domain/world/Element3DRealization3D';
import { RenderLayer, type LinePrimitive, type PointPrimitive, type SegmentPrimitive } from '@/domain/presentation/Paper';
import { applyMatrix3x4 } from '@/utils/threeUtils';
import type { CanvasPlaneTransformModel, CanvasRenderItem } from './CanvasPresentationModel';
import { PROJECTED_LINE_STYLE, PROJECTED_POINT_STYLE, PROJECTED_SEGMENT_STYLE } from './CanvasStylePolicy';
import { canvasRenderItem } from './CanvasRenderItemFactory';

export interface Projected3DCanvasPlaneSource {
  id: string;
}

export interface Projected3DPointCanvasSource {
  id: string;
  realization: Point3DRealization3D;
}

export interface Projected3DLineCanvasSource {
  id: string;
  realization: Line3DRealization3D;
}

export interface Projected3DSegmentCanvasSource {
  id: string;
  realization: Segment3DRealization3D;
}

export interface Projected3DCanvasReadPort {
  getProjectionPlanes(): Projected3DCanvasPlaneSource[];
  getProjectionPlane3DRealization(planeId: string): ProjectionPlaneRealization3D | undefined;
  get3DPoints(): Projected3DPointCanvasSource[];
  get3DLines(): Projected3DLineCanvasSource[];
  get3DSegments(): Projected3DSegmentCanvasSource[];
}

export class Projected3DCanvasSelector {
  selectWorldProjection(readPort: Projected3DCanvasReadPort, planeTransforms: Map<string, Pick<CanvasPlaneTransformModel, 'planeToPaper'> | { planeToPaper: Matrix3 }>): CanvasRenderItem[] {
    const items: CanvasRenderItem[] = [];
    const EPSILON = 1e-10;

    for (const plane of readPort.getProjectionPlanes()) {
      const planeRealization = readPort.getProjectionPlane3DRealization(plane.id);
      const planeToPaper = planeTransforms.get(plane.id)?.planeToPaper;
      if (!planeRealization || !planeToPaper) continue;

      for (const point3D of readPort.get3DPoints()) {
        const realization = point3D.realization;
        if (!realization?.isFeasible()) continue;
        const primitive: PointPrimitive = {
          type: 'point',
          id: `proj3d-point-${point3D.id}-on-${plane.id}`,
          sourceEntityId: point3D.id,
          planeId: plane.id,
          layer: RenderLayer.Guides + 3,
          visible: true,
          style: PROJECTED_POINT_STYLE,
          position: applyMatrix3x4(realization.position, planeRealization.threeDToPlane).applyMatrix3(planeToPaper),
          radius: 6,
        };
        items.push(canvasRenderItem(primitive, 'projected-3d-point'));
      }

      for (const line3D of readPort.get3DLines()) {
        const realization = line3D.realization;
        if (!realization?.isFeasible()) continue;
        const direction = applyMatrix3x4(realization.direction, planeRealization.threeDToPlane);
        if (direction.length() < EPSILON) continue;
        const primitive: LinePrimitive = {
          type: 'line',
          id: `proj3d-line-${line3D.id}-on-${plane.id}`,
          sourceEntityId: line3D.id,
          planeId: plane.id,
          layer: RenderLayer.Guides + 3,
          visible: true,
          style: PROJECTED_LINE_STYLE,
          point: applyMatrix3x4(realization.point, planeRealization.threeDToPlane).applyMatrix3(planeToPaper),
          direction: direction.applyMatrix3(planeToPaper),
        };
        items.push(canvasRenderItem(primitive, 'projected-3d-line'));
      }

      for (const segment3D of readPort.get3DSegments()) {
        const realization = segment3D.realization;
        if (!realization?.isFeasible()) continue;
        const primitive: SegmentPrimitive = {
          type: 'segment',
          id: `proj3d-segment-${segment3D.id}-on-${plane.id}`,
          sourceEntityId: segment3D.id,
          planeId: plane.id,
          layer: RenderLayer.Guides + 3,
          visible: true,
          style: PROJECTED_SEGMENT_STYLE,
          point1: applyMatrix3x4(realization.startPoint, planeRealization.threeDToPlane).applyMatrix3(planeToPaper),
          point2: applyMatrix3x4(realization.endPoint, planeRealization.threeDToPlane).applyMatrix3(planeToPaper),
        };
        items.push(canvasRenderItem(primitive, 'projected-3d-segment'));
      }
    }

    return items;
  }
}

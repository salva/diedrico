import { Matrix3 } from 'three';
import { RenderLayer, type LinePrimitive, type PointPrimitive, type SegmentPrimitive } from '@/domain/presentation/Paper';
import { applyMatrix3x4 } from '@/utils/threeUtils';
import type { CanvasRenderItem } from './CanvasPresentationModel';
import { PROJECTED_LINE_STYLE, PROJECTED_POINT_STYLE, PROJECTED_SEGMENT_STYLE } from './CanvasStylePolicy';
import type { CanvasWorldReadPort } from './CanvasWorldReadPort';
import { canvasRenderItem } from './CanvasPresentationSelector';

export class Projected3DCanvasSelector {
  select(readPort: CanvasWorldReadPort, planeTransforms: Map<string, { planeToPaper: Matrix3 }>): CanvasRenderItem[] {
    const items: CanvasRenderItem[] = [];
    const EPSILON = 1e-10;

    for (const plane of readPort.getAllProjectionPlanes()) {
      const planeRealization = readPort.getProjectionPlane3DRealization(plane.id);
      const planeToPaper = planeTransforms.get(plane.id)?.planeToPaper;
      if (!planeRealization || !planeToPaper) continue;

      for (const point3D of readPort.getAll3DPoints()) {
        const realization = readPort.realizePoint3D(point3D);
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

      for (const line3D of readPort.getAll3DLines()) {
        const realization = readPort.realizeLine3D(line3D);
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

      for (const segment3D of readPort.getAll3DSegments()) {
        const realization = readPort.realizeSegment3D(segment3D);
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

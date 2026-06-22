import { Matrix3 } from 'three';
import type { ProjectionPlaneRealization3D } from '@/domain/world/projectionPlane/ProjectionPlaneRealization';
import type { Point3DRealization3D, Line3DRealization3D, Segment3DRealization3D } from '@/domain/world/Element3DRealization3D';
import type { Element3DRealizationContext } from '@/domain/world/projectionPlane/ProjectionPlaneContext';
import type { RealizationService } from '@/domain/world/RealizationService';
import type { World } from '@/domain/world/World';
import { RenderLayer, type LinePrimitive, type PointPrimitive, type SegmentPrimitive } from '@/domain/presentation/Paper';
import { applyMatrix3x4 } from '@/utils/threeUtils';
import type { CanvasPlaneTransformModel, CanvasRenderItem } from './CanvasPresentationModel';
import { PROJECTED_LINE_STYLE, PROJECTED_POINT_STYLE, PROJECTED_SEGMENT_STYLE } from './CanvasStylePolicy';
import { canvasRenderItem } from './CanvasRenderItemFactory';

interface Projected3DCanvasPlaneSource {
  id: string;
}

interface Projected3DPointCanvasSource {
  id: string;
  realization: Point3DRealization3D;
}

interface Projected3DLineCanvasSource {
  id: string;
  realization: Line3DRealization3D;
}

interface Projected3DSegmentCanvasSource {
  id: string;
  realization: Segment3DRealization3D;
}

interface Projected3DCanvasBuilderInput {
  world: World;
  realizations: RealizationService;
  realizationContext: Element3DRealizationContext;
  planeTransforms: Map<string, Pick<CanvasPlaneTransformModel, 'planeToPaper'> | { planeToPaper: Matrix3 }>;
}

export function buildProjected3DCanvasItems(input: Projected3DCanvasBuilderInput): CanvasRenderItem[] {
  const { world, realizationContext, realizations, planeTransforms } = input;
  return new Projected3DCanvasSelector().selectWorldProjection({
    projectionPlanes: world.getAllProjectionPlanes().map(plane => ({ id: plane.id })),
    getProjectionPlane3DRealization: planeId => {
      const plane = world.getProjectionPlaneById(planeId);
      return plane ? realizations.realizeProjectionPlane3D(plane, realizationContext) : undefined;
    },
    points3D: world.getAll3DPoints().flatMap(point => {
      const realization = realizations.realizePoint3D(point, realizationContext);
      return realization ? [{ id: point.id, realization }] : [];
    }),
    lines3D: world.getAll3DLines().flatMap(line => {
      const realization = realizations.realizeLine3D(line, realizationContext);
      return realization ? [{ id: line.id, realization }] : [];
    }),
    segments3D: world.getAll3DSegments().flatMap(segment => {
      const realization = realizations.realizeSegment3D(segment, realizationContext);
      return realization ? [{ id: segment.id, realization }] : [];
    }),
  }, planeTransforms);
}

interface Projected3DCanvasSources {
  projectionPlanes: Projected3DCanvasPlaneSource[];
  getProjectionPlane3DRealization(planeId: string): ProjectionPlaneRealization3D | undefined;
  points3D: Projected3DPointCanvasSource[];
  lines3D: Projected3DLineCanvasSource[];
  segments3D: Projected3DSegmentCanvasSource[];
}

export class Projected3DCanvasSelector {
  selectWorldProjection(sources: Projected3DCanvasSources, planeTransforms: Map<string, Pick<CanvasPlaneTransformModel, 'planeToPaper'> | { planeToPaper: Matrix3 }>): CanvasRenderItem[] {
    const items: CanvasRenderItem[] = [];
    const EPSILON = 1e-10;
    const points3D = sources.points3D;
    const lines3D = sources.lines3D;
    const segments3D = sources.segments3D;

    for (const plane of sources.projectionPlanes) {
      const planeRealization = sources.getProjectionPlane3DRealization(plane.id);
      const planeToPaper = planeTransforms.get(plane.id)?.planeToPaper;
      if (!planeRealization || !planeToPaper) continue;

      for (const point3D of points3D) {
        const realization = point3D.realization;
        if (!realization.isFeasible()) continue;
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

      for (const line3D of lines3D) {
        const realization = line3D.realization;
        if (!realization.isFeasible()) continue;
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

      for (const segment3D of segments3D) {
        const realization = segment3D.realization;
        if (!realization.isFeasible()) continue;
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

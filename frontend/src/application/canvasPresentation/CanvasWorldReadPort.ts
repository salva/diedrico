import { Guide2D, SiblingGuide2D } from '@/domain/world/Guide';
import { HalfHingeLine2D } from '@/domain/world/HingeLine';
import { Segment2DByPoints } from '@/domain/world/Segment';
import type { ProjectionElementRealizationContext } from '@/domain/world/projectionPlane/ProjectionPlaneContext';
import type { World } from '@/domain/world/World';
import type { CanvasPlaneCanvasItems, CanvasPlaneItem, CanvasPlaneLineItem, CanvasPlaneTransformModel, CanvasRenderItem } from './CanvasPresentationModel';
import { resolveVisibility } from '@/domain/world/styleService';
import { Projected3DCanvasSelector } from './Projected3DCanvasSelector';
import { createProjected3DCanvasReadPort } from './Projected3DCanvasReadPort';
import { createWorldRealizationContext } from '@/application/presentation/WorldRealizationContext';

export interface CanvasWorldReadPort {
  getCanvasPlaneTransforms(): CanvasPlaneTransformModel[];
  getPlaneCanvasItems(): CanvasPlaneCanvasItems[];
  getProjected3DCanvasItems(planeTransforms: Map<string, CanvasPlaneTransformModel>): CanvasRenderItem[];
}

function getCanvasPlaneTransforms(world: World): CanvasPlaneTransformModel[] {
  return world.getAllProjectionPlanes().flatMap((plane) => {
    const realization = world.getProjectionPlane2DRealization(plane.id);
    if (!realization) return [];
    return [{ planeId: plane.id, planeToPaper: realization.planeToPaper2D, paperToPlane: realization.paperToPlane2D }];
  });
}

function getPlaneCanvasItems(world: World, context: ProjectionElementRealizationContext): CanvasPlaneCanvasItems[] {
  return world.getAllProjectionPlanes().flatMap((plane) => {
    const transform = getCanvasPlaneTransforms(world).find(item => item.planeId === plane.id);
    if (!transform) return [];
    const items: CanvasPlaneItem[] = [];

    for (const point of plane.getAllPoints()) {
      if (!resolveVisibility(point, world)) continue;
      const realization = plane.realizePoint2D(point, context);
      if (!realization) continue;
      items.push({
        kind: 'point',
        elementId: point.id,
        planeId: point.planeId,
        position: realization.position.clone(),
        pointRole: point.constructor.name === 'FreePoint2D' ? 'free' : 'dependent',
      });
    }

    for (const line of plane.getAllLines()) {
      if (!resolveVisibility(line, world)) continue;
      const realization = plane.realizeLine2D(line, context);
      if (!realization) continue;
      const kind: CanvasPlaneLineItem['kind'] = line instanceof HalfHingeLine2D
        ? 'half-hinge-line'
        : line instanceof Segment2DByPoints
          ? 'finite-segment'
          : line instanceof SiblingGuide2D
            ? 'sibling-guide'
            : line instanceof Guide2D
              ? 'guide'
              : 'infinite-line';
      items.push({
        kind,
        elementId: line.id,
        planeId: line.planeId,
        point: realization.point1.clone(),
        direction: realization.getDirection(),
        point1: kind === 'finite-segment' ? realization.point1.clone() : undefined,
        point2: kind === 'finite-segment' ? realization.point2.clone() : undefined,
        arcGeometry: optionalArcGeometry(line),
      });
    }

    for (const circle of plane.getAllCircles()) {
      if (!resolveVisibility(circle, world)) continue;
      const realization = plane.realizeCircle2D(circle, context);
      if (!realization) continue;
      items.push({
        kind: 'circle',
        elementId: circle.id,
        planeId: circle.planeId,
        center: realization.center.clone(),
        radius: realization.getRadius(),
        radiusVector: realization.radiusVector.clone(),
      });
    }

    return [{ planeId: plane.id, transform, items }];
  });
}

export function createCanvasWorldReadPort(world: World): CanvasWorldReadPort {
  const realizationContext = createWorldRealizationContext(world);
  const projected3DSelector = new Projected3DCanvasSelector();
  return {
    getCanvasPlaneTransforms: () => getCanvasPlaneTransforms(world),
    getPlaneCanvasItems: () => getPlaneCanvasItems(world, realizationContext),
    getProjected3DCanvasItems: planeTransforms => projected3DSelector.selectWorldProjection(createProjected3DCanvasReadPort(world, realizationContext), planeTransforms),
  };
}

export type CanvasPlaneTransformMap = Map<string, CanvasPlaneTransformModel>;

function optionalArcGeometry(line: object): CanvasPlaneLineItem['arcGeometry'] | undefined {
  return 'arcGeometry' in line ? line.arcGeometry as CanvasPlaneLineItem['arcGeometry'] | undefined : undefined;
}

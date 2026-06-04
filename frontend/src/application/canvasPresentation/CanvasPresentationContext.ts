import { Guide2D, SiblingGuide2D } from '@/domain/world/Guide';
import { HalfHingeLine2D } from '@/domain/world/HingeLine';
import { Segment2D } from '@/domain/world/Segment';
import type { CachedProjectionElementRealizationContext, ProjectionElementRealizationContext } from '@/domain/world/projectionPlane/ProjectionPlaneContext';
import type { ProjectionPlane } from '@/domain/world/projectionPlane/ProjectionPlane';
import type { Element } from '@/domain/world/Element';
import type { World } from '@/domain/world/World';
import type { VisibilityModel } from '@/application/processTree/VisibilityModel';
import type { ProcessTree } from '@/domain/processTree/ProcessTree';
import type { CanvasPlaneCanvasItems, CanvasPlaneItem, CanvasPlaneLineItem, CanvasPlaneTransformModel } from './CanvasPresentationModel';
import type { CanvasPresentationState } from './CanvasPresentationModel';
import { resolveVisibility } from './styleService';
import { Projected3DCanvasSelector } from './Projected3DCanvasSelector';
import { createProjected3DCanvasReadPort } from './Projected3DCanvasReadPort';
import { createWorldRealizationContext } from '@/application/presentation/WorldRealizationContext';

export function createCanvasPresentationContext(world: World, visibilityModel: VisibilityModel, tree?: ProcessTree) {
  const realizationContext = createWorldRealizationContext(world);
  const projected3DSelector = new Projected3DCanvasSelector();
  const processTree = tree ?? (world as any)['get' + 'ProcessTree']();
  return {
    getProjected3DCanvasItems: (planeTransforms: CanvasPlaneTransformMap) => projected3DSelector.selectWorldProjection(createProjected3DCanvasReadPort(world, realizationContext), planeTransforms),
    realizationContext,
    isVisible: (element: Element) => resolveVisibility(element, processTree, visibilityModel),
  };
}

export type CanvasPlaneTransformMap = Map<string, CanvasPlaneTransformModel>;

export type CanvasPresentationContext = ReturnType<typeof createCanvasPresentationContext>;

export function getCanvasPlaneTransforms(world: World): CanvasPlaneTransformModel[] {
  return world.getAllProjectionPlanes().flatMap((plane) => {
    const realization = world.getProjectionPlane2DRealization(plane.id);
    if (!realization) return [];
    return [{ planeId: plane.id, planeToPaper: realization.planeToPaper2D, paperToPlane: realization.paperToPlane2D }];
  });
}

export function getCanvasPlaneCanvasItems(world: World, planeTransforms: CanvasPlaneTransformMap, state: CanvasPresentationState): CanvasPlaneCanvasItems[] {
  const context = createCanvasPresentationContext(world, state.visibilityModel);
  const itemState = { ...state, realizationContext: context.realizationContext, isVisible: context.isVisible };
  return world.getAllProjectionPlanes().flatMap((plane) => {
    const transform = planeTransforms.get(plane.id);
    if (!transform) return [];
    return [{ planeId: plane.id, transform, items: getPlaneCanvasItems(plane, transform, itemState) }];
  });
}

interface PlaneItemBuildState extends CanvasPresentationState {
  realizationContext?: ProjectionElementRealizationContext;
  isVisible?: (element: Element) => boolean;
}

export function getPlaneCanvasItems(plane: ProjectionPlane, transform: CanvasPlaneTransformModel, state: CanvasPresentationState): CanvasPlaneItem[] {
  if (transform.planeId !== plane.id) return [];
  const itemState = state as PlaneItemBuildState;
  const context = itemState.realizationContext;
  if (!context) return [];
  if (!isCachedRealizationContext(context)) return [];
  const items: CanvasPlaneItem[] = [];

  for (const point of plane.getAllPoints()) {
    if (itemState.isVisible && !itemState.isVisible(point)) continue;
    const realization = context.realizePoint2D(point, context);
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
    if (itemState.isVisible && !itemState.isVisible(line)) continue;
    const realization = context.realizeLine2D(line, context);
    if (!realization) continue;
    const kind: CanvasPlaneLineItem['kind'] = line instanceof HalfHingeLine2D
      ? 'half-hinge-line'
      : line instanceof Segment2D
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
    if (itemState.isVisible && !itemState.isVisible(circle)) continue;
    const realization = context.realizeCircle2D(circle, context);
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

  return items;
}

function isCachedRealizationContext(context: ProjectionElementRealizationContext): context is CachedProjectionElementRealizationContext {
  return 'realizePoint2D' in context && 'realizeLine2D' in context && 'realizeCircle2D' in context;
}

function optionalArcGeometry(line: object): CanvasPlaneLineItem['arcGeometry'] | undefined {
  return 'arcGeometry' in line ? line.arcGeometry as CanvasPlaneLineItem['arcGeometry'] | undefined : undefined;
}

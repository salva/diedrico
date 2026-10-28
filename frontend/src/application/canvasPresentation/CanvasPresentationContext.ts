import { BrokenHalfHingeLine2D } from '@/domain/world/elements/BrokenHalfHingeLine2D';
import { computeArcGeometry } from '@/utils/arcGeometry';
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
import { buildProjected3DCanvasItems } from './Projected3DCanvasSelector';
import { createWorldRealizationContext } from '@/domain/world/WorldRealizationContext';
import type { RealizationService } from '@/domain/world/RealizationService';

export function createCanvasPresentationContext(world: World, visibilityModel: VisibilityModel, processTree: ProcessTree, realizations: RealizationService) {
  const realizationContext = createWorldRealizationContext(world, realizations);
  return {
    getProjected3DCanvasItems: (planeTransforms: CanvasPlaneTransformMap) => buildProjected3DCanvasItems({ world, realizations, realizationContext, planeTransforms, isVisible: element => resolveVisibility(element, processTree, visibilityModel) }),
    realizationContext,
    isVisible: (element: Element) => resolveVisibility(element, processTree, visibilityModel),
  };
}

export type CanvasPlaneTransformMap = Map<string, CanvasPlaneTransformModel>;

export type CanvasPresentationContext = ReturnType<typeof createCanvasPresentationContext>;

export function getCanvasPlaneTransforms(world: World, realizations: RealizationService): CanvasPlaneTransformModel[] {
  const realizationContext = createWorldRealizationContext(world, realizations);
  return world.getAllProjectionPlanes().flatMap((plane) => {
    const realization = realizations.realizeProjectionPlane2D(plane, realizationContext);
    if (!realization || !realization.feasible) return [];
    return [{ planeId: plane.id, planeToPaper: realization.planeToPaper2D, paperToPlane: realization.paperToPlane2D }];
  });
}

export function getCanvasPlaneCanvasItems(world: World, planeTransforms: CanvasPlaneTransformMap, state: CanvasPresentationState, context: CanvasPresentationContext): CanvasPlaneCanvasItems[] {
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
    if (!realization || !realization.feasible) continue;
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
    if (!realization || !realization.feasible) continue;
    const kind = line instanceof HalfHingeLine2D
      ? 'half-hinge-line'
      : line instanceof Segment2D
        ? 'finite-segment'
        : line instanceof SiblingGuide2D
          ? 'sibling-guide'
          : line instanceof Guide2D
            ? 'guide'
            : 'infinite-line';
    if (kind === 'finite-segment') {
      items.push({
        kind,
        elementId: line.id,
        planeId: line.planeId,
        point1: realization.point1.clone(),
        point2: realization.point2.clone(),
      });
      continue;
    }
    items.push({
      kind,
      elementId: line.id,
      planeId: line.planeId,
      point: realization.point1.clone(),
      direction: realization.getDirection(),
      arcGeometry: (() => {
        const primary = line instanceof SiblingGuide2D ? context.getLine2D(line.primaryGuideId) : line;
        if (!(primary instanceof Guide2D) || !primary.siblingGuideId) return 'arcGeometry' in line ? line.arcGeometry as CanvasPlaneLineItem['arcGeometry'] : undefined;
        if (!(context.getLine2D(primary.referenceLineId) instanceof BrokenHalfHingeLine2D)) return 'arcGeometry' in line ? line.arcGeometry as CanvasPlaneLineItem['arcGeometry'] : undefined;
        const sibling = context.getLine2D(primary.siblingGuideId);
        const arc = sibling instanceof SiblingGuide2D ? computeArcGeometry(context, primary, sibling) : null;
        return arc ? { ...arc, style: { ...arc.style, dashArray: arc.style.dashArray ? arc.style.dashArray.split(/[ ,]+/).map(Number) : undefined } } : undefined;
      })(),
    });
  }

  for (const circle of plane.getAllCircles()) {
    if (itemState.isVisible && !itemState.isVisible(circle)) continue;
    const realization = context.realizeCircle2D(circle, context);
    if (!realization || !realization.feasible) continue;
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

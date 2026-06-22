import { RenderLayer, type LinePrimitive, type PointPrimitive, type SegmentPrimitive, type CirclePrimitive, type PathPrimitive, type ResolvedStyle } from '@/domain/presentation/Paper';
import type { World } from '@/domain/world/World';
import type { CanvasPlaneItem, CanvasPresentationModel, CanvasPresentationState, CanvasQueryItem, CanvasRenderItem, CanvasViewportModel } from './CanvasPresentationModel';
import { selectCanvasGrid } from './CanvasGridSelector';
import { circleStyle, guideStyle, hingeStyle, lineStyle, segmentStyle } from './CanvasStylePolicy';
import { createCanvasPresentationContext, getCanvasPlaneCanvasItems, getCanvasPlaneTransforms, type CanvasPlaneTransformMap } from './CanvasPresentationContext';
import { canvasRenderItem } from './CanvasRenderItemFactory';

export function buildCanvasPresentationModel(world: World, viewport: CanvasViewportModel, state: CanvasPresentationState): CanvasPresentationModel {
  return new CanvasPresentationSelector().select(world, viewport, state);
}

export class CanvasPresentationSelector {
  select(world: World, viewport: CanvasViewportModel, state: CanvasPresentationState): CanvasPresentationModel {
    const context = createCanvasPresentationContext(world, state.visibilityModel, state.processTree, state.realizations);
    const renderItems: CanvasRenderItem[] = [];
    const queryItems: CanvasQueryItem[] = [];
    const planeTransforms: CanvasPlaneTransformMap = new Map();

    for (const transform of getCanvasPlaneTransforms(world, state.realizations)) {
      planeTransforms.set(transform.planeId, transform);
    }

    for (const planeItems of getCanvasPlaneCanvasItems(world, planeTransforms, state, context)) {
      for (const item of planeItems.items) appendPlaneItem(item, planeItems.transform.planeToPaper, state, renderItems, queryItems);
    }

    if (state.showProjectedElements) renderItems.push(...context.getProjected3DCanvasItems(planeTransforms));
    renderItems.sort((a, b) => a.primitive.layer === b.primitive.layer ? a.style.zIndex - b.style.zIndex : a.primitive.layer - b.primitive.layer);
    const activeTransform = state.activePlaneId ? planeTransforms.get(state.activePlaneId)?.planeToPaper : undefined;
    const grid = state.gridVisible === false ? { lines: [], labels: { top: [], bottom: [], left: [], right: [] } } : selectCanvasGrid(activeTransform, viewport);
    return { renderItems, queryItems, gridLines: grid.lines, gridLabels: grid.labels, planeTransforms, activePlaneId: state.activePlaneId };
  }
}

function appendPlaneItem(item: CanvasPlaneItem, transform: { elements: number[]; clone(): { elements: number[] } } | any, state: CanvasPresentationState, renderItems: CanvasRenderItem[], queryItems: CanvasQueryItem[]): void {
  switch (item.kind) {
    case 'point': {
      const style = pointDtoStyle(item.pointRole, item.planeId, stateFor(item.elementId, state));
      const position = item.position.clone().applyMatrix3(transform);
      const primitive: PointPrimitive = { type: 'point', id: `point-${item.elementId}`, sourceEntityId: item.elementId, planeId: item.planeId, layer: style.layer, visible: true, style: style.style, position, radius: style.radius };
      renderItems.push(canvasRenderItem(primitive, 'point'));
      queryItems.push({ id: primitive.id, kind: 'point', elementId: item.elementId, elementType: 'point', planeId: item.planeId, selectable: true, planeGeometry: { type: 'point', position: item.position.clone(), visualRadiusPixels: style.radius } });
      break;
    }
    case 'finite-segment': {
      const style = segmentStyle({ id: item.elementId, planeId: item.planeId } as never, stateFor(item.elementId, state));
      const primitive: SegmentPrimitive = { type: 'segment', id: `segment-${item.elementId}`, sourceEntityId: item.elementId, planeId: item.planeId, layer: RenderLayer.Elements, visible: true, style, point1: item.point1.clone().applyMatrix3(transform), point2: item.point2.clone().applyMatrix3(transform) };
      renderItems.push(canvasRenderItem(primitive, item.kind));
      queryItems.push({ id: primitive.id, kind: item.kind, elementId: item.elementId, elementType: 'segment', planeId: item.planeId, selectable: true, planeGeometry: { type: 'segment', point1: item.point1.clone(), point2: item.point2.clone() } });
      break;
    }
    case 'guide':
    case 'sibling-guide':
    case 'half-hinge-line':
    case 'infinite-line': {
      const style = item.kind === 'guide' || item.kind === 'sibling-guide'
        ? guideStyle({ id: item.elementId, planeId: item.planeId } as never, stateFor(item.elementId, state))
        : item.kind === 'half-hinge-line'
          ? hingeStyle({ id: item.elementId, planeId: item.planeId } as never, stateFor(item.elementId, state))
          : lineStyle({ id: item.elementId, planeId: item.planeId } as never, stateFor(item.elementId, state));
      const prefix = item.kind === 'guide' || item.kind === 'sibling-guide' ? 'guide' : item.kind === 'half-hinge-line' ? 'halfhingeline' : 'line';
      const primitive: LinePrimitive = { type: 'line', id: `${prefix}-${item.elementId}`, sourceEntityId: item.elementId, planeId: item.kind === 'guide' || item.kind === 'sibling-guide' ? undefined : item.planeId, layer: item.kind === 'guide' || item.kind === 'sibling-guide' ? RenderLayer.Guides : item.kind === 'half-hinge-line' ? RenderLayer.HingeLines : RenderLayer.Elements, visible: true, style, point: item.point.clone().applyMatrix3(transform), direction: item.direction.clone().applyMatrix3(transform) };
      renderItems.push(canvasRenderItem(primitive, item.kind));
      queryItems.push({ id: primitive.id, kind: item.kind, elementId: item.elementId, elementType: item.kind === 'half-hinge-line' ? 'half-hinge-line' : item.kind === 'guide' || item.kind === 'sibling-guide' ? 'guide' : 'line', planeId: item.planeId, selectable: true, planeGeometry: { type: 'line', point: item.point.clone(), direction: item.direction.clone() } });

      const arcGeometry = item.arcGeometry;
      if (arcGeometry?.startPoint && arcGeometry?.endPoint && arcGeometry.controlPoints?.length && arcGeometry.style) {
        const pathStyle = { stroke: arcGeometry.style.color, strokeWidth: arcGeometry.style.width, strokeStyle: arcGeometry.style.dashArray ? 'dashed' as const : 'solid' as const, fill: 'none', opacity: arcGeometry.style.opacity, zIndex: 2 };
        const path: PathPrimitive = { type: 'path', id: `arc-${item.elementId}`, sourceEntityId: item.elementId, planeId: undefined, layer: RenderLayer.Guides, visible: true, style: pathStyle, points: [[arcGeometry.startPoint.x, arcGeometry.startPoint.y], [arcGeometry.controlPoints[0].x, arcGeometry.controlPoints[0].y], [arcGeometry.endPoint.x, arcGeometry.endPoint.y]], closed: false };
        renderItems.push(canvasRenderItem(path, 'arc'));
      }
      break;
    }
    case 'circle': {
      const center = item.center.clone().applyMatrix3(transform);
      const radius = item.radiusVector.clone().applyMatrix3(transform).length();
      const primitive: CirclePrimitive = { type: 'circle', id: `circle-${item.elementId}`, sourceEntityId: item.elementId, planeId: item.planeId, layer: RenderLayer.Elements, visible: true, style: circleStyle({ id: item.elementId, planeId: item.planeId } as never, stateFor(item.elementId, state)), cx: center.x, cy: center.y, radius };
      renderItems.push(canvasRenderItem(primitive, 'circle'));
      queryItems.push({ id: primitive.id, kind: 'circle', elementId: item.elementId, elementType: 'circle', planeId: item.planeId, selectable: true, planeGeometry: { type: 'circle', center: item.center.clone(), radius: item.radius } });
      break;
    }
  }
}

function stateFor(id: string, state: CanvasPresentationState) { return { selected: state.selectedIds?.has(id), hovered: state.hoveredIds?.has(id), snapTarget: state.activeSnapTargetId === id, cascade: state.cascadeHighlightIds?.has(id), activePlaneId: state.activePlaneId }; }

function pointDtoStyle(pointRole: 'free' | 'dependent', planeId: string, ctx: ReturnType<typeof stateFor>): { style: ResolvedStyle; layer: RenderLayer; radius: number } {
  let fill: string; let stroke: string; let strokeWidth: number;
  if (ctx.cascade) { fill = '#FF9800'; stroke = '#F57C00'; strokeWidth = 2.5; }
  else if (ctx.snapTarget) { fill = '#FFA500'; stroke = '#FF8C00'; strokeWidth = 2; }
  else if (ctx.selected) { fill = pointRole === 'free' ? '#4A90E2' : '#E94E77'; stroke = '#0066CC'; strokeWidth = 2; }
  else if (ctx.hovered) { fill = pointRole === 'free' ? '#6BB6FF' : '#FF6B9D'; stroke = '#4A90E2'; strokeWidth = 1.5; }
  else { fill = pointRole === 'free' ? '#4A90E2' : '#E94E77'; stroke = '#333333'; strokeWidth = 1.5; }
  const zBoost = ctx.activePlaneId && planeId === ctx.activePlaneId ? 100 : 0;
  const opacity = ctx.activePlaneId && planeId !== ctx.activePlaneId ? 0.5 : 1;
  return { layer: ctx.snapTarget ? RenderLayer.Highlights : RenderLayer.Elements, radius: pointRole === 'free' ? 5 : 4, style: { stroke, strokeWidth, strokeStyle: 'solid', fill, opacity, zIndex: 10 + zBoost } };
}

import { Segment2DByPoints } from '@/domain/world/Segment';
import { Guide2D, SiblingGuide2D } from '@/domain/world/Guide';
import { HalfHingeLine2D } from '@/domain/world/HingeLine';
import { RenderLayer, type LinePrimitive, type PointPrimitive, type SegmentPrimitive, type CirclePrimitive, type PathPrimitive, type Primitive } from '@/domain/presentation/Paper';
import type { CanvasElementKind, CanvasPresentationModel, CanvasPresentationState, CanvasQueryItem, CanvasRenderItem, CanvasViewportModel } from './CanvasPresentationModel';
import { selectCanvasGrid } from './CanvasGridSelector';
import { circleStyle, guideStyle, hingeStyle, lineStyle, pointStyle, segmentStyle } from './CanvasStylePolicy';
import { isCanvasElementVisible } from './CanvasVisibilityPolicy';
import { Projected3DCanvasSelector } from './Projected3DCanvasSelector';
import type { CanvasPlaneTransformMap, CanvasWorldReadPort } from './CanvasWorldReadPort';

interface ArcGeometryLike {
  startPoint?: { x: number; y: number };
  endPoint?: { x: number; y: number };
  controlPoints?: Array<{ x: number; y: number }>;
  style?: { color: string; width: number; dashArray?: readonly number[]; opacity: number };
}

export class CanvasPresentationSelector {
  constructor(private readonly projected3DSelector = new Projected3DCanvasSelector()) {}

  select(readPort: CanvasWorldReadPort, viewport: CanvasViewportModel, state: CanvasPresentationState): CanvasPresentationModel {
    const renderItems: CanvasRenderItem[] = [];
    const queryItems: CanvasQueryItem[] = [];
    const planeTransforms: CanvasPlaneTransformMap = new Map();

    for (const plane of readPort.getAllProjectionPlanes()) {
      const transform = readPort.getProjectionPlane2DTransform(plane.id);
      if (transform) planeTransforms.set(plane.id, transform);
    }

    for (const plane of readPort.getAllProjectionPlanes()) {
      const transform = planeTransforms.get(plane.id)?.planeToPaper;
      if (!transform) continue;

      for (const point of plane.getAllPoints()) {
        if (!isCanvasElementVisible(point, readPort)) continue;
        const realization = readPort.realizePoint2D(plane, point);
        if (!realization) continue;
        const style = pointStyle(point, stateFor(point.id, state));
        const position = realization.position.clone().applyMatrix3(transform);
        const primitive: PointPrimitive = { type: 'point', id: `point-${point.id}`, sourceEntityId: point.id, planeId: point.planeId, layer: style.layer, visible: true, style: style.style, position, radius: style.radius };
        renderItems.push(canvasRenderItem(primitive, 'point'));
        queryItems.push({ id: primitive.id, kind: 'point', elementId: point.id, elementType: 'point', planeId: point.planeId, selectable: true, planeGeometry: { type: 'point', position: realization.position.clone(), visualRadiusPixels: style.radius } });
      }

      for (const line of plane.getAllLines()) {
        if (!isCanvasElementVisible(line, readPort)) continue;
        const realization = readPort.realizeLine2D(plane, line);
        if (!realization) continue;
        const kind = line instanceof HalfHingeLine2D ? 'half-hinge-line' : line instanceof Segment2DByPoints ? 'finite-segment' : line instanceof SiblingGuide2D ? 'sibling-guide' : line instanceof Guide2D ? 'guide' : 'infinite-line';

        if (kind === 'finite-segment') {
          const style = segmentStyle(line, stateFor(line.id, state));
          const primitive: SegmentPrimitive = { type: 'segment', id: `segment-${line.id}`, sourceEntityId: line.id, planeId: line.planeId, layer: RenderLayer.Elements, visible: true, style, point1: realization.point1.clone().applyMatrix3(transform), point2: realization.point2.clone().applyMatrix3(transform) };
          renderItems.push(canvasRenderItem(primitive, kind));
          queryItems.push({ id: primitive.id, kind, elementId: line.id, elementType: 'segment', planeId: line.planeId, selectable: true, planeGeometry: { type: 'segment', point1: realization.point1.clone(), point2: realization.point2.clone() } });
        } else {
          const style = kind === 'guide' || kind === 'sibling-guide' ? guideStyle(line as Guide2D | SiblingGuide2D, stateFor(line.id, state)) : kind === 'half-hinge-line' ? hingeStyle(line as HalfHingeLine2D, stateFor(line.id, state)) : lineStyle(line, stateFor(line.id, state));
          const prefix = kind === 'guide' || kind === 'sibling-guide' ? 'guide' : kind === 'half-hinge-line' ? 'halfhingeline' : 'line';
          const primitive: LinePrimitive = { type: 'line', id: `${prefix}-${line.id}`, sourceEntityId: line.id, planeId: kind === 'guide' || kind === 'sibling-guide' ? undefined : line.planeId, layer: kind === 'guide' || kind === 'sibling-guide' ? RenderLayer.Guides : kind === 'half-hinge-line' ? RenderLayer.HingeLines : RenderLayer.Elements, visible: true, style, point: realization.point1.clone().applyMatrix3(transform), direction: realization.getDirection().applyMatrix3(transform) };
          renderItems.push(canvasRenderItem(primitive, kind));
          queryItems.push({ id: primitive.id, kind, elementId: line.id, elementType: kind === 'half-hinge-line' ? 'half-hinge-line' : kind === 'guide' || kind === 'sibling-guide' ? 'guide' : 'line', planeId: line.planeId, selectable: true, planeGeometry: { type: 'line', point: realization.point1.clone(), direction: realization.getDirection() } });

          const arcGeometry = optionalArcGeometry(line);
          if (arcGeometry?.startPoint && arcGeometry?.endPoint && arcGeometry.controlPoints?.length && arcGeometry.style) {
            const pathStyle = { stroke: arcGeometry.style.color, strokeWidth: arcGeometry.style.width, strokeStyle: arcGeometry.style.dashArray ? 'dashed' as const : 'solid' as const, fill: 'none', opacity: arcGeometry.style.opacity, zIndex: 2 };
            const path: PathPrimitive = { type: 'path', id: `arc-${line.id}`, sourceEntityId: line.id, planeId: undefined, layer: RenderLayer.Guides, visible: true, style: pathStyle, points: [[arcGeometry.startPoint.x, arcGeometry.startPoint.y], [arcGeometry.controlPoints[0].x, arcGeometry.controlPoints[0].y], [arcGeometry.endPoint.x, arcGeometry.endPoint.y]], closed: false };
            renderItems.push(canvasRenderItem(path, 'arc'));
          }
        }
      }

      for (const circle of plane.getAllCircles()) {
        if (!isCanvasElementVisible(circle, readPort)) continue;
        const realization = readPort.realizeCircle2D(plane, circle);
        if (!realization) continue;
        const center = realization.center.clone().applyMatrix3(transform);
        const radius = realization.radiusVector.clone().applyMatrix3(transform).length();
        const primitive: CirclePrimitive = { type: 'circle', id: `circle-${circle.id}`, sourceEntityId: circle.id, planeId: circle.planeId, layer: RenderLayer.Elements, visible: true, style: circleStyle(circle, stateFor(circle.id, state)), cx: center.x, cy: center.y, radius };
        renderItems.push(canvasRenderItem(primitive, 'circle'));
        queryItems.push({ id: primitive.id, kind: 'circle', elementId: circle.id, elementType: 'circle', planeId: circle.planeId, selectable: true, planeGeometry: { type: 'circle', center: realization.center.clone(), radius: realization.getRadius() } });
      }
    }

    if (state.showProjectedElements) renderItems.push(...this.projected3DSelector.select(readPort, planeTransforms));
    renderItems.sort((a, b) => a.primitive.layer === b.primitive.layer ? a.style.zIndex - b.style.zIndex : a.primitive.layer - b.primitive.layer);
    const activeTransform = state.activePlaneId ? planeTransforms.get(state.activePlaneId)?.planeToPaper : undefined;
    const grid = state.gridVisible === false ? { lines: [], labels: { top: [], bottom: [], left: [], right: [] } } : selectCanvasGrid(activeTransform, viewport);
    return { renderItems, queryItems, gridLines: grid.lines, gridLabels: grid.labels, planeTransforms, activePlaneId: state.activePlaneId };
  }
}

function stateFor(id: string, state: CanvasPresentationState) { return { selected: state.selectedIds?.has(id), hovered: state.hoveredIds?.has(id), snapTarget: state.activeSnapTargetId === id, cascade: state.cascadeHighlightIds?.has(id), activePlaneId: state.activePlaneId }; }

export function canvasRenderItem<TPrimitive extends Primitive>(primitive: TPrimitive, kind: CanvasElementKind): CanvasRenderItem {
  return { id: primitive.id, kind, sourceEntityId: primitive.sourceEntityId, planeId: primitive.planeId, primitive, visible: primitive.visible, style: primitive.style };
}

function optionalArcGeometry(line: object): ArcGeometryLike | undefined {
  return 'arcGeometry' in line ? line.arcGeometry as ArcGeometryLike | undefined : undefined;
}

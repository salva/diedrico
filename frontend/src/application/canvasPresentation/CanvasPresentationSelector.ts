import { Matrix3 } from 'three';
import type { World } from '@/domain/world/World';
import { Segment2DByPoints } from '@/domain/world/Segment';
import { Guide2D, SiblingGuide2D } from '@/domain/world/Guide';
import { HalfHingeLine2D } from '@/domain/world/HingeLine';
import { RenderLayer, type LinePrimitive, type PointPrimitive, type SegmentPrimitive, type CirclePrimitive, type PathPrimitive } from '@/domain/presentation/Paper';
import { applyMatrix3x4 } from '@/utils/threeUtils';
import type { CanvasPresentationModel, CanvasPresentationState, CanvasQueryItem, CanvasRenderItem, CanvasViewportModel } from './CanvasPresentationModel';
import { selectCanvasGrid } from './CanvasGridSelector';
import { circleStyle, guideStyle, hingeStyle, lineStyle, pointStyle, PROJECTED_LINE_STYLE, PROJECTED_POINT_STYLE, PROJECTED_SEGMENT_STYLE, segmentStyle } from './CanvasStylePolicy';
import { isCanvasElementVisible } from './CanvasVisibilityPolicy';

export class CanvasPresentationSelector {
  select(world: World, viewport: CanvasViewportModel, state: CanvasPresentationState): CanvasPresentationModel {
    const renderItems: CanvasRenderItem[] = [];
    const queryItems: CanvasQueryItem[] = [];
    const planeTransforms = new Map();
    for (const plane of world.getAllProjectionPlanes()) {
      const realization = world.getProjectionPlane2DRealization(plane.id);
      if (realization) planeTransforms.set(plane.id, { planeId: plane.id, planeToPaper: realization.planeToPaper2D, paperToPlane: realization.paperToPlane2D });
    }
    for (const plane of world.getAllProjectionPlanes()) {
      const transform = planeTransforms.get(plane.id)?.planeToPaper as Matrix3 | undefined;
      if (!transform) continue;
      for (const point of plane.getAllPoints()) {
        if (!isCanvasElementVisible(point, world)) continue;
        const realization = plane.realizePoint2D(point, world as any); if (!realization) continue;
        const s = pointStyle(point, stateFor(point.id!, state));
        const position = realization.position.clone().applyMatrix3(transform);
        const primitive: PointPrimitive = { type: 'point', id: `point-${point.id}`, sourceEntityId: point.id, planeId: point.planeId, layer: s.layer, visible: true, style: s.style, position, radius: s.radius };
        renderItems.push(item(primitive, 'point'));
        queryItems.push({ id: primitive.id, kind: 'point', elementId: point.id!, elementType: 'point', planeId: point.planeId, selectable: true, planeGeometry: { type: 'point', position: realization.position.clone(), visualRadiusPixels: s.radius } });
      }
      for (const line of plane.getAllLines()) {
        if (!isCanvasElementVisible(line, world)) continue;
        const realization = plane.realizeLine2D(line, world as any); if (!realization) continue;
        const kind = line instanceof HalfHingeLine2D ? 'half-hinge-line' : line instanceof Segment2DByPoints ? 'finite-segment' : line instanceof SiblingGuide2D ? 'sibling-guide' : line instanceof Guide2D ? 'guide' : 'infinite-line';
        if (kind === 'finite-segment') {
          const style = segmentStyle(line, stateFor(line.id!, state));
          const primitive: SegmentPrimitive = { type: 'segment', id: `segment-${line.id}`, sourceEntityId: line.id, planeId: line.planeId, layer: RenderLayer.Elements, visible: true, style, point1: realization.point1.clone().applyMatrix3(transform), point2: realization.point2.clone().applyMatrix3(transform) };
          renderItems.push(item(primitive, kind));
          queryItems.push({ id: primitive.id, kind, elementId: line.id!, elementType: 'segment', planeId: line.planeId, selectable: true, planeGeometry: { type: 'segment', point1: realization.point1.clone(), point2: realization.point2.clone() } });
        } else {
          const style = kind === 'guide' || kind === 'sibling-guide' ? guideStyle(line as Guide2D | SiblingGuide2D, stateFor(line.id!, state)) : kind === 'half-hinge-line' ? hingeStyle(line as HalfHingeLine2D, stateFor(line.id!, state)) : lineStyle(line, stateFor(line.id!, state));
          const prefix = kind === 'guide' || kind === 'sibling-guide' ? 'guide' : kind === 'half-hinge-line' ? 'halfhingeline' : 'line';
          const primitive: LinePrimitive = { type: 'line', id: `${prefix}-${line.id}`, sourceEntityId: line.id, planeId: kind === 'guide' || kind === 'sibling-guide' ? undefined : line.planeId, layer: kind === 'guide' || kind === 'sibling-guide' ? RenderLayer.Guides : kind === 'half-hinge-line' ? RenderLayer.HingeLines : RenderLayer.Elements, visible: true, style, point: realization.point1.clone().applyMatrix3(transform), direction: realization.getDirection().applyMatrix3(transform) };
          renderItems.push(item(primitive, kind));
          queryItems.push({ id: primitive.id, kind, elementId: line.id!, elementType: kind === 'half-hinge-line' ? 'half-hinge-line' : kind === 'guide' || kind === 'sibling-guide' ? 'guide' : 'line', planeId: line.planeId, selectable: true, planeGeometry: { type: 'line', point: realization.point1.clone(), direction: realization.getDirection() } });
          const arcGeometry = (line as any).arcGeometry;
          if (arcGeometry?.startPoint && arcGeometry?.endPoint && arcGeometry?.controlPoints?.length) {
            const style = { stroke: arcGeometry.style.color, strokeWidth: arcGeometry.style.width, strokeStyle: arcGeometry.style.dashArray ? 'dashed' as const : 'solid' as const, fill: 'none', opacity: arcGeometry.style.opacity, zIndex: 2 };
            const path: PathPrimitive = { type: 'path', id: `arc-${line.id}`, sourceEntityId: line.id, planeId: undefined, layer: RenderLayer.Guides, visible: true, style, points: [[arcGeometry.startPoint.x, arcGeometry.startPoint.y], [arcGeometry.controlPoints[0].x, arcGeometry.controlPoints[0].y], [arcGeometry.endPoint.x, arcGeometry.endPoint.y]], closed: false };
            renderItems.push(item(path, 'arc'));
          }
        }
      }
      for (const circle of plane.getAllCircles()) {
        if (!isCanvasElementVisible(circle, world)) continue;
        const realization = plane.realizeCircle2D(circle, world as any); if (!realization) continue;
        const center = realization.center.clone().applyMatrix3(transform);
        const radius = realization.radiusVector.clone().applyMatrix3(transform).length();
        const primitive: CirclePrimitive = { type: 'circle', id: `circle-${circle.id}`, sourceEntityId: circle.id!, planeId: circle.planeId, layer: RenderLayer.Elements, visible: true, style: circleStyle(circle, stateFor(circle.id!, state)), cx: center.x, cy: center.y, radius };
        renderItems.push(item(primitive, 'circle'));
        queryItems.push({ id: primitive.id, kind: 'circle', elementId: circle.id!, elementType: 'circle', planeId: circle.planeId, selectable: true, planeGeometry: { type: 'circle', center: realization.center.clone(), radius: realization.getRadius() } });
      }
    }
    if (state.showProjectedElements) renderItems.push(...projected3D(world, planeTransforms));
    renderItems.sort((a, b) => a.primitive.layer === b.primitive.layer ? a.style.zIndex - b.style.zIndex : a.primitive.layer - b.primitive.layer);
    const activeTransform = state.activePlaneId ? planeTransforms.get(state.activePlaneId)?.planeToPaper : undefined;
    const grid = state.gridVisible === false ? { lines: [], labels: { top: [], bottom: [], left: [], right: [] } } : selectCanvasGrid(activeTransform, viewport);
    return { renderItems, queryItems, gridLines: grid.lines, gridLabels: grid.labels, planeTransforms, activePlaneId: state.activePlaneId };
  }
}

function stateFor(id: string, state: CanvasPresentationState) { return { selected: state.selectedIds?.has(id), hovered: state.hoveredIds?.has(id), snapTarget: state.activeSnapTargetId === id, cascade: state.cascadeHighlightIds?.has(id), activePlaneId: state.activePlaneId }; }
function item(primitive: any, kind: any): CanvasRenderItem { return { id: primitive.id, kind, sourceEntityId: primitive.sourceEntityId, planeId: primitive.planeId, primitive, visible: primitive.visible, style: primitive.style }; }
function projected3D(world: World, planeTransforms: Map<string, any>): CanvasRenderItem[] {
  const items: CanvasRenderItem[] = []; const EPSILON = 1e-10;
  for (const plane of world.getAllProjectionPlanes()) {
    const planeRealization = world.getProjectionPlane3DRealization(plane.id); const planeToPaper = planeTransforms.get(plane.id)?.planeToPaper;
    if (!planeRealization || !planeToPaper) continue;
    for (const point3D of world.getAll3DPoints()) { const r = point3D.realize3D(world); if (!r?.isFeasible()) continue; const position = applyMatrix3x4(r.position, planeRealization.threeDToPlane).applyMatrix3(planeToPaper); items.push(item({ type: 'point', id: `proj3d-point-${point3D.id}-on-${plane.id}`, sourceEntityId: point3D.id, planeId: plane.id, layer: RenderLayer.Guides + 3, visible: true, style: PROJECTED_POINT_STYLE, position, radius: 6 }, 'projected-3d-point')); }
    for (const line3D of world.getAll3DLines()) { const r = line3D.realize3D(world); if (!r?.isFeasible()) continue; const dir = applyMatrix3x4(r.direction, planeRealization.threeDToPlane); if (dir.length() < EPSILON) continue; items.push(item({ type: 'line', id: `proj3d-line-${line3D.id}-on-${plane.id}`, sourceEntityId: line3D.id, planeId: plane.id, layer: RenderLayer.Guides + 3, visible: true, style: PROJECTED_LINE_STYLE, point: applyMatrix3x4(r.point, planeRealization.threeDToPlane).applyMatrix3(planeToPaper), direction: dir.applyMatrix3(planeToPaper) }, 'projected-3d-line')); }
    for (const segment3D of world.getAll3DSegments()) { const r = segment3D.realize3D(world); if (!r?.isFeasible()) continue; items.push(item({ type: 'segment', id: `proj3d-segment-${segment3D.id}-on-${plane.id}`, sourceEntityId: segment3D.id, planeId: plane.id, layer: RenderLayer.Guides + 3, visible: true, style: PROJECTED_SEGMENT_STYLE, point1: applyMatrix3x4(r.startPoint, planeRealization.threeDToPlane).applyMatrix3(planeToPaper), point2: applyMatrix3x4(r.endPoint, planeRealization.threeDToPlane).applyMatrix3(planeToPaper) }, 'projected-3d-segment')); }
  }
  return items;
}

import { Matrix3, Vector3 } from 'three';
import type { CanvasQueryItem, CanvasSnapPoint } from './CanvasPresentationModel';
import type { SelectionMask, SelectableElementType } from '@/types/SelectionMask';
import { isHierarchyMask, isIntersectionMask, isTypeMask, isUnionMask, NoneMask } from '@/types/SelectionMask';

export interface CanvasInteractionQueryContext { viewport: { zoom: number; panX: number; panY: number }; paperToPlaneTransform?: Matrix3; activePlaneId?: string }

export class CanvasInteractionQuery {
  private readonly queryItems: readonly CanvasQueryItem[];
  constructor(queryItems: readonly CanvasQueryItem[]) { this.queryItems = queryItems; }
  hitTest(canvasPos: Vector3, snapRadiusPixels: number, context: CanvasInteractionQueryContext, selectionMask?: SelectionMask): CanvasSnapPoint | null {
    if (!context.activePlaneId || !context.paperToPlaneTransform) return null;
    const canvasToPaper = new Matrix3().set(1 / context.viewport.zoom, 0, -context.viewport.panX, 0, 1 / context.viewport.zoom, -context.viewport.panY, 0, 0, 1);
    const paperPos = canvasPos.clone().applyMatrix3(canvasToPaper);
    const planePos = paperPos.clone().applyMatrix3(context.paperToPlaneTransform);
    const radiusVector = new Vector3(snapRadiusPixels, 0, 0).applyMatrix3(canvasToPaper).applyMatrix3(context.paperToPlaneTransform);
    let minDistance = radiusVector.length();
    let closest: CanvasSnapPoint | null = null;
    for (const item of this.queryItems) {
      if (!item.selectable) continue;
      if (item.planeId && item.planeId !== context.activePlaneId) continue;
      if (selectionMask && !itemMatchesMask(item, selectionMask)) continue;
      const { distance, snapPoint } = distanceAndSnap(planePos, item);
      const adjusted = item.planeGeometry.type === 'point' ? distance - item.planeGeometry.visualRadiusPixels / context.viewport.zoom : distance;
      if (adjusted < minDistance) {
        minDistance = adjusted;
        closest = { elementId: item.elementId, elementType: item.elementType, primitiveId: item.id, distance: distance * context.viewport.zoom, snapPoint };
      }
    }
    return closest;
  }
}

function itemMatchesMask(item: CanvasQueryItem, mask: SelectionMask): boolean {
  if (mask instanceof NoneMask) return false;
  if (isTypeMask(mask)) return itemSelectableTypes(item).has(mask.getType());
  if (isHierarchyMask(mask)) {
    const types = itemSelectableTypes(item);
    return types.has(mask.getBaseType()) || mask.getSubtypes().some(type => types.has(type));
  }
  if (isUnionMask(mask)) return mask.getMasks().some(child => itemMatchesMask(item, child));
  if (isIntersectionMask(mask)) return mask.getMasks().every(child => itemMatchesMask(item, child));
  return true;
}

function itemSelectableTypes(item: CanvasQueryItem): Set<SelectableElementType> {
  switch (item.kind) {
    case 'point': return new Set(['point']);
    case 'finite-segment': return new Set(['segment', 'line']);
    case 'circle': return new Set(['circle']);
    case 'guide':
    case 'sibling-guide': return new Set(['guide', 'line']);
    case 'half-hinge-line': return new Set(['half-hinge-line', 'line']);
    case 'hinge-line':
    case 'infinite-line': return new Set(['line']);
  }
}


function distanceAndSnap(planePos: Vector3, item: CanvasQueryItem): { distance: number; snapPoint: Vector3 } {
  const g = item.planeGeometry;
  if (g.type === 'point') return { distance: planePos.distanceTo(g.position), snapPoint: g.position.clone() };
  if (g.type === 'circle') {
    const direction = planePos.clone().sub(g.center);
    if (direction.lengthSq() < 1e-20) return { distance: g.radius, snapPoint: g.center.clone().add(new Vector3(g.radius, 0, 0)) };
    const centerDistance = direction.length();
    return { distance: Math.abs(centerDistance - g.radius), snapPoint: g.center.clone().add(direction.normalize().multiplyScalar(g.radius)) };
  }
  if (g.type === 'segment') {
    const segment = g.point2.clone().sub(g.point1); const len2 = segment.lengthSq();
    if (len2 === 0) return { distance: planePos.distanceTo(g.point1), snapPoint: g.point1.clone() };
    const t = Math.max(0, Math.min(1, planePos.clone().sub(g.point1).dot(segment) / len2));
    const snapPoint = g.point1.clone().addScaledVector(segment, t);
    return { distance: planePos.distanceTo(snapPoint), snapPoint };
  }
  const direction = g.direction.clone().normalize();
  const projection = planePos.clone().sub(g.point).dot(direction);
  const snapPoint = g.point.clone().addScaledVector(direction, projection);
  return { distance: planePos.distanceTo(snapPoint), snapPoint };
}

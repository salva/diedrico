import type { Line2D } from '@/domain/world/Line';
import type { Circle2D } from '@/domain/world/Circle';
import type { Guide2D, SiblingGuide2D } from '@/domain/world/Guide';
import type { HalfHingeLine2D, HingeLine } from '@/domain/world/HingeLine';
import type { ResolvedStyle } from '@/domain/presentation/Paper';

export interface StyleContext { selected?: boolean; hovered?: boolean; snapTarget?: boolean; cascade?: boolean; activePlaneId?: string }

function zBoost(planeId: string | undefined, activePlaneId: string | undefined): number { return activePlaneId && planeId === activePlaneId ? 100 : 0; }
function opacity(planeId: string | undefined, activePlaneId: string | undefined): number { return activePlaneId && planeId && planeId !== activePlaneId ? 0.5 : 1; }

export function lineStyle(line: Line2D, ctx: StyleContext): ResolvedStyle {
  let stroke: string; let strokeWidth: number;
  if (ctx.cascade) { stroke = '#FF9800'; strokeWidth = 2.5; }
  else if (ctx.selected) { stroke = '#0066CC'; strokeWidth = 2; }
  else if (ctx.hovered) { stroke = '#4A90E2'; strokeWidth = 1.8; }
  else { stroke = '#333333'; strokeWidth = 1.5; }
  return { stroke, strokeWidth, strokeStyle: 'solid', fill: 'none', opacity: opacity(line.planeId, ctx.activePlaneId), zIndex: 5 + zBoost(line.planeId, ctx.activePlaneId) };
}

export function segmentStyle(line: Line2D, ctx: StyleContext): ResolvedStyle {
  let stroke: string; let strokeWidth: number;
  if (ctx.cascade) { stroke = '#FF9800'; strokeWidth = 3; }
  else if (ctx.selected) { stroke = '#0066CC'; strokeWidth = 2.5; }
  else if (ctx.hovered) { stroke = '#4A90E2'; strokeWidth = 2.2; }
  else { stroke = '#2C3E50'; strokeWidth = 2; }
  return { stroke, strokeWidth, strokeStyle: 'solid', fill: 'none', opacity: opacity(line.planeId, ctx.activePlaneId), zIndex: 5 + zBoost(line.planeId, ctx.activePlaneId) };
}

export function circleStyle(circle: Circle2D, ctx: StyleContext): ResolvedStyle {
  let stroke: string; let strokeWidth: number;
  if (ctx.cascade) { stroke = '#FF9800'; strokeWidth = 2.5; }
  else if (ctx.selected) { stroke = '#0066CC'; strokeWidth = 2; }
  else if (ctx.hovered) { stroke = '#4A90E2'; strokeWidth = 1.8; }
  else { stroke = '#333333'; strokeWidth = 1.5; }
  return { stroke, strokeWidth, strokeStyle: 'solid', fill: 'none', opacity: opacity(circle.planeId, ctx.activePlaneId), zIndex: 5 + zBoost(circle.planeId, ctx.activePlaneId) };
}

export function guideStyle(_guide: Guide2D | SiblingGuide2D, ctx: StyleContext): ResolvedStyle {
  let stroke: string; let strokeWidth: number;
  if (ctx.cascade) { stroke = '#FF9800'; strokeWidth = 2.5; }
  else if (ctx.selected) { stroke = '#0066CC'; strokeWidth = 2; }
  else if (ctx.hovered) { stroke = '#BA68C8'; strokeWidth = 1.8; }
  else { stroke = '#9C27B0'; strokeWidth = 1.5; }
  return { stroke, strokeWidth, strokeStyle: 'dashed', fill: 'none', opacity: 1, zIndex: 3 };
}

export function hingeStyle(_hinge: HingeLine | HalfHingeLine2D, ctx: StyleContext): ResolvedStyle {
  const highlighted = Boolean(ctx.selected || ctx.hovered);
  return { stroke: highlighted ? '#6BB6FF' : '#333333', strokeWidth: highlighted ? 2 : 1.5, strokeStyle: 'dashed', fill: 'none', opacity: 1, zIndex: 2 + zBoost((_hinge as HalfHingeLine2D).planeId, ctx.activePlaneId) };
}

export const PROJECTED_POINT_STYLE: ResolvedStyle = { stroke: '#9B59B6', strokeWidth: 1.5, strokeStyle: 'solid', fill: '#9B59B6', opacity: 0.35, zIndex: 5 };
export const PROJECTED_LINE_STYLE: ResolvedStyle = { stroke: '#9B59B6', strokeWidth: 3, strokeStyle: 'solid', fill: 'none', opacity: 0.35, zIndex: 5 };
export const PROJECTED_SEGMENT_STYLE: ResolvedStyle = { stroke: '#9B59B6', strokeWidth: 3, strokeStyle: 'solid', fill: 'none', opacity: 0.35, zIndex: 5 };

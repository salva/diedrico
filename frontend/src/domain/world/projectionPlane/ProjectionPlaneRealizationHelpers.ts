import type { Circle2D, Circle2DRealization2D } from '../Circle';
import type { Line2D, Line2DRealization2D } from '../Line';
import type { Point2D, Point2DRealization2D } from '../Point';
import type { ProjectionElementRealizationContext } from './ProjectionPlaneContext';

export interface PointRealizationCache {
  getPointRealization2D(id: string): Point2DRealization2D | undefined;
  setPointRealization2D(id: string, realization: Point2DRealization2D): void;
}

export interface LineRealizationCache {
  getLineRealization2D(id: string): Line2DRealization2D | undefined;
  setLineRealization2D(id: string, realization: Line2DRealization2D): void;
}

export interface CircleRealizationCache {
  getCircleRealization2D(id: string): Circle2DRealization2D | undefined;
  setCircleRealization2D(id: string, realization: Circle2DRealization2D): void;
}

export function realizePoint2DWithCache(
  point: Point2D,
  context: ProjectionElementRealizationContext,
  cache: PointRealizationCache
): Point2DRealization2D | undefined {
  const cached = cache.getPointRealization2D(point.id);
  if (cached) {
    return cached;
  }

  const realization = point.realize2D(context);
  if (!realization) {
    return undefined;
  }

  cache.setPointRealization2D(point.id, realization);
  return realization;
}

export function realizeLine2DWithCache(
  line: Line2D,
  context: ProjectionElementRealizationContext,
  cache: LineRealizationCache
): Line2DRealization2D | undefined {
  const cached = cache.getLineRealization2D(line.id);
  if (cached) {
    return cached;
  }

  const realization = line.realize2D(context);
  if (!realization) {
    return undefined;
  }

  cache.setLineRealization2D(line.id, realization);
  return realization;
}

export function realizeCircle2DWithCache(
  circle: Circle2D,
  context: ProjectionElementRealizationContext,
  cache: CircleRealizationCache
): Circle2DRealization2D | undefined {
  const cached = cache.getCircleRealization2D(circle.id);
  if (cached) {
    return cached;
  }

  const realization = circle.realize2D(context);
  if (!realization) {
    return undefined;
  }

  cache.setCircleRealization2D(circle.id, realization);
  return realization;
}

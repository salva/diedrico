import type { World } from '@/domain/world/World';
import type { Element2D } from '@/domain/world/Element2D';
import type { Point2D, Point2DRealization2D } from '@/domain/world/Point';
import type { Line2D, Line2DRealization2D } from '@/domain/world/Line';
import type { Circle2D, Circle2DRealization2D } from '@/domain/world/Circle';
import type { ProjectionPlane } from '@/domain/world/projectionPlane/ProjectionPlane';
import { computeExpectedT2Prime } from '@/utils/projectionPlaneUtils';

export interface ToolInteractionReadPort {
  getProjectionPlaneById(id: string): ProjectionPlane | undefined;
  getElement2D(id: string): Element2D | undefined;
  getPoint2D(id: string): Point2D | undefined;
  getLine2D(id: string): Line2D | undefined;
  getCircle2D(id: string): Circle2D | undefined;
  realizePoint2D(point: Point2D): Point2DRealization2D | undefined;
  realizeLine2D(line: Line2D): Line2DRealization2D | undefined;
  realizeCircle2D(circle: Circle2D): Circle2DRealization2D | undefined;
  areProjectionPlanesDistinct(firstPlaneId: string, secondPlaneId: string): boolean;
  getExpectedT2PrimeLineRealization(t1HingeTraceId: string, t2OtherTraceId: string): Line2DRealization2D | null;
}

export function createToolInteractionReadPort(world: World): ToolInteractionReadPort {
  return {
    getProjectionPlaneById: (id) => world.getProjectionPlaneById(id),
    getElement2D: (id) => world.getElement2D(id),
    getPoint2D: (id) => safeLookup(() => world.getPoint2D(id)),
    getLine2D: (id) => safeLookup(() => world.getLine2D(id)),
    getCircle2D: (id) => safeLookup(() => world.getCircle2D(id)),
    realizePoint2D: (point) => point.realize2D(world),
    realizeLine2D: (line) => line.realize2D(world),
    realizeCircle2D: (circle) => circle.realize2D(world) ?? undefined,
    areProjectionPlanesDistinct: (firstPlaneId, secondPlaneId) => {
      const firstPlane = world.getProjectionPlaneById(firstPlaneId);
      const secondPlane = world.getProjectionPlaneById(secondPlaneId);
      return Boolean(firstPlane && secondPlane && firstPlane.id !== secondPlane.id);
    },
    getExpectedT2PrimeLineRealization: (t1HingeTraceId, t2OtherTraceId) => computeExpectedT2Prime(
      t1HingeTraceId,
      t2OtherTraceId,
      world
    ),
  };
}

function safeLookup<T>(lookup: () => T | undefined): T | undefined {
  try {
    return lookup();
  } catch {
    return undefined;
  }
}

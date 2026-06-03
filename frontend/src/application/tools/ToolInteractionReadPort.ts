import type { World } from '@/domain/world/World';
import type { ToolInteractionReadPort } from '@/tools/ToolInteractionReadPort';
import { computeExpectedT2Prime } from '@/utils/projectionPlaneUtils';

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

import type { World } from '@/domain/world/World';
import type { RealizationService } from '@/domain/world/RealizationService';
import type { ToolInteractionReadPort } from '@/tools/ToolInteractionReadPort';
import { computeExpectedT2Prime } from '@/utils/projectionPlaneUtils';
import { createWorldRealizationContext } from '@/domain/world/WorldRealizationContext';
import { GeometryElementLookup } from '@/domain/world/GeometryElementLookup';

export function createToolInteractionReadPort(world: World, realizations: RealizationService): ToolInteractionReadPort {
  const realizationContext = createWorldRealizationContext(world, realizations);
  const lookup = new GeometryElementLookup(world);
  return {
    getProjectionPlaneById: (id) => world.getProjectionPlaneById(id),
    getElement2D: (id) => lookup.getElement2D(id),
    getPoint2D: (id) => lookup.getPoint2D(id),
    getLine2D: (id) => lookup.getLine2D(id),
    getCircle2D: (id) => lookup.getCircle2D(id),
    realizePoint2D: (point) => realizations.realizePoint2D(point, realizationContext),
    realizeLine2D: (line) => realizations.realizeLine2D(line, realizationContext),
    realizeCircle2D: (circle) => realizations.realizeCircle2D(circle, realizationContext),
    areProjectionPlanesDistinct: (firstPlaneId, secondPlaneId) => {
      const firstPlane = world.getProjectionPlaneById(firstPlaneId);
      const secondPlane = world.getProjectionPlaneById(secondPlaneId);
      return Boolean(firstPlane && secondPlane && firstPlane.id !== secondPlane.id);
    },
    getExpectedT2PrimeLineRealization: (t1HingeTraceId, t2OtherTraceId) => computeExpectedT2Prime(
      t1HingeTraceId,
      t2OtherTraceId,
      realizationContext
    ),
  };
}

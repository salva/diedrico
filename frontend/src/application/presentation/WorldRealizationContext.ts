import type { CachedProjectionElementRealizationContext, Element3DRealizationContext } from '@/domain/world/projectionPlane/ProjectionPlaneContext';
import type { World } from '@/domain/world/World';

export function createWorldRealizationContext(world: World): CachedProjectionElementRealizationContext & Element3DRealizationContext {
  return {
    getProjectionPlaneById: id => world.getProjectionPlaneById(id),
    getPoint2D: id => world.getPoint2D(id),
    getLine2D: id => world.getLine2D(id),
    getCircle2D: id => world.getCircle2D(id),
    realizePoint2D: (point, context) => world.realizePoint2D(point, context),
    realizeLine2D: (line, context) => world.realizeLine2D(line, context),
    realizeCircle2D: (circle, context) => world.realizeCircle2D(circle, context),
    getProjectionPlane2DRealization: id => world.getProjectionPlane2DRealization(id),
    getProjectionPlane3DRealization: id => world.getProjectionPlane3DRealization(id),
    get3DPlaneRealization: id => world.get3DPlaneRealization(id),
    getHingeLineById: id => world.getHingeLineById(id),
  };
}

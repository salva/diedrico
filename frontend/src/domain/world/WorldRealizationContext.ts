import type { CachedProjectionElementRealizationContext, Element3DRealizationContext } from './projectionPlane/ProjectionPlaneContext';
import type { RealizationService } from './RealizationService';
import type { World } from './World';
import { GeometryElementLookup } from './GeometryElementLookup';

export function createWorldRealizationContext(world: World, realizations: RealizationService): CachedProjectionElementRealizationContext & Element3DRealizationContext {
  const lookup = new GeometryElementLookup(world);
  const getProjectionPlaneById = world.getProjectionPlaneById.bind(world);
  const getPoint2D = lookup.getPoint2D.bind(lookup);
  const getLine2D = lookup.getLine2D.bind(lookup);
  const getCircle2D = lookup.getCircle2D.bind(lookup);
  const get3DPlane = world.get3DPlane.bind(world);
  const getHingeLineById = world.getHingeLineById.bind(world);
  const context: CachedProjectionElementRealizationContext & Element3DRealizationContext = {
    getProjectionPlaneById,
    getPoint2D,
    getLine2D,
    getCircle2D,
    realizePoint2D: (point, realizationContext) => realizations.realizePoint2D(point, realizationContext ?? context),
    realizeLine2D: (line, realizationContext) => realizations.realizeLine2D(line, realizationContext ?? context),
    realizeCircle2D: (circle, realizationContext) => realizations.realizeCircle2D(circle, realizationContext ?? context),
    getProjectionPlane2DRealization: id => {
      const plane = getProjectionPlaneById(id);
      return plane ? realizations.realizeProjectionPlane2D(plane, context) : undefined;
    },
    getProjectionPlane3DRealization: id => {
      const plane = getProjectionPlaneById(id);
      return plane ? realizations.realizeProjectionPlane3D(plane, context) : undefined;
    },
    get3DPlaneRealization: id => {
      const plane = get3DPlane(id);
      return plane ? realizations.realizePlane3D(plane, context) : undefined;
    },
    getHingeLineById,
  };
  return context;
}

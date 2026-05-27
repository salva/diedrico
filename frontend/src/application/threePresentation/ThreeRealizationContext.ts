import type { ProjectionElementRealizationContext, Element3DRealizationContext } from '@/domain/world/projectionPlane/ProjectionPlaneContext';
import type { ProjectionPlane } from '@/domain/world/projectionPlane/ProjectionPlane';
import type { HingeLine } from '@/domain/world/HingeLine';
import type { World } from '@/domain/world/World';

interface ThreeRealizationContextCollections {
  getProjectionPlanes: () => ProjectionPlane[];
  getHingeLines: () => HingeLine[];
}

export function createThreeRealizationContext(
  world: World,
  collections: ThreeRealizationContextCollections,
): ProjectionElementRealizationContext & Element3DRealizationContext {
  return {
    getProjectionPlaneById: id => world.getProjectionPlaneById(id),
    getPoint2D: id => world.getPoint2D(id),
    getLine2D: id => world.getLine2D(id),
    getCircle2D: id => world.getCircle2D(id),
    getProjectionPlane2DRealization: id => world.getProjectionPlane2DRealization(id),
    getProjectionPlane3DRealization: id => world.getProjectionPlane3DRealization(id),
    get3DPlaneRealization: id => world.get3DPlaneRealization(id),
    getHingeLineById: id => world.getHingeLineById(id),
    getAllProjectionPlanes: collections.getProjectionPlanes,
    getAllHingeLines: collections.getHingeLines,
  };
}

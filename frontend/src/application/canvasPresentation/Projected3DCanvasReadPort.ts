import type { Element3DRealizationContext } from '@/domain/world/projectionPlane/ProjectionPlaneContext';
import type { World } from '@/domain/world/World';
import type { Projected3DCanvasReadPort } from './Projected3DCanvasSelector';

export function createProjected3DCanvasReadPort(world: World, realizationContext: Element3DRealizationContext): Projected3DCanvasReadPort {
  return {
    getProjectionPlanes: () => world.getAllProjectionPlanes().map(plane => ({ id: plane.id })),
    getProjectionPlane3DRealization: planeId => world.getProjectionPlane3DRealization(planeId),
    get3DPoints: () => world.getAll3DPoints().map(point => ({ id: point.id, realization: point.realize3D(realizationContext) })),
    get3DLines: () => world.getAll3DLines().map(line => ({ id: line.id, realization: line.realize3D(realizationContext) })),
    get3DSegments: () => world.getAll3DSegments().map(segment => ({ id: segment.id, realization: segment.realize3D(realizationContext) })),
  };
}

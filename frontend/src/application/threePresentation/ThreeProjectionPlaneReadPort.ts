import { AuxiliaryProjectionPlane } from '@/domain/world/projectionPlane/AuxiliaryProjectionPlane';
import type { ProjectionPlaneRealization3D } from '@/domain/world/projectionPlane/ProjectionPlaneRealization';
import type { Plane3DRealization3D } from '@/domain/world/Element3DRealization3D';
import type { World } from '@/domain/world/World';

export interface ThreeProjectionPlaneReadModel {
  id: string;
  kind: 'fixed' | 'auxiliary';
  plane3DId: string | undefined;
  realization: ProjectionPlaneRealization3D | undefined;
}

export interface ThreeProjectionPlaneGridSource {
  plane3DRealization: Plane3DRealization3D | undefined;
  projectionRealization: ProjectionPlaneRealization3D | undefined;
}

export interface ThreeProjectionPlaneReadPort {
  getProjectionPlaneModels(): ThreeProjectionPlaneReadModel[];
  getProjectionPlaneGridSource(planeId: string): ThreeProjectionPlaneGridSource;
}

export function createThreeProjectionPlaneReadPort(world: World): ThreeProjectionPlaneReadPort {
  return {
    getProjectionPlaneModels: () => world.getAllProjectionPlanes().map(plane => ({
      id: plane.id,
      kind: plane instanceof AuxiliaryProjectionPlane ? 'auxiliary' : 'fixed',
      plane3DId: plane instanceof AuxiliaryProjectionPlane ? plane.plane3DId : plane.id,
      realization: world.getProjectionPlane3DRealization(plane.id),
    })),
    getProjectionPlaneGridSource: (planeId: string) => {
      const plane = world.getProjectionPlaneById(planeId);
      const plane3DId = plane instanceof AuxiliaryProjectionPlane ? plane.plane3DId : plane?.id;
      return {
        plane3DRealization: plane3DId ? world.get3DPlaneRealization(plane3DId) : undefined,
        projectionRealization: world.getProjectionPlane3DRealization(planeId),
      };
    },
  };
}

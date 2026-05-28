import type { HingeLineRealizationContext, ProjectionElementDiagnosticRealizationContext } from '@/domain/world/projectionPlane/ProjectionPlaneContext';
import { createWorldRealizationContext } from '@/application/presentation/WorldRealizationContext';
import type { ProjectionPlane } from '@/domain/world/projectionPlane/ProjectionPlane';
import type { HingeLine } from '@/domain/world/HingeLine';
import type { World } from '@/domain/world/World';

interface ThreeRealizationContextCollections {
  getProjectionPlanes: () => ProjectionPlane[];
  getHingeLines: () => HingeLine[];
}

export type ThreeRealizationContext = ProjectionElementDiagnosticRealizationContext & HingeLineRealizationContext;

export function createThreeRealizationContext(
  world: World,
  collections: ThreeRealizationContextCollections,
): ThreeRealizationContext {
  return {
    ...createWorldRealizationContext(world),
    getAllProjectionPlanes: collections.getProjectionPlanes,
    getAllHingeLines: collections.getHingeLines,
  };
}

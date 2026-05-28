import type { World } from '@/domain/world/World';
import { createThreePresentationAdapter } from './ThreePresentationAdapter';
import { createThreeGuideReadPort, type ThreeGuideIntersectionReadModel, type ThreeGuideReadModel, type ThreeGuideReadPort } from './ThreeGuideReadPort';
import { createThreeHingeReadPort, type ThreeHingeReadModel, type ThreeHingeReadPort } from './ThreeHingeReadPort';
import { createThreePlanarElementReadPort, type ThreePlanarCircleReadModel, type ThreePlanarElementReadPort, type ThreePlanarElementSourceDto, type ThreePlanarLineReadModel, type ThreePlanarPlaneReadModel, type ThreePlanarPointReadModel } from './ThreePlanarElementReadPort';
import { createThreeProjectionPlaneReadPort, type ThreeProjectionPlaneReadModel, type ThreeProjectionPlaneReadPort } from './ThreeProjectionPlaneReadPort';
import { createThreeReconstructedElementReadPort, type ThreeReconstructedElementReadPort, type ThreeReconstructedReadModel } from './ThreeReconstructedElementReadPort';

export type {
  ThreeGuideIntersectionReadModel,
  ThreeGuideReadModel,
  ThreeGuideReadPort,
  ThreeHingeReadModel,
  ThreeHingeReadPort,
  ThreePlanarCircleReadModel,
  ThreePlanarElementReadPort,
  ThreePlanarElementSourceDto,
  ThreePlanarLineReadModel,
  ThreePlanarPlaneReadModel,
  ThreePlanarPointReadModel,
  ThreeProjectionPlaneReadModel,
  ThreeProjectionPlaneReadPort,
  ThreeReconstructedElementReadPort,
  ThreeReconstructedReadModel,
};

export interface ThreePresentationReadPorts {
  readonly projectionPlanes: ThreeProjectionPlaneReadPort;
  readonly planarElements: ThreePlanarElementReadPort;
  readonly reconstructedElements: ThreeReconstructedElementReadPort;
  readonly guides: ThreeGuideReadPort;
  readonly hinges: ThreeHingeReadPort;
}

export function createThreePresentationReadPorts(world: World): ThreePresentationReadPorts {
  const adapter = createThreePresentationAdapter(world);
  return {
    projectionPlanes: createThreeProjectionPlaneReadPort(adapter),
    planarElements: createThreePlanarElementReadPort(adapter),
    reconstructedElements: createThreeReconstructedElementReadPort(adapter),
    guides: createThreeGuideReadPort(adapter),
    hinges: createThreeHingeReadPort(adapter),
  };
}

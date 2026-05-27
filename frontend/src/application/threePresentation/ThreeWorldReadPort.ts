import type { ThreeEntityPresentationData } from './ThreePresentationReadModel';
import type { World } from '@/domain/world/World';
import { createThreeGuideReadPort, type ThreeGuideIntersectionReadModel, type ThreeGuideReadModel, type ThreeGuideReadPort } from './ThreeGuideReadPort';
import { createThreeHingeReadPort, type ThreeHingeReadModel, type ThreeHingeReadPort } from './ThreeHingeReadPort';
import { createThreePlanarElementReadPort, type ThreePlanarCircleReadModel, type ThreePlanarElementReadPort, type ThreePlanarLineReadModel, type ThreePlanarPlaneReadModel, type ThreePlanarPointReadModel } from './ThreePlanarElementReadPort';
import { createThreeProjectionPlaneReadPort, type ThreeProjectionPlaneGridSource, type ThreeProjectionPlaneReadModel, type ThreeProjectionPlaneReadPort } from './ThreeProjectionPlaneReadPort';
import { createThreeReconstructedElementReadPort, type ThreeReconstructedElementReadPort, type ThreeReconstructedReadModel } from './ThreeReconstructedElementReadPort';

export type { ThreeEntityPresentationData };

export type {
  ThreeGuideIntersectionReadModel,
  ThreeGuideReadModel,
  ThreeGuideReadPort,
  ThreeHingeReadModel,
  ThreeHingeReadPort,
  ThreePlanarCircleReadModel,
  ThreePlanarElementReadPort,
  ThreePlanarLineReadModel,
  ThreePlanarPlaneReadModel,
  ThreePlanarPointReadModel,
  ThreeProjectionPlaneGridSource,
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
  return {
    projectionPlanes: createThreeProjectionPlaneReadPort(world),
    planarElements: createThreePlanarElementReadPort(world),
    reconstructedElements: createThreeReconstructedElementReadPort(world),
    guides: createThreeGuideReadPort(world),
    hinges: createThreeHingeReadPort(world),
  };
}

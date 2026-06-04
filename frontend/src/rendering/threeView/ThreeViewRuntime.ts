import type * as THREE from 'three';
import type { ThreePresentationModel } from '@/application/threePresentation/ThreePresentationModel';
import { ThreeSceneHost, type ThreeSceneHostMount } from './ThreeSceneHost';
import { createProjectionPlaneSceneObjects } from './ProjectionPlaneSceneAdapter';
import { createPlanarElementSceneObjects } from './PlanarElementSceneAdapter';
import { createReconstructedElementSceneObjects } from './ReconstructedElementSceneAdapter';
import { createGuideSceneObjects } from './GuideSceneAdapter';
import { createHingeSceneObjects } from './HingeSceneAdapter';

export interface ThreeViewSceneRegistry {
  replaceGroup(group: ThreeViewRuntimeGroup, objects: THREE.Object3D[]): void;
}

export interface ThreeViewRuntimeHost {
  readonly registry: ThreeViewSceneRegistry;
  mount(mount: ThreeSceneHostMount): void;
  resize(): void;
  dispose(): void;
}

export type ThreeViewRuntimeGroup = 'projectionPlanes' | 'planarElements' | 'reconstructedElements' | 'guides' | 'hinges';

export interface ThreeViewRuntimeOptions {
  host?: ThreeViewRuntimeHost;
}

export class ThreeViewRuntime {
  private readonly host: ThreeViewRuntimeHost;

  constructor(options: ThreeViewRuntimeOptions = {}) {
    this.host = options.host ?? new ThreeSceneHost();
  }

  mount(mount: ThreeSceneHostMount): void { this.host.mount(mount); }

  refresh(model: ThreePresentationModel): void {
    this.replaceGroup('projectionPlanes', createProjectionPlaneSceneObjects(model.projectionPlanes));
    this.replaceGroup('planarElements', createPlanarElementSceneObjects(model.planarElements));
    this.replaceGroup('reconstructedElements', createReconstructedElementSceneObjects(model.reconstructedElements));
    this.replaceGroup('guides', createGuideSceneObjects(model.guides));
    this.replaceGroup('hinges', createHingeSceneObjects(model.hinges));
  }

  resize(): void { this.host.resize(); }
  dispose(): void { this.host.dispose(); }

  private replaceGroup(group: ThreeViewRuntimeGroup, objects: THREE.Object3D[]): void {
    this.host.registry.replaceGroup(group, objects);
  }
}

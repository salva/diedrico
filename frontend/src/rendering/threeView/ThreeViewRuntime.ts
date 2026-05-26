import type { ThreePresentationInput } from '@/application/threePresentation/ThreePresentationModel';
import { ThreePresentationController } from '@/application/threePresentation/ThreePresentationController';
import { ThreeSceneHost, type ThreeSceneHostMount } from './ThreeSceneHost';
import { ProjectionPlaneSceneAdapter } from './ProjectionPlaneSceneAdapter';
import { PlanarElementSceneAdapter } from './PlanarElementSceneAdapter';
import { ReconstructedElementSceneAdapter } from './ReconstructedElementSceneAdapter';
import { GuideSceneAdapter } from './GuideSceneAdapter';
import { HingeSceneAdapter } from './HingeSceneAdapter';

export class ThreeViewRuntime {
  private readonly host = new ThreeSceneHost();
  private readonly controller = new ThreePresentationController();
  private readonly projectionPlaneAdapter = new ProjectionPlaneSceneAdapter();
  private readonly planarElementAdapter = new PlanarElementSceneAdapter();
  private readonly reconstructedElementAdapter = new ReconstructedElementSceneAdapter();
  private readonly guideAdapter = new GuideSceneAdapter();
  private readonly hingeAdapter = new HingeSceneAdapter();

  mount(mount: ThreeSceneHostMount): void { this.host.mount(mount); }

  refresh(input: ThreePresentationInput): void {
    const model = this.controller.buildModel(input);
    this.host.registry.replaceGroup('projectionPlanes', this.projectionPlaneAdapter.createObjects(model.projectionPlanes));
    this.host.registry.replaceGroup('planarElements', this.planarElementAdapter.createObjects(model.planarElements));
    this.host.registry.replaceGroup('reconstructedElements', this.reconstructedElementAdapter.createObjects(model.reconstructedElements));
    this.host.registry.replaceGroup('guides', this.guideAdapter.createObjects(model.guides));
    this.host.registry.replaceGroup('hinges', this.hingeAdapter.createObjects(model.hinges));
  }

  resize(): void { this.host.resize(); }
  dispose(): void { this.host.dispose(); }
}

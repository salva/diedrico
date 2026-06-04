import type * as THREE from 'three';
import type {
  GuidePresentationDto,
  HingePresentationDto,
  PlanarElementPresentationDto,
  ProjectionPlanePresentationDto,
  ReconstructedElementPresentationDto,
  ThreePresentationModel,
} from '@/application/threePresentation/ThreePresentationModel';
import { ThreeSceneHost, type ThreeSceneHostMount } from './ThreeSceneHost';
import { ProjectionPlaneSceneAdapter } from './ProjectionPlaneSceneAdapter';
import { PlanarElementSceneAdapter } from './PlanarElementSceneAdapter';
import { ReconstructedElementSceneAdapter } from './ReconstructedElementSceneAdapter';
import { GuideSceneAdapter } from './GuideSceneAdapter';
import { HingeSceneAdapter } from './HingeSceneAdapter';

export interface ThreeViewSceneRegistry {
  replaceGroup(group: ThreeViewRuntimeGroup, objects: THREE.Object3D[]): void;
}

export interface ThreeViewRuntimeHost {
  readonly registry: ThreeViewSceneRegistry;
  mount(mount: ThreeSceneHostMount): void;
  resize(): void;
  dispose(): void;
}

export interface ThreeViewSceneAdapter<TDto> {
  createObjects(dtos: TDto[]): THREE.Object3D[];
}

export type ThreeViewRuntimeGroup = 'projectionPlanes' | 'planarElements' | 'reconstructedElements' | 'guides' | 'hinges';

export interface ThreeViewRuntimeAdapters {
  projectionPlanes: ThreeViewSceneAdapter<ProjectionPlanePresentationDto>;
  planarElements: ThreeViewSceneAdapter<PlanarElementPresentationDto>;
  reconstructedElements: ThreeViewSceneAdapter<ReconstructedElementPresentationDto>;
  guides: ThreeViewSceneAdapter<GuidePresentationDto>;
  hinges: ThreeViewSceneAdapter<HingePresentationDto>;
}

export interface ThreeViewRuntimeOptions {
  host?: ThreeViewRuntimeHost;
  adapters?: Partial<ThreeViewRuntimeAdapters>;
}

export class ThreeViewRuntime {
  private readonly host: ThreeViewRuntimeHost;
  private readonly adapters: ThreeViewRuntimeAdapters;

  constructor(options: ThreeViewRuntimeOptions = {}) {
    this.host = options.host ?? new ThreeSceneHost();
    this.adapters = {
      projectionPlanes: options.adapters?.projectionPlanes ?? new ProjectionPlaneSceneAdapter(),
      planarElements: options.adapters?.planarElements ?? new PlanarElementSceneAdapter(),
      reconstructedElements: options.adapters?.reconstructedElements ?? new ReconstructedElementSceneAdapter(),
      guides: options.adapters?.guides ?? new GuideSceneAdapter(),
      hinges: options.adapters?.hinges ?? new HingeSceneAdapter(),
    };
  }

  mount(mount: ThreeSceneHostMount): void { this.host.mount(mount); }

  refresh(model: ThreePresentationModel): void {
    this.replaceGroup('projectionPlanes', this.adapters.projectionPlanes.createObjects(model.projectionPlanes));
    this.replaceGroup('planarElements', this.adapters.planarElements.createObjects(model.planarElements));
    this.replaceGroup('reconstructedElements', this.adapters.reconstructedElements.createObjects(model.reconstructedElements));
    this.replaceGroup('guides', this.adapters.guides.createObjects(model.guides));
    this.replaceGroup('hinges', this.adapters.hinges.createObjects(model.hinges));
  }

  resize(): void { this.host.resize(); }
  dispose(): void { this.host.dispose(); }

  private replaceGroup(group: ThreeViewRuntimeGroup, objects: THREE.Object3D[]): void {
    this.host.registry.replaceGroup(group, objects);
  }
}

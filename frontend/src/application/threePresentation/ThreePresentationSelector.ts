import type { ThreePresentationInput, ThreePresentationModel } from './ThreePresentationModel';
import { ProjectionPlane3DSelector } from './ProjectionPlane3DSelector';
import { PlanarElement3DSelector } from './PlanarElement3DSelector';
import { ReconstructedElement3DSelector } from './ReconstructedElement3DSelector';
import { Guide3DSelector } from './Guide3DSelector';
import { Hinge3DSelector } from './Hinge3DSelector';

export class ThreePresentationSelector {
  constructor(
    private readonly projectionPlanes = new ProjectionPlane3DSelector(),
    private readonly planarElements = new PlanarElement3DSelector(),
    private readonly reconstructedElements = new ReconstructedElement3DSelector(),
    private readonly guides = new Guide3DSelector(),
    private readonly hinges = new Hinge3DSelector(),
  ) {}

  select(input: ThreePresentationInput): ThreePresentationModel {
    const { world, displayOptions, selectedIds } = input;
    return {
      projectionPlanes: this.projectionPlanes.select(world, displayOptions.showPlanes, displayOptions.showGrid, displayOptions.showReferenceAxes),
      planarElements: this.planarElements.select(world, displayOptions.show2DElementsOnPlanes),
      reconstructedElements: this.reconstructedElements.select(world, displayOptions.showPlanes),
      guides: this.guides.select(world, selectedIds),
      hinges: this.hinges.select(world, displayOptions.showPlanes),
    };
  }
}

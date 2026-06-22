import type { RealizationService } from '@/domain/world/RealizationService';
import type { World } from '@/domain/world/World';
import type { VisibilityModel } from '@/application/processTree/VisibilityModel';
import type { ProcessTree } from '@/domain/processTree/ProcessTree';
import type { ThreeViewDisplayOptions } from '@/types/ThreeViewDisplayOptions';
import type { ThreePresentationModel } from './ThreePresentationModel';
import { createThreePresentationContext } from './ThreePresentationContext';
import { ProjectionPlane3DSelector } from './ProjectionPlane3DSelector';
import { PlanarElement3DSelector } from './PlanarElement3DSelector';
import { ReconstructedElement3DSelector } from './ReconstructedElement3DSelector';
import { ProjectionLine3DSelector } from './ProjectionLine3DSelector';
import { Guide3DSelector } from './Guide3DSelector';
import { Hinge3DSelector } from './Hinge3DSelector';
import { buildProjectionPlaneModels } from './ThreeProjectionPlaneBuilder';
import { buildPlanarPlaneModels } from './ThreePlanarElementBuilder';
import { buildReconstructedModels } from './ThreeReconstructedElementBuilder';
import { buildProjectionLineModels } from './ThreeProjectionLineBuilder';
import { buildGuideIntersectionModels, buildSelectedGuideModels } from './ThreeGuideBuilder';
import { buildHingeModels } from './ThreeHingeBuilder';

export interface ThreePresentationBuilderInput {
  world: World;
  realizations: RealizationService;
  processTree: ProcessTree;
  visibilityModel: VisibilityModel;
  displayOptions: ThreeViewDisplayOptions;
  selectedIds: readonly string[];
}

export function buildThreePresentationModel(input: ThreePresentationBuilderInput): ThreePresentationModel {
  const context = createThreePresentationContext(input.world, input.realizations, input.processTree, input.visibilityModel);
  const guides = buildSelectedGuideModels(context, input.selectedIds);
  return new ThreePresentationSelector().select({
    projectionPlanes: buildProjectionPlaneModels(context),
    planarPlanes: buildPlanarPlaneModels(context),
    reconstructedElements: buildReconstructedModels(context),
    projectionLines: buildProjectionLineModels(context),
    guides,
    guideIntersections: guides.length ? buildGuideIntersectionModels(context) : undefined,
    hinges: buildHingeModels(context),
    displayOptions: input.displayOptions,
  });
}

interface ThreePresentationSelectionInput {
  projectionPlanes: ReturnType<typeof buildProjectionPlaneModels>;
  planarPlanes: ReturnType<typeof buildPlanarPlaneModels>;
  reconstructedElements: ReturnType<typeof buildReconstructedModels>;
  projectionLines: ReturnType<typeof buildProjectionLineModels>;
  guides: ReturnType<typeof buildSelectedGuideModels>;
  guideIntersections: ReturnType<typeof buildGuideIntersectionModels> | undefined;
  hinges: ReturnType<typeof buildHingeModels>;
  displayOptions: ThreeViewDisplayOptions;
}

export class ThreePresentationSelector {
  constructor(
    private readonly projectionPlanes = new ProjectionPlane3DSelector(),
    private readonly planarElements = new PlanarElement3DSelector(),
    private readonly reconstructedElements = new ReconstructedElement3DSelector(),
    private readonly projectionLines = new ProjectionLine3DSelector(),
    private readonly guides = new Guide3DSelector(),
    private readonly hinges = new Hinge3DSelector(),
  ) {}

  select(input: ThreePresentationSelectionInput): ThreePresentationModel {
    const { displayOptions } = input;
    return {
      projectionPlanes: this.projectionPlanes.select(input.projectionPlanes, displayOptions.showPlanes, displayOptions.showGrid, displayOptions.showReferenceAxes),
      planarElements: this.planarElements.select(input.planarPlanes, displayOptions.show2DElementsOnPlanes),
      reconstructedElements: this.reconstructedElements.select(input.reconstructedElements, displayOptions.showPlanes),
      projectionLines: this.projectionLines.select(input.projectionLines, displayOptions.showLinkingVisuals),
      guides: this.guides.select(input.guides, input.guideIntersections),
      hinges: this.hinges.select(input.hinges, displayOptions.showPlanes),
    };
  }
}

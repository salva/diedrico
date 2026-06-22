import type { World } from '@/domain/world/World';
import type { VisibilityModel } from '@/application/processTree/VisibilityModel';
import type { ProcessTree } from '@/domain/processTree/ProcessTree';
import type { DependencyService } from '@/domain/world/DependencyService';
import type { ProjectionPlaneConstructionService } from '@/domain/world/ProjectionPlaneConstructionService';
import type { ProjectionConstructionService } from '@/domain/world/ProjectionConstructionService';
import type { ReconstructionConstructionService } from '@/domain/world/ReconstructionConstructionService';
import type { LabelGenerator } from '@/domain/world/LabelGenerator';
import type { WorldIdAllocator } from '@/domain/world/WorldIdAllocator';
import type { RealizationService } from '@/domain/world/RealizationService';
import type { CachedProjectionElementRealizationContext, Element3DRealizationContext } from '@/domain/world/projectionPlane/ProjectionPlaneContext';

export interface OperationContext {
  readonly world: World;
  readonly visibilityModel: VisibilityModel;
  readonly processTree: ProcessTree;
  readonly dependencies: DependencyService;
  readonly projectionConstruction: ProjectionConstructionService;
  readonly reconstructionConstruction: ReconstructionConstructionService;
  readonly projectionPlaneConstruction: ProjectionPlaneConstructionService;
  readonly idAllocator: WorldIdAllocator;
  readonly labelGenerator: LabelGenerator;
  readonly realizations: RealizationService;
  readonly realizationContext: CachedProjectionElementRealizationContext & Element3DRealizationContext;
}

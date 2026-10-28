import type { World } from '@/domain/world/World';
import type { ProcessTree } from '@/domain/processTree/ProcessTree';
import type { DependencyService } from '@/domain/world/DependencyService';
import type { ProjectionPlaneConstructionService } from '@/domain/world/ProjectionPlaneConstructionService';
import type { ProjectionConstructionService } from '@/domain/world/ProjectionConstructionService';
import type { ReconstructionConstructionService } from '@/domain/world/ReconstructionConstructionService';
import type { LabelGenerator } from '@/domain/world/LabelGenerator';
import type { WorldIdAllocator } from '@/domain/world/WorldIdAllocator';
import type { RealizationService } from '@/domain/world/RealizationService';
import type { CachedProjectionElementRealizationContext, Element3DRealizationContext } from '@/domain/world/projectionPlane/ProjectionPlaneContext';

import type { ProcessNodeType } from '@/domain/processTree/ProcessTree';

/** Only the visibility capabilities exercised by process-tree operations. */
export interface OperationVisibility {
  get(nodeId: string, nodeType: ProcessNodeType): { showIntermediates?: boolean };
  setShowIntermediates(subprocessId: string, value: boolean): void;
  toggleOutput(nodeId: string, nodeType: ProcessNodeType): void;
}

export interface OperationContext {
  readonly world: World;
  readonly visibilityModel: OperationVisibility;
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

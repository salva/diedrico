import type { World } from '@/domain/world/World';
import type { VisibilityModel } from '@/application/processTree/VisibilityModel';
import type { ProcessTree } from '@/domain/processTree/ProcessTree';
import type { DependencyService } from '@/domain/world/DependencyService';
import type { RealizationService } from '@/domain/world/RealizationService';
import type { ConstructionService } from '@/domain/world/ConstructionService';
import type { WorldIdAllocator } from '@/domain/world/WorldIdAllocator';
import type { LabelGenerator } from '@/domain/world/LabelGenerator';

export interface OperationContext {
  readonly world: World;
  readonly visibilityModel: VisibilityModel;
  readonly processTree: ProcessTree;
  readonly dependencies: DependencyService;
  readonly realizations: RealizationService;
  readonly constructionService: ConstructionService;
  readonly idAllocator: WorldIdAllocator;
  readonly labelGenerator: LabelGenerator;
}

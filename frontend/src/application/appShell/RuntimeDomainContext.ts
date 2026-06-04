import type { OperationContext } from '@/commands/operations/OperationContext';
import type { VisibilityModel } from '@/application/processTree/VisibilityModel';
import { ConstructionService } from '@/domain/world/ConstructionService';
import { DependencyService } from '@/domain/world/DependencyService';
import { LabelGenerator } from '@/domain/world/LabelGenerator';
import { RealizationService } from '@/domain/world/RealizationService';
import { World } from '@/domain/world/World';
import { WorldIdAllocator } from '@/domain/world/WorldIdAllocator';
import { ProcessTree } from '@/domain/processTree/ProcessTree';

export class RuntimeDomainContext {
  readonly processTree = new ProcessTree();
  readonly dependencies = new DependencyService();
  readonly realizations = new RealizationService();
  readonly idAllocator = new WorldIdAllocator();
  readonly labelGenerator = new LabelGenerator();
  readonly world = new World({
    processTree: this.processTree,
    dependencyService: this.dependencies,
    realizationService: this.realizations,
    idAllocator: this.idAllocator,
    labelGenerator: this.labelGenerator,
  });

  // ConstructionService still needs World's realization/storage context until the
  // construction split removes that dependency.
  readonly constructionService: ConstructionService = this.world.getConstructionService();

  createOperationContext(visibilityModel: VisibilityModel): OperationContext {
    return {
      world: this.world,
      visibilityModel,
      processTree: this.processTree,
      dependencies: this.dependencies,
      realizations: this.realizations,
      constructionService: this.constructionService,
      idAllocator: this.idAllocator,
      labelGenerator: this.labelGenerator,
    };
  }
}

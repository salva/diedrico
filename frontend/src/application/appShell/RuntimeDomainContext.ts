import type { OperationContext } from '@/commands/operations/OperationContext';
import type { VisibilityModel } from '@/application/processTree/VisibilityModel';
import { ProjectionPlaneConstructionService } from '@/domain/world/ProjectionPlaneConstructionService';
import { ProjectionConstructionService } from '@/domain/world/ProjectionConstructionService';
import { ReconstructionConstructionService } from '@/domain/world/ReconstructionConstructionService';
import { DependencyService } from '@/domain/world/DependencyService';
import { LabelGenerator } from '@/domain/world/LabelGenerator';
import { RealizationService } from '@/domain/world/RealizationService';
import { World } from '@/domain/world/World';
import { WorldIdAllocator } from '@/domain/world/WorldIdAllocator';
import { ProcessTree } from '@/domain/processTree/ProcessTree';
import { createWorldRealizationContext } from '@/domain/world/WorldRealizationContext';
import type { ProjectionPlane } from '@/domain/world/projectionPlane/ProjectionPlane';

export class RuntimeDomainContext {
  readonly processTree = new ProcessTree();
  readonly dependencies = new DependencyService();
  readonly realizations = new RealizationService();
  readonly idAllocator = new WorldIdAllocator();
  readonly labelGenerator = new LabelGenerator();
  readonly world = new World();

  readonly realizationContext = createWorldRealizationContext(this.world, this.realizations);
  readonly projectionConstruction = new ProjectionConstructionService({
    idAllocator: this.idAllocator,
    labelGenerator: this.labelGenerator,
    getProjectionPlaneById: id => this.realizationContext.getProjectionPlaneById(id),
    getPoint2D: id => this.realizationContext.getPoint2D(id),
    getLine2D: id => this.realizationContext.getLine2D(id),
    getCircle2D: id => this.realizationContext.getCircle2D(id),
    getProjectionPlane2DRealization: id => this.realizationContext.getProjectionPlane2DRealization(id),
    getProjectionPlane3DRealization: id => this.realizationContext.getProjectionPlane3DRealization(id),
    get3DPlaneRealization: id => this.realizationContext.get3DPlaneRealization(id),
    getPlaneForElement: id => getPlaneForElement(this.world, id),
    getHingeLineById: id => this.realizationContext.getHingeLineById(id),
  }, this.dependencies);
  readonly reconstructionConstruction = new ReconstructionConstructionService({
    world: this.world,
    dependencies: this.dependencies,
    ids: this.idAllocator,
    labels: this.labelGenerator,
  });
  readonly projectionPlaneConstruction = new ProjectionPlaneConstructionService({
    world: this.world,
    dependencies: this.dependencies,
    ids: this.idAllocator,
    labels: this.labelGenerator,
    projectionConstruction: this.projectionConstruction,
  });

  clear(): void {
    this.world.clear();
    this.realizations.clear();
    this.processTree.clear();
    this.dependencies.clear();
    this.labelGenerator.reset();
    this.idAllocator.reset();
  }

  createOperationContext(visibilityModel: VisibilityModel): OperationContext {
    return {
      world: this.world,
      visibilityModel,
      processTree: this.processTree,
      dependencies: this.dependencies,
      projectionConstruction: this.projectionConstruction,
      reconstructionConstruction: this.reconstructionConstruction,
      projectionPlaneConstruction: this.projectionPlaneConstruction,
      idAllocator: this.idAllocator,
      labelGenerator: this.labelGenerator,
      realizations: this.realizations,
      realizationContext: this.realizationContext,
    };
  }
}

function getPlaneForElement(world: World, elementId: string): ProjectionPlane | undefined {
  for (const plane of world.getAllProjectionPlanes()) {
    if (plane.getPoint(elementId) || plane.getLine(elementId) || plane.getCircle(elementId)) {
      return plane;
    }
  }
  return undefined;
}

/** Test helpers for initialized runtime contexts and semantic world access. */

import { World } from '../../src/domain/world/World';
import { CommandStack } from '../../src/commands/CommandStack';
import { initializeWorld } from '../../src/application/world/initializeWorld';
import { VisibilityModel } from '../../src/application/processTree/VisibilityModel';
import type { OperationContext } from '../../src/commands/operations/OperationContext';
import { DependencyService } from '../../src/domain/world/DependencyService';
import { ProcessTree } from '../../src/domain/processTree/ProcessTree';
import { ProjectionConstructionService } from '../../src/domain/world/ProjectionConstructionService';
import { ProjectionPlaneConstructionService } from '../../src/domain/world/ProjectionPlaneConstructionService';
import { ReconstructionConstructionService } from '../../src/domain/world/ReconstructionConstructionService';
import { WorldIdAllocator } from '../../src/domain/world/WorldIdAllocator';
import { LabelGenerator } from '../../src/domain/world/LabelGenerator';
import { RealizationService } from '../../src/domain/world/RealizationService';
import { createWorldRealizationContext } from '../../src/domain/world/WorldRealizationContext';
import { GeometryElementLookup } from '../../src/domain/world/GeometryElementLookup';
import type { ProjectionPlane } from '../../src/domain/world/projectionPlane/ProjectionPlane';
import type { FreePoint2D } from '../../src/domain/world/Point';
import { HalfHingeLine2D, type HingeLine } from '../../src/domain/world/HingeLine';

export interface TestRuntimeContext {
  readonly world: World;
  readonly visibilityModel: VisibilityModel;
  readonly commandStack: CommandStack;
  readonly operationContext: OperationContext;
}

function createProjectionConstructionService(
  world: World,
  dependencies: DependencyService,
  ids: WorldIdAllocator,
  labels: LabelGenerator,
  realizations: RealizationService,
): ProjectionConstructionService {
  const realizationContext = createWorldRealizationContext(world, realizations);
  const lookup = new GeometryElementLookup(world);
  return new ProjectionConstructionService({
    idAllocator: ids,
    labelGenerator: labels,
    getProjectionPlaneById: id => world.getProjectionPlaneById(id),
    getPoint2D: id => lookup.getPoint2D(id),
    getLine2D: id => lookup.getLine2D(id),
    getCircle2D: id => lookup.getCircle2D(id),
    getProjectionPlane2DRealization: id => realizationContext.getProjectionPlane2DRealization(id),
    getProjectionPlane3DRealization: id => realizationContext.getProjectionPlane3DRealization(id),
    get3DPlaneRealization: id => realizationContext.get3DPlaneRealization(id),
    getPlaneForElement: id => getPlaneForElement(world, id),
    getHingeLineById: id => world.getHingeLineById(id),
  }, dependencies);
}

export function createTestRuntimeContext(options: {
  initialized?: boolean;
  world?: World;
  visibilityModel?: VisibilityModel;
  commandStack?: CommandStack;
  dependencies?: DependencyService;
  processTree?: ProcessTree;
  ids?: WorldIdAllocator;
  labels?: LabelGenerator;
  realizations?: RealizationService;
} = {}): TestRuntimeContext {
  const world = options.world ?? new World();
  const visibilityModel = options.visibilityModel ?? new VisibilityModel();
  const commandStack = options.commandStack ?? new CommandStack();
  const processTree = options.processTree ?? new ProcessTree();
  const dependencies = options.dependencies ?? new DependencyService();
  const ids = options.ids ?? new WorldIdAllocator();
  const labels = options.labels ?? new LabelGenerator();
  const realizations = options.realizations ?? new RealizationService();
  const realizationContext = createWorldRealizationContext(world, realizations);
  const projectionConstruction = createProjectionConstructionService(world, dependencies, ids, labels, realizations);
  const operationContext: OperationContext = {
    world,
    visibilityModel,
    processTree,
    dependencies,
    projectionConstruction,
    reconstructionConstruction: new ReconstructionConstructionService({
      world,
      dependencies,
      ids,
      labels,
    }),
    projectionPlaneConstruction: new ProjectionPlaneConstructionService({
      world,
      dependencies,
      ids,
      labels,
      projectionConstruction,
    }),
    idAllocator: ids,
    labelGenerator: labels,
    realizations,
    realizationContext,
  };
  if (options.initialized !== false) {
    initializeWorld(world, commandStack, operationContext);
  }
  return { world, visibilityModel, commandStack, operationContext };
}

export const createTestWorld = createTestRuntimeContext;

/**
 * Get horizontal projection plane from world
 */
export function getHorizontalPlane(world: World): ProjectionPlane {
  return getProjectionPlaneByName(world, 'P_H');
}

/**
 * Get vertical projection plane from world
 */
export function getVerticalPlane(world: World): ProjectionPlane {
  return getProjectionPlaneByName(world, 'P_V');
}

/**
 * Get horizontal projection plane ID
 */
export function getHorizontalPlaneId(world: World): string {
  return getHorizontalPlane(world).id!;
}

/**
 * Get vertical projection plane ID
 */
export function getVerticalPlaneId(world: World): string {
  return getVerticalPlane(world).id!;
}

/**
 * Get horizontal origin point from world
 * Phase 53: Use label-based access
 */
export function getHorizontalOrigin(world: World): FreePoint2D {
  return getHorizontalPlane(world).getPoint2DByLabel('O_H') as FreePoint2D;
}

/**
 * Get horizontal origin point ID
 * Phase 53: Use label-based access
 */
export function getHorizontalOriginId(world: World): string {
  return getHorizontalPlane(world).getPoint2DByLabel('O_H').id!;
}

function getProjectionPlaneByName(world: World, name: string): ProjectionPlane {
  const plane = world.getAllProjectionPlanes().find(candidate => candidate.name === name);
  if (!plane) throw new Error(`Projection plane not found with name: ${name}`);
  return plane;
}

export function getHalfHingeLines2D(world: World, planeId: string): HalfHingeLine2D[] {
  const plane = world.getProjectionPlaneById(planeId);
  if (!plane) throw new Error(`Projection plane not found with id: ${planeId}`);
  return plane.getAllLines().filter((line): line is HalfHingeLine2D => line instanceof HalfHingeLine2D);
}

export function getElement2D(world: World, elementId: string) {
  return new GeometryElementLookup(world).getElement2D(elementId);
}

export function getPlaneForElement(world: World, elementId: string): ProjectionPlane | undefined {
  for (const plane of world.getAllProjectionPlanes()) {
    if (plane.getPoint(elementId) || plane.getLine(elementId) || plane.getCircle(elementId)) {
      return plane;
    }
  }
  return undefined;
}

/**
 * Get hinge line connecting P_H and P_V
 * Note: This is a test helper - there's no conceptual 'main' hinge line
 */
export function getMainHingeLine(world: World): HingeLine {
  const planeH = getHorizontalPlane(world);
  const planeV = getVerticalPlane(world);
  
  const hingeLines = world.getAllHingeLines();
  const hingeLine = hingeLines.find(
    hl => (hl.plane1Id === planeH.id && hl.plane2Id === planeV.id) ||
          (hl.plane1Id === planeV.id && hl.plane2Id === planeH.id)
  );
  
  if (!hingeLine) {
    throw new Error('No hinge line found connecting P_H and P_V');
  }
  
  return hingeLine;
}

/**
 * Test helpers for World semantic access (Phase 46)
 * 
 * These helpers abstract away specific ID values, allowing tests
 * to work with semantic references (horizontal plane, vertical plane, etc.)
 * instead of hardcoded IDs.
 * 
 * Usage:
 * ```typescript
 * const { world, commandStack } = createTestWorld();
 * const planeH = getHorizontalPlane(world);
 * const planeV = getVerticalPlane(world);
 * const originH = getHorizontalOrigin(world);
 * ```
 */

import { World } from '../../src/domain/world/World';
import { CommandStack } from '../../src/commands/CommandStack';
import { initializeWorld } from '../../src/application/world/initializeWorld';
import { VisibilityModel } from '../../src/application/processTree/VisibilityModel';
import type { ProjectionPlane } from '../../src/domain/world/projectionPlane/ProjectionPlane';
import type { FreePoint2D } from '../../src/domain/world/Point';
import type { HingeLine } from '../../src/domain/world/HingeLine';

/**
 * Create a fully initialized World for testing.
 * 
 * Returns a World with:
 * - P_H (horizontal) and P_V (vertical) projection planes
 * - Origin points O_H and O_V at (0,0) on each plane
 * - Hinge line connecting the two planes
 * - CommandStack for executing commands
 * 
 * Usage:
 * ```typescript
 * const { world, commandStack } = createTestWorld();
 * const plane = world.getProjectionPlaneByLabel('P_H');  // Succeeds
 * const origin = plane.getPoint2DByLabel('O_H');          // Succeeds
 * ```
 * 
 * @returns Object with initialized world and command stack
 */
export function createTestWorld(): { world: World; visibilityModel: VisibilityModel; commandStack: CommandStack } {
  const world = new World();
  const visibilityModel = new VisibilityModel();
  const commandStack = new CommandStack();
  initializeWorld(world, visibilityModel, commandStack);
  return { world, visibilityModel, commandStack };
}

/**
 * Setup basic world and return with plane IDs for convenience.
 * Alias for createTestWorld that also returns semantic IDs.
 * 
 * @returns Object with world, commandStack, and plane IDs
 */
export function setupBasicWorld(): {
  world: World;
  visibilityModel: VisibilityModel;
  commandStack: CommandStack;
  projPlaneH: string;
  projPlaneV: string;
} {
  const { world, visibilityModel, commandStack } = createTestWorld();
  return {
    world,
    visibilityModel,
    commandStack,
    projPlaneH: getHorizontalPlaneId(world),
    projPlaneV: getVerticalPlaneId(world),
  };
}

/**
 * Get horizontal projection plane from world
 */
export function getHorizontalPlane(world: World): ProjectionPlane {
  return world.getProjectionPlaneByLabel('P_H');
}

/**
 * Get vertical projection plane from world
 */
export function getVerticalPlane(world: World): ProjectionPlane {
  return world.getProjectionPlaneByLabel('P_V');
}

/**
 * Get horizontal projection plane ID
 */
export function getHorizontalPlaneId(world: World): string {
  return world.getProjectionPlaneByLabel('P_H').id!;
}

/**
 * Get vertical projection plane ID
 */
export function getVerticalPlaneId(world: World): string {
  return world.getProjectionPlaneByLabel('P_V').id!;
}

/**
 * Get horizontal origin point from world
 * Phase 53: Use label-based access
 */
export function getHorizontalOrigin(world: World): FreePoint2D {
  return world.getProjectionPlaneByLabel('P_H').getPoint2DByLabel('O_H') as FreePoint2D;
}

/**
 * Get vertical origin point from world
 * Phase 53: Use label-based access
 */
export function getVerticalOrigin(world: World): FreePoint2D {
  return world.getProjectionPlaneByLabel('P_V').getPoint2DByLabel('O_V') as FreePoint2D;
}

/**
 * Get horizontal origin point ID
 * Phase 53: Use label-based access
 */
export function getHorizontalOriginId(world: World): string {
  return world.getProjectionPlaneByLabel('P_H').getPoint2DByLabel('O_H').id!;
}

/**
 * Get vertical origin point ID
 * Phase 53: Use label-based access
 */
export function getVerticalOriginId(world: World): string {
  return world.getProjectionPlaneByLabel('P_V').getPoint2DByLabel('O_V').id!;
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

/**
 * Get ID of hinge line connecting P_H and P_V
 */
export function getMainHingeLineId(world: World): string {
  return getMainHingeLine(world).id!;
}

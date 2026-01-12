/**
 * Test helpers for World semantic access (Phase 46)
 * 
 * These helpers abstract away specific ID values, allowing tests
 * to work with semantic references (horizontal plane, vertical plane, etc.)
 * instead of hardcoded IDs.
 * 
 * Usage:
 * ```typescript
 * const world = new World();
 * const planeH = getHorizontalPlane(world);
 * const planeV = getVerticalPlane(world);
 * const originH = getHorizontalOrigin(world);
 * ```
 */

import type { World } from '../../src/domain/world/World';
import type { ProjectionPlane } from '../../src/domain/world/ProjectionPlane';
import type { FreePoint2D } from '../../src/domain/world/Point';
import type { HingeLine } from '../../src/domain/world/HingeLine';

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
 * Get main hinge line from world
 */
export function getMainHingeLine(world: World): HingeLine {
  return world.getMainHingeLine();
}

/**
 * Get main hinge line ID
 */
export function getMainHingeLineId(world: World): string {
  return world.getMainHingeLine().id!;
}

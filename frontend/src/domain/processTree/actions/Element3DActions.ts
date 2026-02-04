/**
 * Element3DActions - ProcessTree records for 3D element creation
 *
 * Phase 78: These actions are produced by 3D element operations.
 * Phase 93: Convenience wrappers for generic createAction().
 * Dependencies tracked by DependencyService,
 * construction parameters accessible via element properties.
 */

import { createAction, type Action } from '../Action';

/**
 * Create an action for adding a 3D point from two 2D projections
 * 
 * Phase 93: Dependencies tracked by DependencyService.
 * The 3D point depends on its two 2D point projections.
 */
export function createAdd3DPointAction(
  pointId: string
): Action {
  return createAction(pointId, `3D point ${pointId}`);
}

/**
 * Create an action for adding a 3D line from two 2D projections
 * 
 * Phase 93: Dependencies tracked by DependencyService.
 * The 3D line depends on its two 2D line projections.
 */
export function createAdd3DLineAction(
  lineId: string
): Action {
  return createAction(lineId, `3D line ${lineId}`);
}

/**
 * Create an action for adding a 3D plane from two trace lines
 * 
 * Phase 93: Dependencies tracked by DependencyService.
 * The 3D plane depends on its two trace line projections.
 */
export function createAdd3DPlaneAction(
  planeId: string
): Action {
  return createAction(planeId, `3D plane ${planeId}`);
}

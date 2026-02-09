/**
 * Initialization actions - ProcessTree records for World initialization
 *
 * Phase 47: These actions are produced by initialization operations.
 * Phase 93: Convenience wrappers for generic createAction().
 * Dependencies tracked by DependencyService,
 * construction parameters accessible via element properties.
 * They are grouped under the "World Initialization" subprocess.
 */

import { createAction, type Action } from '../Action';

export function createInitializePlane3DAction(planeId: string): Action {
  return createAction(planeId, `Plane ${planeId}`);
}

export function createInitializeProjectionPlaneAction(
  projPlaneId: string
): Action {
  return createAction(projPlaneId, `Projection plane ${projPlaneId}`);
}

export function createInitializeOriginPoint2DAction(
  pointId: string
): Action {
  return createAction(pointId, `Origin ${pointId}`);
}

export function createInitializeHingeLineAction(
  hingeLineId: string
): Action {
  // Element descriptor will provide proper description like "Hinge Line (P_H ⟷ P_A1)"
  return createAction(hingeLineId, `Hinge line connecting planes`);
}

export function createInitializeHalfHingeLine2DAction(
  lineId: string
): Action {
  // Element descriptor will provide proper description
  return createAction(lineId, `Hinge line trace on plane`);
}

/**
 * Create process tree action for broken hinge line
 * Phase 101: Broken Hinge Lines for auxiliary projection planes
 */
export function createInitializeBrokenHingeLineAction(
  hingeLineId: string
): Action {
  // Element descriptor will provide description like "Broken Hinge Line (distance transport between P_A1 and P_V)"
  return createAction(hingeLineId, `Broken hinge line (distance transport)`);
}

/**
 * Create process tree action for broken half hinge line 2D
 * Phase 101: Broken Hinge Lines for auxiliary projection planes
 */
export function createInitializeBrokenHalfHingeLine2DAction(
  lineId: string
): Action {
  // Element descriptor will provide proper description
  return createAction(lineId, `Broken hinge line trace on plane`);
}

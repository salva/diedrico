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
  return createAction(hingeLineId, `Hinge line ${hingeLineId}`);
}

export function createInitializeHalfHingeLine2DAction(
  lineId: string
): Action {
  return createAction(lineId, `Half hinge line ${lineId}`);
}

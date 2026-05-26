/**
 * CreateCircleAction - Records creation of a circle from center and circumference point
 * 
 * Phase 93: Convenience wrapper for generic createAction().
 * Dependencies (centerId, circumferencePointId) now tracked by DependencyService (Phase 91).
 * Element properties (planeId, centerId, circumferencePointId) accessible via circle object.
 * 
 */

import { createAction, type Action } from '../Action';

export function createCircleAction(circleId: string): Action {
  return createAction(circleId, `Circle ${circleId}`);
}

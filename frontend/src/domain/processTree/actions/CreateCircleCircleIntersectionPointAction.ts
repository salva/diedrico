/**
 * CreateCircleCircleIntersectionPointAction - Records creation of circle-circle intersection point
 * 
 * Phase 93: Convenience wrapper for generic createAction().
 * Dependencies tracked by DependencyService,
 * construction parameters accessible via element properties.
 * 
 */

import { createAction, type Action } from '../Action';

export function createCircleCircleIntersectionPointAction(
  pointId: string
): Action {
  return createAction(pointId, `Circle-circle intersection ${pointId}`);
}

/**
 * CreateLineCircleIntersectionPointAction - Records creation of line-circle intersection point
 * 
 * Phase 93: Convenience wrapper for generic createAction().
 * Dependencies tracked by DependencyService,
 * construction parameters accessible via element properties.
 * 
 */

import { createAction, type Action } from '../Action';

export function createLineCircleIntersectionPointAction(
  pointId: string
): Action {
  return createAction(pointId, `Line-circle intersection ${pointId}`);
}

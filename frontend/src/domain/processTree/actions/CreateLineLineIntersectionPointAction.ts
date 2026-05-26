/**
 * CreateLineLineIntersectionPointAction - Records creation of line-line intersection point
 * 
 * Phase 93: Convenience wrapper for generic createAction().
 * Dependencies tracked by DependencyService,
 * construction parameters accessible via element properties.
 * 
 */

import { createAction, type Action } from '../Action';

export function createLineLineIntersectionPointAction(
  pointId: string
): Action {
  return createAction(pointId, `Line-line intersection ${pointId}`);
}

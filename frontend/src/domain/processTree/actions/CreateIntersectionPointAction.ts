/**
 * CreateIntersectionPointAction - Records creation of an intersection point
 * 
 * Phase 93: Convenience wrapper for generic createAction().
 * Dependencies tracked by DependencyService,
 * construction parameters accessible via element properties.
 * 
 * Reference: specs/001-dihedral-learning-mvp/data-model.md §Phase 93
 */

import { createAction, type Action } from '../Action';

export function createIntersectionPointAction(
  pointId: string
): Action {
  return createAction(pointId, `Created intersection point ${pointId}`);
}

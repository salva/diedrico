/**
 * CreateGuideAction - Records creation of a guide perpendicular to a line
 * 
 * Phase 93: Convenience wrapper for generic createAction().
 * Dependencies tracked by DependencyService,
 * construction parameters accessible via element properties.
 * 
 * Reference: specs/001-dihedral-learning-mvp/data-model.md §Phase 93
 */

import { createAction, type Action } from '../Action';

export function createGuideAction(
  guideId: string
): Action {
  return createAction(guideId, `Created guide ${guideId}`);
}

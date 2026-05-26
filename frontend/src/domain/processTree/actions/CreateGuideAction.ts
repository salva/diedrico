/**
 * CreateGuideAction - Records creation of a guide perpendicular to a line
 * 
 * Phase 93: Convenience wrapper for generic createAction().
 * Dependencies tracked by DependencyService,
 * construction parameters accessible via element properties.
 * 
 */

import { createAction, type Action } from '../Action';

export function createGuideAction(
  guideId: string
): Action {
  return createAction(guideId, `Guide ${guideId}`);
}

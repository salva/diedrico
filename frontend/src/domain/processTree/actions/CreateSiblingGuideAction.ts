/**
 * CreateSiblingGuideAction - Records creation of a sibling guide
 * 
 * Sibling guides are automatically created when creating a guide perpendicular
 * to a HalfHingeLine2D - the sibling appears on the complementary projection plane.
 * 
 * Phase 93: Convenience wrapper for generic createAction().
 * Dependencies tracked by DependencyService,
 * construction parameters accessible via element properties.
 * 
 * Reference: specs/001-dihedral-learning-mvp/data-model.md §SiblingGuide2D
 */

import { createAction, type Action } from '../Action';

export function createSiblingGuideAction(
  siblingGuideId: string
): Action {
  return createAction(siblingGuideId, `Sibling guide ${siblingGuideId}`);
}

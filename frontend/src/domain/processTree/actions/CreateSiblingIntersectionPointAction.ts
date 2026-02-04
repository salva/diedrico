/**
 * CreateSiblingIntersectionPointAction - Records creation of a sibling intersection point
 * 
 * Sibling intersections are automatically created when an element intersects with
 * a HalfHingeLine2D - the sibling appears on the complementary projection plane.
 * 
 * Phase 93: Convenience wrapper for generic createAction().
 * Dependencies tracked by DependencyService,
 * construction parameters accessible via element properties.
 * 
 * Reference: specs/001-dihedral-learning-mvp/data-model.md §SiblingIntersectionPoint2D
 */

import { createAction, type Action } from '../Action';

export function createSiblingIntersectionPointAction(
  siblingPointId: string
): Action {
  return createAction(siblingPointId, `Sibling intersection ${siblingPointId}`);
}

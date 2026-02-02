/**
 * CreatePointAction - Records creation of a free point
 * 
 * Phase 93: Convenience wrapper for generic createAction().
 * Element properties (planeId, position) accessible via element.planeId, element.position.
 * 
 * Reference: specs/001-dihedral-learning-mvp/data-model.md §Phase 93
 */

import { createAction, type Action } from '../Action';

export function createPointAction(pointId: string): Action {
  return createAction(pointId, `Created point ${pointId}`);
}

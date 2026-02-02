/**
 * CreateLineAction - Records creation of a line between two points
 * 
 * Phase 93: Convenience wrapper for generic createAction().
 * Dependencies accessible via world.dependencyService.getDependencies(lineId).
 * Element properties (planeId, point1Id, point2Id) accessible via line object.
 * 
 * Reference: specs/001-dihedral-learning-mvp/data-model.md §Phase 93
 */

import { createAction, type Action } from '../Action';

export function createLineAction(lineId: string): Action {
  return createAction(lineId, `Created line ${lineId}`);
}

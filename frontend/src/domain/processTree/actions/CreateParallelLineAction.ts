/**
 * CreateParallelLineAction - Records creation of a line parallel to a reference line
 * 
 * Phase 93: Convenience wrapper for generic createAction().
 * Dependencies tracked by DependencyService,
 * construction parameters accessible via element properties.
 * 
 * Reference: specs/001-dihedral-learning-mvp/data-model.md §Phase 93
 */

import { createAction, type Action } from '../Action';

export function createParallelLineAction(
  lineId: string
): Action {
  return createAction(lineId, `Created parallel line ${lineId}`);
}

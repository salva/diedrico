/**
 * CreateTangentLineAction - Records creation of tangent lines to circles
 * 
 * Phase 60: Tangent line to circle through external point
 * Phase 61: Tangent line to circle parallel to reference line
 * Phase 93: Convenience wrappers for generic createAction().
 * Dependencies tracked by DependencyService,
 * construction parameters accessible via element properties.
 * 
 * Reference: specs/001-dihedral-learning-mvp/data-model.md §Phase 93
 */

import { createAction, type Action } from '../Action';

// ===== Phase 60: Tangent Through Point =====

export function createTangentLineToCircleThroughPointAction(
  lineId: string
): Action {
  return createAction(lineId, `Created tangent line to circle through point ${lineId}`);
}

// ===== Phase 61: Tangent Parallel to Line =====

export function createTangentLineToCircleParallelToLineAction(
  lineId: string
): Action {
  return createAction(lineId, `Created tangent line to circle parallel to line ${lineId}`);
}

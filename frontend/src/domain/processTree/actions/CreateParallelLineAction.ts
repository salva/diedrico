/**
 * CreateParallelLineAction - Records creation of a line parallel to a reference line
 * 
 * Phase 93: Convenience wrapper for generic createAction().
 * Dependencies tracked by DependencyService,
 * construction parameters accessible via element properties.
 * 
 */

import { createAction, type Action } from '../Action';

export function createParallelLineAction(
  lineId: string
): Action {
  return createAction(lineId, `Parallel line ${lineId}`);
}

/**
 * CreatePointAction - Records creation of a free point
 * 
 * Phase 93: Convenience wrapper for generic createAction().
 * Element properties (planeId, position) accessible via element.planeId, element.position.
 * 
 */

import { createAction, type Action } from '../Action';

export function createPointAction(pointId: string): Action {
  return createAction(pointId, `Point ${pointId}`);
}

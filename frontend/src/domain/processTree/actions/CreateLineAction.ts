/**
 * CreateLineAction - Records creation of a line between two points
 * 
 * Phase 93: Convenience wrapper for generic createAction().
 * Dependencies are available through the runtime dependency query port.
 * Element properties (planeId, point1Id, point2Id) accessible via line object.
 * 
 */

import { createAction, type Action } from '../Action';

export function createLineAction(lineId: string): Action {
  return createAction(lineId, `Line ${lineId}`);
}

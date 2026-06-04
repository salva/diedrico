/**
 * CreateSegmentAction - Records creation of a segment between two points
 * 
 * Phase 93: Convenience wrapper for generic createAction().
 * Dependencies accessible via world.getDependencyQuery().getDependencies(segmentId).
 * Element properties (planeId, point1Id, point2Id) accessible via segment object.
 * 
 */

import { createAction, type Action } from '../Action';

export function createSegmentAction(segmentId: string): Action {
  return createAction(segmentId, `Segment ${segmentId}`);
}

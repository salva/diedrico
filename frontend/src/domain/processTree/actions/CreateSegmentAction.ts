/**
 * CreateSegmentAction - Records creation of a segment between two points
 * 
 * Phase 93: Convenience wrapper for generic createAction().
 * Dependencies accessible via world.dependencyService.getDependencies(segmentId).
 * Element properties (planeId, point1Id, point2Id) accessible via segment object.
 * 
 * Reference: specs/001-dihedral-learning-mvp/data-model.md §Phase 93
 */

import { createAction, type Action } from '../Action';

export function createSegmentAction(segmentId: string): Action {
  return createAction(segmentId, `Created segment ${segmentId}`);
}

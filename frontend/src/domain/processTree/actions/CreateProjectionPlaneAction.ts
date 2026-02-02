/**
 * CreateProjectionPlaneAction - ProcessTree action for creating auxiliary projection planes
 * 
 * Phase 82: Create Projection Plane Tool
 * Phase 93: Convenience wrapper for generic createAction().
 * Dependencies tracked by DependencyService,
 * construction parameters accessible via element properties.
 * 
 * Records the creation of an auxiliary projection plane in the ProcessTree.
 */

import { createAction, type Action } from '../Action';

/**
 * Create a ProcessTree action for projection plane creation
 * 
 * @param projPlaneId - ID of created projection plane
 * @returns Action object for ProcessTree
 */
export function createProjectionPlaneAction(
  projPlaneId: string
): Action {
  return createAction(projPlaneId, `Created projection plane ${projPlaneId}`);
}

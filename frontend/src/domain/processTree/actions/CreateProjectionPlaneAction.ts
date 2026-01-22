/**
 * CreateProjectionPlaneAction - ProcessTree action for creating auxiliary projection planes
 * 
 * Phase 82: Create Projection Plane Tool
 * 
 * Records the creation of an auxiliary projection plane in the ProcessTree.
 * Tracks dependencies (trace lines) and outputs (projection plane).
 */

import type { Action } from '../Action';

export interface CreateProjectionPlaneActionParameters {
  t1HingeTraceId: string;
  t2OtherTraceId: string;
  t2PrimeLineId: string;
}

/**
 * Create a ProcessTree action for projection plane creation
 * 
 * @param projPlaneId - ID of created projection plane (output)
 * @param t1HingeTraceId - ID of hinge trace line (T1, dependency)
 * @param t2OtherTraceId - ID of other trace line (T2, dependency)
 * @param t2PrimeLineId - ID of position line (T2', dependency)
 * @returns Action object for ProcessTree
 */
export function createProjectionPlaneAction(
  projPlaneId: string,
  t1HingeTraceId: string,
  t2OtherTraceId: string,
  t2PrimeLineId: string
): Action {
  return {
    id: `action_create_proj_plane_${projPlaneId}`,
    label: `Create projection plane ${projPlaneId}`,
    actionType: 'CreateProjectionPlane',
    inputs: [t1HingeTraceId, t2OtherTraceId, t2PrimeLineId],
    outputs: [projPlaneId],
    parameters: {
      t1HingeTraceId,
      t2OtherTraceId,
      t2PrimeLineId
    } as CreateProjectionPlaneActionParameters
  };
}

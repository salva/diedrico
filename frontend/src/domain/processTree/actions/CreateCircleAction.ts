/**
 * CreateCircleAction - Records creation of a circle from center and circumference point
 * 
 * Tracks circle creation with BOTH center and circumference points as inputs.
 * This ensures the circle updates parametrically when either defining point moves.
 * 
 * CRITICAL: Both points must be tracked for proper dependency behavior (FR-042).
 * 
 * Reference: specs/001-dihedral-learning-mvp/data-model.md §ConstructiveAction
 * Reference: specs/001-dihedral-learning-mvp/spec.md FR-042
 */

import type { Action, ActionParameters } from '../Action';

export interface CreateCircleActionParameters extends ActionParameters {
  planeId: string;
  centerId: string;
  circumferencePointId: string;
}

export function createCircleAction(
  circleId: string,
  planeId: string,
  centerId: string,
  circumferencePointId: string
): Action {
  return {
    id: generateActionId(),
    type: 'action',
    actionType: 'CreateCircle',
    timestamp: new Date(),
    inputs: [centerId, circumferencePointId],  // Circle depends on BOTH points
    outputs: [circleId],
    parameters: {
      planeId,
      centerId,
      circumferencePointId
    },
    description: `Circle on ${planeId} from center ${centerId} through ${circumferencePointId}`
  };
}

function generateActionId(): string {
  return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

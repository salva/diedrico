/**
 * CreateCircleAction - Records creation of a circle from center and radius
 * 
 * Tracks circle creation with its center point as input.
 * 
 * Reference: specs/001-dihedral-learning-mvp/data-model.md §ConstructiveAction
 */

import type { Action, ActionParameters } from '../Action';

export interface CreateCircleActionParameters extends ActionParameters {
  planeId: string;
  centerId: string;
  radius: number;
}

export function createCircleAction(
  circleId: string,
  planeId: string,
  centerId: string,
  radius: number
): Action {
  return {
    id: generateActionId(),
    type: 'action',
    actionType: 'CreateCircle',
    timestamp: new Date(),
    inputs: [centerId],  // Circle depends on center point
    outputs: [circleId],
    parameters: {
      planeId,
      centerId,
      radius
    },
    description: `Create circle on ${planeId} with radius ${radius}`
  };
}

function generateActionId(): string {
  return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

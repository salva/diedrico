/**
 * CreateCircleCircleIntersectionPointAction - Records creation of circle-circle intersection point
 * 
 * Tracks specialized circle-circle intersection point creation with index.
 * 
 * Reference: specs/001-dihedral-learning-mvp/data-model.md §ConstructiveAction
 */

import type { Action, ActionParameters } from '../Action';

export interface CreateCircleCircleIntersectionPointActionParameters extends ActionParameters {
  planeId: string;
  circle1Id: string;
  circle2Id: string;
  index: number;
}

export function createCircleCircleIntersectionPointAction(
  pointId: string,
  planeId: string,
  circle1Id: string,
  circle2Id: string,
  index: number
): Action {
  return {
    id: generateActionId(),
    type: 'action',
    actionType: 'CreateCircleCircleIntersectionPoint',
    timestamp: new Date(),
    inputs: [circle1Id, circle2Id],  // Point depends on two circles
    outputs: [pointId],
    parameters: {
      planeId,
      circle1Id,
      circle2Id,
      index
    },
    description: `Circle-Circle intersection point [${index}] on ${planeId}`
  };
}

function generateActionId(): string {
  return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

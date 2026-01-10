/**
 * CreateLineCircleIntersectionPointAction - Records creation of line-circle intersection point
 * 
 * Tracks specialized line-circle intersection point creation with index.
 * 
 * Reference: specs/001-dihedral-learning-mvp/data-model.md §ConstructiveAction
 */

import type { Action, ActionParameters } from '../Action';

export interface CreateLineCircleIntersectionPointActionParameters extends ActionParameters {
  planeId: string;
  lineId: string;
  circleId: string;
  index: number;
}

export function createLineCircleIntersectionPointAction(
  pointId: string,
  planeId: string,
  lineId: string,
  circleId: string,
  index: number
): Action {
  return {
    id: generateActionId(),
    type: 'action',
    actionType: 'CreateLineCircleIntersectionPoint',
    timestamp: new Date(),
    inputs: [lineId, circleId],  // Point depends on line and circle
    outputs: [pointId],
    parameters: {
      planeId,
      lineId,
      circleId,
      index
    },
    description: `Line-Circle intersection point [${index}] on ${planeId}`
  };
}

function generateActionId(): string {
  return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

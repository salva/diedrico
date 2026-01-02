/**
 * CreateIntersectionPointAction - Records creation of intersection point between two lines
 * 
 * Tracks intersection point creation with two lines as inputs.
 * 
 * Reference: specs/001-dihedral-learning-mvp/data-model.md §ConstructiveAction
 */

import type { Action, ActionParameters } from '../Action';

export interface CreateIntersectionPointActionParameters extends ActionParameters {
  planeId: string;
  line1Id: string;
  line2Id: string;
  intersectionIndex: number;
}

export function createIntersectionPointAction(
  pointId: string,
  planeId: string,
  line1Id: string,
  line2Id: string,
  intersectionIndex: number
): Action {
  return {
    id: generateActionId(),
    type: 'action',
    actionType: 'CreateIntersectionPoint',
    timestamp: new Date(),
    inputs: [line1Id, line2Id],  // Point depends on two lines
    outputs: [pointId],
    parameters: {
      planeId,
      line1Id,
      line2Id,
      intersectionIndex
    },
    description: `Create intersection point on ${planeId}`
  };
}

function generateActionId(): string {
  return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

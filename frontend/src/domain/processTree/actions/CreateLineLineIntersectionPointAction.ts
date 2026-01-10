/**
 * CreateLineLineIntersectionPointAction - Records creation of line-line intersection point
 * 
 * Tracks specialized line-line intersection point creation.
 * 
 * Reference: specs/001-dihedral-learning-mvp/data-model.md §ConstructiveAction
 */

import type { Action, ActionParameters } from '../Action';

export interface CreateLineLineIntersectionPointActionParameters extends ActionParameters {
  planeId: string;
  line1Id: string;
  line2Id: string;
}

export function createLineLineIntersectionPointAction(
  pointId: string,
  planeId: string,
  line1Id: string,
  line2Id: string
): Action {
  return {
    id: generateActionId(),
    type: 'action',
    actionType: 'CreateLineLineIntersectionPoint',
    timestamp: new Date(),
    inputs: [line1Id, line2Id],  // Point depends on two lines
    outputs: [pointId],
    parameters: {
      planeId,
      line1Id,
      line2Id
    },
    description: `Line-Line intersection point on ${planeId}`
  };
}

function generateActionId(): string {
  return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

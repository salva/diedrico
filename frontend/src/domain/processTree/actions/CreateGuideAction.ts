/**
 * CreateGuideAction - Records creation of a guide perpendicular to a line
 * 
 * Tracks guide creation with reference line and through-point as inputs.
 * 
 * Reference: specs/001-dihedral-learning-mvp/data-model.md §ConstructiveAction
 */

import type { Action, ActionParameters } from '../Action';

export interface CreateGuideActionParameters extends ActionParameters {
  planeId: string;
  referenceLineId: string;
  throughPointId: string;
}

export function createGuideAction(
  guideId: string,
  planeId: string,
  referenceLineId: string,
  throughPointId: string
): Action {
  return {
    id: generateActionId(),
    type: 'action',
    actionType: 'CreateGuide',
    timestamp: new Date(),
    inputs: [referenceLineId, throughPointId],  // Guide depends on line and point
    outputs: [guideId],
    parameters: {
      planeId,
      referenceLineId,
      throughPointId
    },
    description: `Guide on ${planeId}`
  };
}

function generateActionId(): string {
  return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

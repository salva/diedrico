/**
 * CreateSiblingGuideAction - Records creation of a sibling guide
 * 
 * Tracks sibling guide creation with its primary guide as input.
 * Sibling guides are automatically created when creating a guide perpendicular
 * to a HalfHingeLine2D - the sibling appears on the complementary projection plane.
 * 
 * Reference: specs/001-dihedral-learning-mvp/data-model.md §SiblingGuide2D
 */

import type { Action, ActionParameters } from '../Action';

export interface CreateSiblingGuideActionParameters extends ActionParameters {
  planeId: string;
  primaryGuideId: string;
  referenceLineId: string;  // HalfHingeLine2D on sibling plane
}

export function createSiblingGuideAction(
  siblingGuideId: string,
  planeId: string,
  primaryGuideId: string,
  referenceLineId: string
): Action {
  return {
    id: generateActionId(),
    type: 'action',
    actionType: 'CreateSiblingGuide',
    timestamp: new Date(),
    inputs: [primaryGuideId, referenceLineId],  // Sibling depends on primary guide and HHL
    outputs: [siblingGuideId],
    parameters: {
      planeId,
      primaryGuideId,
      referenceLineId
    },
    description: `Sibling guide on ${planeId}`
  };
}

function generateActionId(): string {
  return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * CreateSiblingIntersectionPointAction - Records creation of a sibling intersection point
 * 
 * Tracks sibling intersection point creation with its primary intersection as input.
 * Sibling intersections are automatically created when an element intersects with
 * a HalfHingeLine2D - the sibling appears on the complementary projection plane.
 * 
 * Reference: specs/001-dihedral-learning-mvp/data-model.md §SiblingIntersectionPoint2D
 */

import type { Action, ActionParameters } from '../Action';

export interface CreateSiblingIntersectionPointActionParameters extends ActionParameters {
  planeId: string;
  primaryIntersectionId: string;
}

export function createSiblingIntersectionPointAction(
  siblingPointId: string,
  planeId: string,
  primaryIntersectionId: string
): Action {
  return {
    id: generateActionId(),
    type: 'action',
    actionType: 'CreateSiblingIntersectionPoint',
    timestamp: new Date(),
    inputs: [primaryIntersectionId],  // Sibling depends on primary intersection
    outputs: [siblingPointId],
    parameters: {
      planeId,
      primaryIntersectionId
    },
    description: `Sibling intersection point on ${planeId}`
  };
}

function generateActionId(): string {
  return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

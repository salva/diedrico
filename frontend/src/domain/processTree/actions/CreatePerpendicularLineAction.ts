/**
 * CreatePerpendicularLineAction - Records creation of a line perpendicular to a reference line
 * 
 * Tracks perpendicular line creation with reference line and through-point as inputs.
 * 
 * Reference: specs/001-dihedral-learning-mvp/data-model.md §ConstructiveAction
 */

import type { Action, ActionParameters } from '../Action';

export interface CreatePerpendicularLineActionParameters extends ActionParameters {
  planeId: string;
  referenceLineId: string;
  throughPointId: string;
}

export function createPerpendicularLineAction(
  lineId: string,
  planeId: string,
  referenceLineId: string,
  throughPointId: string
): Action {
  return {
    id: generateActionId(),
    type: 'action',
    actionType: 'CreatePerpendicularLine',
    timestamp: new Date(),
    inputs: [referenceLineId, throughPointId],  // Perpendicular line depends on reference line and through-point
    outputs: [lineId],
    parameters: {
      planeId,
      referenceLineId,
      throughPointId
    } as CreatePerpendicularLineActionParameters,
    description: `Perpendicular line on ${planeId}`
  };
}

function generateActionId(): string {
  return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

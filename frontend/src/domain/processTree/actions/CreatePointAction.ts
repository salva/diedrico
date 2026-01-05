/**
 * CreatePointAction - Records creation of a free point
 * 
 * Tracks point creation with its plane and position parameters.
 * 
 * Reference: specs/001-dihedral-learning-mvp/data-model.md §ConstructiveAction
 */

import type { Action, ActionParameters } from '../Action';
import type { Vector3 } from 'three';

export interface CreatePointActionParameters extends ActionParameters {
  planeId: string;
  position: { x: number; y: number; z: number }; // Serialized Vector3
}

export function createPointAction(
  pointId: string,
  planeId: string,
  position: Vector3
): Action {
  return {
    id: generateActionId(),
    type: 'action',
    actionType: 'CreateFreePoint',
    timestamp: new Date(),
    inputs: [],  // Free points have no inputs
    outputs: [pointId],
    parameters: {
      planeId,
      position: {
        x: position.x,
        y: position.y,
        z: position.z
      }
    },
    description: `Point on ${planeId}`
  };
}

function generateActionId(): string {
  return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

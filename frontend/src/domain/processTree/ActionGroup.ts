/**
 * ActionGroup - groups one or more actions together
 * Can be user-created or auto-created (auxiliary)
 */

import type { ConstructiveAction } from './Action';

export interface ActionGroup {
  id: string;
  type: 'actionGroup';
  children: ConstructiveAction[];  // One or more actions
  created: Date;
}

/**
 * Factory function to create an action group
 */
export function createActionGroup(
  id: string,
  children: ConstructiveAction[] = []
): ActionGroup {
  return {
    id,
    type: 'actionGroup',
    children,
    created: new Date()
  };
}

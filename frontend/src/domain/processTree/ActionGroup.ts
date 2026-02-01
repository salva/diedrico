/**
 * ActionGroup - groups one or more actions together
 * Can be user-created or auto-created (auxiliary)
 */

import type { ConstructiveAction } from './Action';

export interface ActionGroup {
  id: string;
  type: 'actionGroup';
  children: (ConstructiveAction | null)[];  // One or more actions (or null tombstones)
  isOutput: boolean;               // Phase 87: Output flag
  isAuxiliary?: boolean;           // Helper steps
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
    isOutput: true, // Default to true
    created: new Date()
  };
}

/**
 * Authoritative ActionGroup contract lives in ProcessTree.
 */

import type { ActionNode, ActionGroup as ProcessTreeActionGroup } from './ProcessTree';

export type ActionGroup = ProcessTreeActionGroup;

export function createActionGroup(
  id: string,
  children: ActionNode[] = []
): ActionGroup {
  return {
    id,
    type: 'actionGroup',
    children,
    isOutput: true,
    isAuxiliary: false,
    created: new Date()
  };
}

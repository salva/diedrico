/**
 * Subprocess - user-created hierarchical grouping with visual properties
 */

import type { VisualStyle } from '../world/VisualStyle';
import type { ActionGroup } from './ActionGroup';

export interface Subprocess {
  id: string;
  type: 'subprocess';
  name: string;
  children: (Subprocess | ActionGroup)[];  // Can contain subprocesses or action groups
  visible: boolean;                         // Controls element visibility in drawing
  defaultStyle?: VisualStyle;               // Default style inherited by contained elements
  created: Date;
}

/**
 * Factory function to create a subprocess
 */
export function createSubprocess(
  id: string,
  name: string,
  options?: Partial<Subprocess>
): Subprocess {
  return {
    id,
    type: 'subprocess',
    name,
    children: [],
    visible: true,
    created: new Date(),
    ...options
  };
}

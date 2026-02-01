/**
 * Style Service - Element Visibility Resolution
 * 
 * Phase 83: Element Visibility Property
 * 
 * Provides utility functions for resolving element visual properties,
 * particularly visibility with subprocess inheritance support.
 * 
 * @see specs/001-dihedral-learning-mvp/data-model.md#phase-83-element-visibility-property
 */

import type { Element } from './Element';
import type { World } from './World';
import { ProcessTree, type Subprocess, type ActionGroup, type ProcessNode } from '../processTree/ProcessTree';

// Helper to get parents
function getPathToNode(tree: ProcessTree, targetId: string): ProcessNode[] | null {
  // Use existing method if available, or just reimplement straightforward DFS
  const path: ProcessNode[] = [];
  
  function find(node: ProcessNode): boolean {
    if (node.id === targetId) return true;
    
    if (node.type === 'subprocess') {
      const sp = node as Subprocess;
      path.push(sp);
      for (const child of sp.children) {
        if (find(child)) return true;
      }
      path.pop();
    } else if (node.type === 'actionGroup') {
      const ag = node as ActionGroup;
      path.push(ag);
      for (const child of ag.children) {
        if (child && find(child)) return true;
      }
      path.pop();
    }
    return false;
  }
  
  if (find(tree.root)) return path;
  return null;
}

/**
 * Resolve effective visibility for an element
 * 
 * Resolution order:
 * 1. Element's own visualStyle.visible (if set to false, it is hidden)
 * 2. Ancestor Encapsulation (Black Box) check:
 *    - Strict Hierarchy Check:
 *      Traverse path from Root to Action.
 *      If we are in an encapsulated scope (Parent Subprocess showIntermediates=false),
 *      the IMMEDIATE next node in the path MUST be marked isOutput=true.
 *      Even if an Action is Output, if its container Subprocess is not an Output, it is hidden.
 */
export function resolveVisibility(element: Element, world: World): boolean {
  // Check element's own visualStyle - explicit hide overrides everything
  if (element.visualStyle?.visible === false) {
    return false;
  }
  
  // Phase 87: Encapsulation / Black Box Logic
  const tree = world.getProcessTree();
  const actions = tree.getActionsProducingElement(element.id);
  if (actions.length === 0) return true; // System elements visible by default

  const creatingAction = actions[0];
  const path = getPathToNode(tree, creatingAction.id);
  
  if (!path) return true;

  // Path contains: [Root, Subprocess1...SubprocessN, ActionGroup]
  // We should treat the creatingAction as the final node in the chain
  // Cast creatingAction to ActionNode (Action interface + type='action')
  // We approximate it because tree.getActionsProducingElement returns Action[]
  // but in the tree they are wrapped as ActionNode. Since Action is just data, 
  // we can treat it as the leaf node for logic purposes.
  const leafNode = creatingAction as unknown as ProcessNode; 
  // We filter out ActionGroups because they are structural containers that should be transparent
  // for visibility logic (as requested by user "Action Groups must be transparents in this regard").
  // This effectively connects Subprocess -> Subprocess or Subprocess -> Action directly.
  const fullChain: ProcessNode[] = [...path, leafNode].filter(node => node.type !== 'actionGroup');

  // Iterate the chain to check permissions
  // At each step, if parent enforces encapsulation, child must have permission (isOutput)
  for (let i = 0; i < fullChain.length - 1; i++) {
    const parent = fullChain[i];
    const child = fullChain[i + 1];

    if (parent.type === 'subprocess') {
      const sp = parent as Subprocess;
      if (!sp.showIntermediates) {
        // Encapsulation Active
        // Child MUST be an Output to be visible.
        
        let isChildExposed = false;
        if ('isOutput' in child && (child as any).isOutput) {
          isChildExposed = true;
        }
        
        if (!isChildExposed) {
          return false; // Hidden by encapsulation at this level
        }
      }
    }
  }

  return true;
}

/**
 * ProcessTree - Hierarchical construction history
 * 
 * Tracks all construction actions in a tree structure. Actions are grouped
 * into ActionGroups which can be organized into Subprocesses.
 * 
 * Reference: specs/001-dihedral-learning-mvp/data-model.md §ProcessTree
 */

import type { Action } from './Action';

export type ProcessNodeType = 'subprocess' | 'actionGroup' | 'action';

export interface ProcessNodeBase {
  id: string;
  type: ProcessNodeType;
  created: Date;
}

export interface Subprocess extends ProcessNodeBase {
  type: 'subprocess';
  name: string;
  children: (Subprocess | ActionGroup)[];  // Mixed children, no direct actions
  visible: boolean;                        // Visibility toggle
}

export interface ActionGroup extends ProcessNodeBase {
  type: 'actionGroup';
  name: string;
  children: Action[];                      // Only actions, at least 1
  isAuxiliary: boolean;                    // Auxiliary actions (lighter styling)
}

export type ProcessNode = Subprocess | ActionGroup | Action;

export class ProcessTree {
  root: Subprocess;

  constructor() {
    // Initialize with root subprocess
    this.root = {
      id: this.generateId(),
      type: 'subprocess',
      name: 'Root Process',
      children: [],
      visible: true,
      created: new Date()
    };
  }

  /**
   * Add an action to the process tree
   * Creates an ActionGroup if needed
   */
  addAction(action: Action, groupName?: string): ActionGroup {
    // Create action group for this action
    const actionGroup: ActionGroup = {
      id: this.generateId(),
      type: 'actionGroup',
      name: groupName || action.description,
      children: [action],
      isAuxiliary: false,
      created: new Date()
    };

    // Add to root subprocess
    this.root.children.push(actionGroup);

    return actionGroup;
  }

  /**
   * Add a subprocess to organize actions
   */
  addSubprocess(name: string, parent?: Subprocess): Subprocess {
    const subprocess: Subprocess = {
      id: this.generateId(),
      type: 'subprocess',
      name,
      children: [],
      visible: true,
      created: new Date()
    };

    const targetParent = parent || this.root;
    targetParent.children.push(subprocess);

    return subprocess;
  }

  /**
   * Get all actions in execution order (depth-first traversal)
   */
  getAllActions(): Action[] {
    const actions: Action[] = [];
    this.traverseActions(this.root, (action) => {
      actions.push(action);
    });
    return actions;
  }

  /**
   * Depth-first traversal of actions
   */
  private traverseActions(node: ProcessNode, callback: (action: Action) => void): void {
    if (node.type === 'action') {
      callback(node);
    } else if (node.type === 'actionGroup') {
      node.children.forEach(action => callback(action));
    } else if (node.type === 'subprocess') {
      node.children.forEach(child => this.traverseActions(child, callback));
    }
  }

  /**
   * Find action by ID
   */
  findAction(actionId: string): Action | undefined {
    let found: Action | undefined;
    this.traverseActions(this.root, (action) => {
      if (action.id === actionId) {
        found = action;
      }
    });
    return found;
  }

  /**
   * Get actions that produce a specific element (by output ID)
   */
  getActionsProducingElement(elementId: string): Action[] {
    const actions: Action[] = [];
    this.traverseActions(this.root, (action) => {
      if (action.outputs.includes(elementId)) {
        actions.push(action);
      }
    });
    return actions;
  }

  /**
   * Get actions that depend on a specific element (by input ID)
   */
  getActionsDependingOnElement(elementId: string): Action[] {
    const actions: Action[] = [];
    this.traverseActions(this.root, (action) => {
      if (action.inputs.includes(elementId)) {
        actions.push(action);
      }
    });
    return actions;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

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
  children: (ActionNode | null)[];         // Actions or tombstones (null = deleted)
  isAuxiliary: boolean;                    // Auxiliary actions (lighter styling)
}

// ActionNode wraps Action to fit the tree structure
export interface ActionNode extends ProcessNodeBase, Action {
  type: 'action';
}

export type ProcessNode = Subprocess | ActionGroup | ActionNode;

export class ProcessTree {
  root: Subprocess;
  private _version: number = 0;

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
   * Get current version for reactivity tracking
   */
  getVersion(): number {
    return this._version;
  }

  /**
   * Increment version to notify of changes
   */
  private notifyChange(): void {
    this._version++;
  }

  /**
   * Add an action to the process tree
   * Creates an ActionGroup if needed
   */
  addAction(action: Action, groupName?: string, parentSubprocessId?: string): ActionGroup {
    // Wrap action in ActionNode
    const actionNode: ActionNode = {
      ...action,
      type: 'action',
      created: new Date()
    };

    // Create action group for this action
    // Note: groupName is ignored - ActionGroups have no names per spec
    const actionGroup: ActionGroup = {
      id: this.generateId(),
      type: 'actionGroup',
      children: [actionNode],
      isAuxiliary: false,
      created: new Date()
    };

    // Add to requested subprocess (or root by default)
    // Note: groupName is ignored - ActionGroups have no names per spec
    if (parentSubprocessId) {
      const parent = this.findSubprocessById(parentSubprocessId);
      (parent || this.root).children.push(actionGroup);
    } else {
      this.root.children.push(actionGroup);
    }
    this.notifyChange();

    return actionGroup;
  }

  findSubprocessByName(name: string): Subprocess | undefined {
    let found: Subprocess | undefined;
    this.traverseSubprocesses(this.root, (subprocess) => {
      if (subprocess.name === name) {
        found = subprocess;
      }
    });
    return found;
  }

  private findSubprocessById(subprocessId: string): Subprocess | undefined {
    let found: Subprocess | undefined;
    this.traverseSubprocesses(this.root, (subprocess) => {
      if (subprocess.id === subprocessId) {
        found = subprocess;
      }
    });
    return found;
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
    this.notifyChange();

    return subprocess;
  }

  /**
   * Toggle visibility of a subprocess
   */
  toggleSubprocessVisibility(subprocessId: string): void {
    this.traverseSubprocesses(this.root, (subprocess) => {
      if (subprocess.id === subprocessId) {
        subprocess.visible = !subprocess.visible;
        this.notifyChange();
      }
    });
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
   * Depth-first traversal of subprocesses
   */
  private traverseSubprocesses(node: ProcessNode, callback: (subprocess: Subprocess) => void): void {
    if (node.type === 'subprocess') {
      callback(node);
      node.children.forEach(child => this.traverseSubprocesses(child, callback));
    } else if (node.type === 'actionGroup') {
      // Stop at action groups
      return;
    }
  }

  /**
   * Depth-first traversal of actions
   * Automatically skips null tombstones (deleted actions)
   */
  private traverseActions(node: ProcessNode, callback: (action: Action) => void): void {
    if (node.type === 'action') {
      callback(node);
    } else if (node.type === 'actionGroup') {
      node.children.forEach(action => {
        if (action !== null) {  // Skip tombstones
          callback(action);
        }
      });
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
   * Remove an action from the tree (creates tombstone at same index)
   * Uses stable indices - action index never changes
   * 
   * @param actionId - ID of action to remove
   * @returns Object with removed action data and location, or null if not found
   */
  removeAction(actionId: string): { action: ActionNode, groupId: string, index: number } | null {
    let result: { action: ActionNode, groupId: string, index: number } | null = null;
    
    this.traverseGroups(this.root, (group) => {
      const index = group.children.findIndex(child => child?.id === actionId);
      if (index !== -1 && group.children[index] !== null) {
        const action = group.children[index]!;
        group.children[index] = null;  // Create tombstone
        result = { action, groupId: group.id, index };
        this.notifyChange();
      }
    });
    
    return result;
  }

  /**
   * Restore an action at a specific location (fills tombstone)
   * 
   * @param action - Action to restore
   * @param groupId - ID of parent ActionGroup
   * @param index - Index in children array
   * @throws Error if location not found or not a tombstone
   */
  restoreAction(action: ActionNode, groupId: string, index: number): void {
    let restored = false;
    
    this.traverseGroups(this.root, (group) => {
      if (group.id === groupId) {
        if (index < 0 || index >= group.children.length) {
          throw new Error(`Invalid index ${index} for group ${groupId}`);
        }
        if (group.children[index] !== null) {
          throw new Error(`Cannot restore: position ${index} in group ${groupId} is not empty`);
        }
        group.children[index] = action;  // Fill tombstone
        restored = true;
        this.notifyChange();
      }
    });
    
    if (!restored) {
      throw new Error(`Group ${groupId} not found`);
    }
  }

  /**
   * Traverse all ActionGroups in the tree
   */
  private traverseGroups(node: ProcessNode, callback: (group: ActionGroup) => void): void {
    if (node.type === 'actionGroup') {
      callback(node);
    } else if (node.type === 'subprocess') {
      node.children.forEach(child => this.traverseGroups(child, callback));
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

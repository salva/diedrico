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
  showIntermediates: boolean;              // Phase 87: Encapsulation (Positive Logic)
  isOutput: boolean;                       // Phase 87: Output flag (punches through encapsulation)
}

export interface ActionGroup extends ProcessNodeBase {
  type: 'actionGroup';
  children: (ActionNode | null)[];         // Actions or tombstones (null = deleted)
  isAuxiliary: boolean;                    // Auxiliary actions (lighter styling)
  isOutput: boolean;                       // Phase 87: Output flag
}

// ActionNode wraps Action to fit the tree structure
export interface ActionNode extends ProcessNodeBase, Action {
  type: 'action';
}

export type ProcessNode = Subprocess | ActionGroup | ActionNode;

type ChangeListener = (version: number) => void;

export class ProcessTree {
  root: Subprocess;
  private _version: number = 0;
  private subprocessStack: Subprocess[] = [];  // Phase 85: Subprocess stack
  private listeners: ChangeListener[] = [];

  constructor() {
    // Initialize with root subprocess
    this.root = {
      id: this.generateId(),
      type: 'subprocess',
      name: 'Root Process',
      children: [],
      showIntermediates: true,
      isOutput: true, // Root is implicitly an output
      created: new Date()
    };
    // Initialize stack with root
    this.subprocessStack = [this.root];
  }

  /**
   * Get current version for reactivity tracking
   */
  getVersion(): number {
    return this._version;
  }

  subscribe(listener: ChangeListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Increment version to notify of changes
   */
  private notifyChange(): void {
    this._version++;
    this.listeners.forEach(l => l(this._version));
  }

  /**
   * Get the current active subprocess (top of stack)
   * Phase 85: Stack-based subprocess management
   */
  getCurrentSubprocess(): Subprocess {
    return this.subprocessStack[this.subprocessStack.length - 1];
  }

  /**
   * Push a new subprocess onto the stack
   * All subsequent actions will be added to this subprocess
   * Phase 85: Stack-based subprocess management
   */
  pushSubprocess(name: string): Subprocess {
    const subprocess: Subprocess = {
      id: this.generateId(),
      type: 'subprocess',
      name,
      children: [],
      showIntermediates: true,
      isOutput: true,
      created: new Date()
    };

    // Add to current subprocess's children
    const parent = this.getCurrentSubprocess();
    parent.children.push(subprocess);
    
    // Push onto stack
    this.subprocessStack.push(subprocess);
    this.notifyChange();

    return subprocess;
  }

  /**
   * Pop the current subprocess from the stack
   * Returns to parent subprocess
   * The subprocess remains in the tree as a child of its parent
   * Phase 85: Stack-based subprocess management
   */
  popSubprocess(): void {
    if (this.subprocessStack.length <= 1) {
      throw new Error('Cannot pop root subprocess');
    }
    this.subprocessStack.pop();
    this.notifyChange();
  }

  /**
   * Add an action to the process tree
   * Creates an ActionGroup if needed
   * Phase 85: Always adds to current subprocess from stack (no parentSubprocessId parameter)
   */
  addAction(action: Action, groupName?: string): ActionGroup {
    // Wrap action in ActionNode
    const actionNode: ActionNode = {
      ...action,
      type: 'action',
      // Phase 87: Default actions to Output=True
      // This ensures that inside an encapsulated subprocess (Group=False),
      // the action punches through by default unless explicitly hidden.
      isOutput: action.isOutput !== undefined ? action.isOutput : true,
      created: new Date()
    };

    // Create action group for this action
    // Note: groupName is ignored - ActionGroups have no names per spec
    const actionGroup: ActionGroup = {
      id: this.generateId(),
      type: 'actionGroup',
      children: [actionNode],
      isAuxiliary: false,
      isOutput: true,
      created: new Date()
    };

    // Phase 85: Add to current subprocess from stack (no manual subprocess selection)
    const currentSubprocess = this.getCurrentSubprocess();
    currentSubprocess.children.push(actionGroup);
    this.notifyChange();

    return actionGroup;
  }

  findSubprocessById(subprocessId: string): Subprocess | undefined {
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
      showIntermediates: true,
      isOutput: true,
      created: new Date()
    };

    const targetParent = parent || this.root;
    targetParent.children.push(subprocess);
    this.notifyChange();

    return subprocess;
  }

  /**
   * Rename a subprocess
   */
  renameSubprocess(subprocessId: string, newName: string): void {
    const subprocess = this.findSubprocessById(subprocessId);
    if (subprocess) {
      subprocess.name = newName;
      this.notifyChange();
    } else {
      throw new Error(`Subprocess not found: ${subprocessId}`);
    }
  }

  /**
   * Toggle encapsulation of a subprocess (hide intermediate steps)
   */
  toggleSubprocessEncapsulation(subprocessId: string): void {
    this.traverseSubprocesses(this.root, (subprocess) => {
      if (subprocess.id === subprocessId) {
        subprocess.showIntermediates = !subprocess.showIntermediates;
        this.notifyChange();
      }
    });
  }

  /**
   * Toggle output flag of a node (Subprocess or Action/ActionGroup)
   * If it's an action ID, we toggle the parent ActionGroup and the ActionNode
   */
  toggleOutput(nodeId: string): void {
    // Check if it's a subprocess
    let handled = false;
    this.traverseSubprocesses(this.root, (subprocess) => {
      if (subprocess.id === nodeId) {
        subprocess.isOutput = !subprocess.isOutput;
        handled = true;
      }
    });

    if (handled) {
      this.notifyChange();
      return;
    }

    // Check if it's an action or action group
    // We need a traversal that visits groups and actions
    this.traverseAllNodes(this.root, (node) => {
      if (node.type === 'actionGroup' && node.id === nodeId) {
        const group = node as ActionGroup;
        group.isOutput = !group.isOutput;
        handled = true;
      } else if (node.type === 'action' && node.id === nodeId) {
        const action = node as ActionNode;
        action.isOutput = !action.isOutput;
        // Also toggle the parent group? 
        // For now, let's assume we operate on individual IDs.
        // But UI usually displays Groups or merged items.
        // If the UI displays ActionGroups, we should toggle the group.
        // If we toggle an action, what about the group?
        // Let's stick to toggling the specific node found.
        handled = true;
      }
    });
    
    if (handled) {
      this.notifyChange();
    }
  }

  private traverseAllNodes(node: ProcessNode, callback: (node: ProcessNode) => void): void {
    callback(node);
    if (node.type === 'subprocess') {
      node.children.forEach(child => this.traverseAllNodes(child, callback));
    } else if (node.type === 'actionGroup') {
      node.children.forEach(child => {
        if (child) this.traverseAllNodes(child, callback);
      });
    }
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
   * Get the current depth of the subprocess stack
   */
  getStackDepth(): number {
    return this.subprocessStack.length;
  }

  /**
   * Get the full path from root to current subprocess as names
   */
  getStackPath(): string[] {
    return this.subprocessStack.map(sp => sp.name);
  }

  /**
   * Check if a specific subprocess is the currently active one
   */
  isSubprocessActive(subprocessId: string): boolean {
    return this.getCurrentSubprocess().id === subprocessId;
  }

  /**
   * Restore a subprocess to the stack (used by PopSubprocessOp.undo())
   * The subprocess must exist in the current subprocess's children
   */
  restoreSubprocessToStack(subprocessId: string): void {
    const currentSubprocess = this.getCurrentSubprocess();
    
    // Find the subprocess in current subprocess's children
    const subprocess = currentSubprocess.children.find(
      child => child.type === 'subprocess' && child.id === subprocessId
    );
    
    if (!subprocess || subprocess.type !== 'subprocess') {
      throw new Error(`Subprocess ${subprocessId} not found in parent's children`);
    }
    
    // Push to stack
    this.subprocessStack.push(subprocess);
    this.notifyChange();
  }

  /**
   * Get the path of nodes from root to the ActionGroup containing a specific action
   * @returns Array of ProcessNodes (Subprocesses leading to ActionGroup, and ActionGroup itself) - DOES NOT include the ActionNode itself
   */
  getPathToAction(actionId: string): ProcessNode[] | null {
    return this.findPathToGroup(this.root, actionId, []);
  }

  private findPathToGroup(node: ProcessNode, targetActionId: string, currentPath: ProcessNode[]): ProcessNode[] | null {
    // If it's an action group, check if it contains the action
    if (node.type === 'actionGroup') {
      const hasAction = node.children.some(child => child !== null && child.id === targetActionId);
      if (hasAction) {
        return [...currentPath, node];
      }
      return null;
    }

    // If it's a subprocess, check children
    if (node.type === 'subprocess') {
      const pathWithMe = [...currentPath, node];
      for (const child of node.children) {
        const result = this.findPathToGroup(child, targetActionId, pathWithMe);
        if (result) return result;
      }
    }

    // Action nodes are not traversed directly here as we look for groups or subprocesses
    return null;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

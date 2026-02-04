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
    // Phase 95: Use fixed ID for root so toggle operations work across sessions
    this.root = {
      id: 'root',
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
   * @param id - Optional ID to use (for deserialization), otherwise generates new ID
   */
  pushSubprocess(name: string, id?: string): Subprocess {
    const subprocess: Subprocess = {
      id: id || this.generateId(),
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
   * DEPRECATED: Use addActionGroup() + addActionToGroup() instead.
   * This method implicitly creates an ActionGroup, which breaks Undo logic.
   * Issues warning but still works for backwards compatibility.
   */
  addAction(action: Action, groupName?: string): ActionGroup {
    console.warn(
      "ProcessTree.addAction() is deprecated. Use addActionGroup() then addActionToGroup(). " +
      "This ensures Undo correctly removes the group."
    );
    
    // Create a new group for this action
    const group: ActionGroup = {
      id: this.generateId(),
      type: 'actionGroup',
      children: [],
      isOutput: true,
      created: new Date()
    };
    this.addActionGroup(group);
    this.addActionToGroup(action, group.id);
    return group;
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
   * Add a complete ActionGroup to the tree (Phase 81 Refactor)
   * Adds to the current subprocess on top of the stack.
   */
  addActionGroup(group: ActionGroup): void {
     const currentSubprocess = this.getCurrentSubprocess();
     currentSubprocess.children.push(group);
     this.notifyChange();
  }

  /**
   * Add an action to an existing group
   * @param action The action to add
   * @param groupId The ID of the target ActionGroup
   * @returns The index where the action was added
   */
  addActionToGroup(action: Action, groupId: string): number {
    let groupFound: ActionGroup | undefined;
    
    // Find group
    this.traverseGroups(this.root, (group) => {
      if (group.id === groupId) {
        groupFound = group;
      }
    });

    if (!groupFound) {
      throw new Error(`ActionGroup ${groupId} not found`);
    }

    // Phase 93: Wrap Action (3 fields) in ActionNode (adds id, type, created)
    const actionNode: ActionNode = {
      ...action,
      id: this.generateId(),  // Generate ID for tree node
      type: 'action',
      isOutput: action.isOutput !== undefined ? action.isOutput : true,
      created: new Date()
    };
    
    const index = groupFound.children.push(actionNode) - 1;
    this.notifyChange();
    return index;
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
        const oldValue = subprocess.showIntermediates;
        subprocess.showIntermediates = !subprocess.showIntermediates;
        console.log(`[ProcessTree.toggleSubprocessEncapsulation] subprocessId: ${subprocessId}, ${oldValue} → ${subprocess.showIntermediates}`);
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
        const oldValue = subprocess.isOutput;
        subprocess.isOutput = !subprocess.isOutput;
        console.log(`[ProcessTree.toggleOutput] subprocess ${nodeId}, ${oldValue} → ${subprocess.isOutput}`);
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
        const oldValue = group.isOutput;
        group.isOutput = !group.isOutput;
        console.log(`[ProcessTree.toggleOutput] actionGroup ${nodeId}, ${oldValue} → ${group.isOutput}`);
        handled = true;
      } else if (node.type === 'action' && node.id === nodeId) {
        const action = node as ActionNode;
        const oldValue = action.isOutput;
        action.isOutput = !action.isOutput;
        console.log(`[ProcessTree.toggleOutput] action ${nodeId}, ${oldValue} → ${action.isOutput}`);
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
    } else {
      console.error(`[ProcessTree.toggleOutput] Node ${nodeId} not found`);
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
   * Get actions that produce a specific element (by elementId)
   * Phase 92: Use action.elementId instead of action.outputs
   */
  getActionsProducingElement(elementId: string): Action[] {
    const actions: Action[] = [];
    this.traverseActions(this.root, (action) => {
      if (action.elementId === elementId) {
        actions.push(action);
      }
    });
    return actions;
  }

  /**
   * Get actions that depend on a specific element (by input ID)
   * Phase 92: Use DependencyService.getDependents(elementId) instead
   * @deprecated Use world.dependencyService.getDependents(elementId) instead
   */
  getActionsDependingOnElement(elementId: string): Action[] {
    // This method is deprecated - dependencies now tracked by DependencyService
    // To find actions depending on an element:
    // 1. Get dependents: world.dependencyService.getDependents(elementId)
    // 2. For each dependent, find its action via getActionsProducingElement(dependentId)
    console.warn('ProcessTree.getActionsDependingOnElement() is deprecated. Use DependencyService.getDependents()');
    return [];
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
   * Remove an action by elementId (Phase 93)
   * Used when actions no longer have persistent IDs
   * 
   * @param elementId - ID of element produced by action
   * @returns Object with removed action data and location, or null if not found
   */
  removeActionByElementId(elementId: string): { action: ActionNode, groupId: string, index: number } | null {
    let result: { action: ActionNode, groupId: string, index: number } | null = null;
    
    this.traverseGroups(this.root, (group) => {
      const index = group.children.findIndex(child => child?.elementId === elementId);
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
   * Remove an ActionGroup from the tree by ID
   * Removes from parent subprocess children list (does NOT create tombstone)
   */
  removeActionGroup(groupId: string): boolean {
    const parentSubprocess = this.findParentSubprocessOfGroup(this.root, groupId);
    if (parentSubprocess) {
      const index = parentSubprocess.children.findIndex(child => child.id === groupId);
      if (index !== -1) {
        parentSubprocess.children.splice(index, 1);
        this.notifyChange();
        return true;
      }
    }
    return false;
  }

  private findParentSubprocessOfGroup(node: Subprocess, groupId: string): Subprocess | null {
    // Check direct children
    for (const child of node.children) {
      if (child.type === 'actionGroup' && child.id === groupId) {
        return node;
      }
    }
    
    // Recurse into subprocesses
    for (const child of node.children) {
      if (child.type === 'subprocess') {
        const found = this.findParentSubprocessOfGroup(child, groupId);
        if (found) return found;
      }
    }
    
    return null;
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
  /**
   * Phase 95: Generate unique ID (camelCase format)
   */
  private generateId(): string {
    return `node${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
  }
}

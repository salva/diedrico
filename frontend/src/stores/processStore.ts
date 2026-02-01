import { defineStore } from 'pinia';
import type { Process } from '../domain/processTree/Process';
import type { Subprocess } from '../domain/processTree/Subprocess';
import type { ActionGroup } from '../domain/processTree/ActionGroup';
import type { ConstructiveAction } from '../domain/processTree/Action';
import { createProcess } from '../domain/processTree/Process';
import { CommandStack } from '../commands/CommandStack';

interface ProcessState {
  root: Process;
  commandHistory: CommandStack;
}

export const useProcessStore = defineStore('process', {
  state: (): ProcessState => ({
    root: createProcess(),
    commandHistory: new CommandStack()
  }),

  getters: {
    /**
     * Get node by path (e.g., "/subprocess/sp1/actionGroup/ag1")
     */
    getNodeByPath: (state) => (path: string): Subprocess | ActionGroup | ConstructiveAction | null => {
      const parts = path.split('/').filter(Boolean);
      let current: any = state.root;

      for (let i = 0; i < parts.length; i += 2) {
        const type = parts[i];
        const id = parts[i + 1];

        if (type === 'subprocess') {
          current = current.children?.find((c: any) => c.id === id);
        } else if (type === 'actionGroup') {
          current = current.children?.find((c: any) => c.id === id);
        } else if (type === 'action') {
          current = current.children?.find((c: any) => c.id === id);
        }

        if (!current) return null;
      }

      return current;
    },

    /**
     * Get all subprocesses (recursive)
     */
    visibleSubprocesses: (state) => {
      const result: Subprocess[] = [];
      const traverse = (subprocess: Subprocess) => {
        result.push(subprocess);
        subprocess.children.forEach(child => {
          if (child.type === 'subprocess') {
            traverse(child as Subprocess);
          }
        });
      };
      
      if (state.root) {
        // Cast Process to Subprocess for traversal
        traverse(state.root as unknown as Subprocess);
      }
      return result;
    },

    /**
     * Get all actions (flat array)
     */
    allActions: (state) => {
      const result: ConstructiveAction[] = [];
      const traverse = (node: Subprocess | ActionGroup) => {
        node.children.forEach(child => {
          if ('type' in child && child.type === 'action') {
            result.push(child as ConstructiveAction);
          } else if ('children' in child) {
            traverse(child as Subprocess | ActionGroup);
          }
        });
      };
      // Start from root's children (which are Subprocess or ActionGroup)
      state.root.children.forEach(child => {
        if ('children' in child) {
          traverse(child as Subprocess | ActionGroup);
        }
      });
      return result;
    }
  },

  actions: {
    /**
     * Add subprocess to parent path
     */
    addSubprocess(parentPath: string, subprocess: Subprocess): void {
      const parent = this.getNodeByPath(parentPath) as Subprocess;
      if (parent && 'children' in parent) {
        parent.children.push(subprocess);
      } else if (parentPath === '/') {
        this.root.children.push(subprocess);
      }
    },

    /**
     * Add action group to subprocess
     */
    addActionGroup(subprocessPath: string, actionGroup: ActionGroup): void {
      const subprocess = this.getNodeByPath(subprocessPath) as Subprocess;
      if (subprocess && 'children' in subprocess) {
        subprocess.children.push(actionGroup);
      }
    },

    /**
     * Add action to action group
     */
    addAction(actionGroupPath: string, action: ConstructiveAction): void {
      const actionGroup = this.getNodeByPath(actionGroupPath) as ActionGroup;
      if (actionGroup && 'children' in actionGroup) {
        actionGroup.children.push(action);
      }
    },

    /**
     * Remove subprocess by path
     */
    removeSubprocess(subprocessPath: string): Subprocess | null {
      const parts = subprocessPath.split('/').filter(Boolean);
      const id = parts[parts.length - 1];
      const parentPath = '/' + parts.slice(0, -2).join('/');

      const parent = parentPath === '/' ? this.root : this.getNodeByPath(parentPath) as Subprocess;
      if (parent && 'children' in parent) {
        const index = parent.children.findIndex((c: any) => c.id === id);
        if (index !== -1) {
          const removed = parent.children.splice(index, 1)[0];
          return removed as Subprocess;
        }
      }
      return null;
    },

    /**
     * Remove action group by path
     */
    removeActionGroup(actionGroupPath: string): ActionGroup | null {
      const parts = actionGroupPath.split('/').filter(Boolean);
      const id = parts[parts.length - 1];
      const parentPath = '/' + parts.slice(0, -2).join('/');

      const parent = this.getNodeByPath(parentPath) as Subprocess;
      if (parent && 'children' in parent) {
        const index = parent.children.findIndex((c: any) => c.id === id);
        if (index !== -1) {
          const removed = parent.children.splice(index, 1)[0];
          return removed as ActionGroup;
        }
      }
      return null;
    },

    /**
     * Remove action by path
     */
    removeAction(actionPath: string): ConstructiveAction | null {
      const parts = actionPath.split('/').filter(Boolean);
      const id = parts[parts.length - 1];
      const parentPath = '/' + parts.slice(0, -2).join('/');

      const parent = this.getNodeByPath(parentPath) as ActionGroup;
      if (parent && 'children' in parent) {
        const index = parent.children.findIndex((c: any) => c.id === id);
        if (index !== -1) {
          const removed = parent.children.splice(index, 1)[0];
          return removed as ConstructiveAction;
        }
      }
      return null;
    },

    /**
     * Clear process tree (for testing or reset)
     */
    clear(): void {
      this.root = createProcess();
      this.commandHistory.clear();
    }
  }
});

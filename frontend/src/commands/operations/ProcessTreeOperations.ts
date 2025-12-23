/**
 * ProcessTree Operations - Operations for modifying the construction history
 */

import type { Operation } from '../Command';
import type { OperationResult } from '../../types/CommandTypes';
import type { Subprocess } from '../../domain/processTree/Subprocess';
import type { ActionGroup } from '../../domain/processTree/ActionGroup';
import type { ConstructiveAction } from '../../domain/processTree/Action';

/**
 * AddSubprocess operation - adds a subprocess to the tree
 */
export class AddSubprocessOp implements Operation {
  id: string;
  type = 'AddSubprocess';
  args: {
    parentPath: string;
    subprocess: Subprocess;
    position: number;
  };

  private processStore: any;

  constructor(
    id: string,
    parentPath: string,
    subprocess: Subprocess,
    position: number,
    processStore: any
  ) {
    this.id = id;
    this.args = { parentPath, subprocess, position };
    this.processStore = processStore;
  }

  execute(): OperationResult {
    try {
      this.processStore.addSubprocess(
        this.args.parentPath,
        this.args.subprocess,
        this.args.position
      );

      return {
        success: true,
        outputs: {
          subprocessPath: `${this.args.parentPath}/subprocess/${this.args.subprocess.id}`
        }
      };
    } catch (error) {
      return {
        success: false,
        outputs: {},
        error: error instanceof Error ? error.message : 'Failed to add subprocess'
      };
    }
  }

  rollback(): void {
    this.processStore.removeSubprocess(
      `${this.args.parentPath}/subprocess/${this.args.subprocess.id}`
    );
  }
}

/**
 * AddActionGroup operation - adds an action group to a subprocess
 */
export class AddActionGroupOp implements Operation {
  id: string;
  type = 'AddActionGroup';
  args: {
    parentPath: string;
    actionGroup: ActionGroup;
    position: number;
  };

  private processStore: any;

  constructor(
    id: string,
    parentPath: string,
    actionGroup: ActionGroup,
    position: number,
    processStore: any
  ) {
    this.id = id;
    this.args = { parentPath, actionGroup, position };
    this.processStore = processStore;
  }

  execute(): OperationResult {
    try {
      this.processStore.addActionGroup(
        this.args.parentPath,
        this.args.actionGroup,
        this.args.position
      );

      return {
        success: true,
        outputs: {
          actionGroupPath: `${this.args.parentPath}/actionGroup/${this.args.actionGroup.id}`
        }
      };
    } catch (error) {
      return {
        success: false,
        outputs: {},
        error: error instanceof Error ? error.message : 'Failed to add action group'
      };
    }
  }

  rollback(): void {
    this.processStore.removeActionGroup(
      `${this.args.parentPath}/actionGroup/${this.args.actionGroup.id}`
    );
  }
}

/**
 * AddActionToGroup operation - adds an action to an action group
 */
export class AddActionToGroupOp implements Operation {
  id: string;
  type = 'AddActionToGroup';
  args: {
    actionGroupPath: string;
    action: ConstructiveAction;
    position: number;
  };

  private processStore: any;

  constructor(
    id: string,
    actionGroupPath: string,
    action: ConstructiveAction,
    position: number,
    processStore: any
  ) {
    this.id = id;
    this.args = { actionGroupPath, action, position };
    this.processStore = processStore;
  }

  execute(): OperationResult {
    try {
      this.processStore.addAction(
        this.args.actionGroupPath,
        this.args.action,
        this.args.position
      );

      return {
        success: true,
        outputs: {
          actionPath: `${this.args.actionGroupPath}/action/${this.args.action.id}`
        }
      };
    } catch (error) {
      return {
        success: false,
        outputs: {},
        error: error instanceof Error ? error.message : 'Failed to add action'
      };
    }
  }

  rollback(): void {
    this.processStore.removeAction(
      `${this.args.actionGroupPath}/action/${this.args.action.id}`
    );
  }
}

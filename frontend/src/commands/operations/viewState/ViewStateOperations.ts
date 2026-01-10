/**
 * ViewState Operations - Operations for modifying UI state
 */

import type { Operation } from '../Command';
import type { OperationResult } from '../../types/CommandTypes';

/**
 * SetActivePlane operation - changes the active projection plane
 */
export class SetActivePlaneOp implements Operation {
  id: string;
  type = 'SetActivePlane';
  args: {
    beforePlanePath: string;
    afterPlanePath: string;
  };

  private viewStore: any;

  constructor(
    id: string,
    beforePlanePath: string,
    afterPlanePath: string,
    viewStore: any
  ) {
    this.id = id;
    this.args = { beforePlanePath, afterPlanePath };
    this.viewStore = viewStore;
  }

  execute(): OperationResult {
    try {
      const planeId = this.args.afterPlanePath.split('/').pop()!;
      this.viewStore.setActivePlane(planeId);

      return {
        success: true,
        outputs: {
          activePlanePath: this.args.afterPlanePath
        }
      };
    } catch (error) {
      return {
        success: false,
        outputs: {},
        error: error instanceof Error ? error.message : 'Failed to set active plane'
      };
    }
  }

  rollback(): void {
    const planeId = this.args.beforePlanePath.split('/').pop()!;
    this.viewStore.setActivePlane(planeId);
  }
}

/**
 * UpdateView2D operation - updates 2D view state (pan/zoom)
 */
export class UpdateView2DOp implements Operation {
  id: string;
  type = 'UpdateView2D';
  args: {
    planePath: string;
    beforeState: Record<string, any>;
    afterState: Record<string, any>;
  };

  private viewStore: any;

  constructor(
    id: string,
    planePath: string,
    beforeState: Record<string, any>,
    afterState: Record<string, any>,
    viewStore: any
  ) {
    this.id = id;
    this.args = { planePath, beforeState, afterState };
    this.viewStore = viewStore;
  }

  execute(): OperationResult {
    try {
      const planeId = this.args.planePath.split('/').pop()!;
      this.viewStore.updateView2D(planeId, this.args.afterState);

      return {
        success: true,
        outputs: {
          updated: true
        }
      };
    } catch (error) {
      return {
        success: false,
        outputs: {},
        error: error instanceof Error ? error.message : 'Failed to update view 2D'
      };
    }
  }

  rollback(): void {
    const planeId = this.args.planePath.split('/').pop()!;
    this.viewStore.updateView2D(planeId, this.args.beforeState);
  }
}

/**
 * TogglePlaneVisibility operation - shows/hides a projection plane
 */
export class TogglePlaneVisibilityOp implements Operation {
  id: string;
  type = 'TogglePlaneVisibility';
  args: {
    planePath: string;
    beforeVisible: boolean;
    afterVisible: boolean;
  };

  private viewStore: any;

  constructor(
    id: string,
    planePath: string,
    beforeVisible: boolean,
    afterVisible: boolean,
    viewStore: any
  ) {
    this.id = id;
    this.args = { planePath, beforeVisible, afterVisible };
    this.viewStore = viewStore;
  }

  execute(): OperationResult {
    try {
      const planeId = this.args.planePath.split('/').pop()!;
      this.viewStore.setPlaneVisibility(planeId, this.args.afterVisible);

      return {
        success: true,
        outputs: {
          visible: this.args.afterVisible
        }
      };
    } catch (error) {
      return {
        success: false,
        outputs: {},
        error: error instanceof Error ? error.message : 'Failed to toggle plane visibility'
      };
    }
  }

  rollback(): void {
    const planeId = this.args.planePath.split('/').pop()!;
    this.viewStore.setPlaneVisibility(planeId, this.args.beforeVisible);
  }
}

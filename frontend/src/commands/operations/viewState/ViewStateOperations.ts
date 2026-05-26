/**
 * ViewState Operations - Operations for modifying UI state
 */

import type { IOperation, JsonObject, OperationResult } from '../IOperation';
import type { World } from '@/domain/world/World';

interface ActivePlaneViewStore {
  setActivePlane(planeId: string): void;
}

interface View2DViewStore {
  updateView2D(planeId: string, state: Record<string, unknown>): void;
}

interface PlaneVisibilityViewStore {
  setPlaneVisibility(planeId: string, visible: boolean): void;
}

function planeIdFromPath(planePath: string): string {
  const planeId = planePath.split('/').pop();
  if (!planeId) {
    throw new Error(`Invalid plane path: ${planePath}`);
  }
  return planeId;
}

/**
 * SetActivePlane operation - changes the active projection plane
 */
export class SetActivePlaneOp implements IOperation {
  readonly type = 'SetActivePlane';
  readonly parameters: Record<string, unknown>;
  outputs: JsonObject = {};

  constructor(
    private readonly beforePlanePath: string,
    private readonly afterPlanePath: string,
    private readonly viewStore: ActivePlaneViewStore
  ) {
    this.parameters = { beforePlanePath, afterPlanePath };
  }

  apply(_world: World): OperationResult {
    try {
      const planeId = planeIdFromPath(this.afterPlanePath);
      this.viewStore.setActivePlane(planeId);
      this.outputs = { activePlanePath: this.afterPlanePath };

      return {
        success: true,
        outputs: this.outputs
      };
    } catch (error) {
      return {
        success: false,
        outputs: {},
        error: error instanceof Error ? error.message : 'Failed to set active plane'
      };
    }
  }

  undo(_world: World): void {
    const planeId = planeIdFromPath(this.beforePlanePath);
    this.viewStore.setActivePlane(planeId);
  }
}

/**
 * UpdateView2D operation - updates 2D view state (pan/zoom)
 */
export class UpdateView2DOp implements IOperation {
  readonly type = 'UpdateView2D';
  readonly parameters: Record<string, unknown>;
  outputs: JsonObject = {};

  constructor(
    private readonly planePath: string,
    private readonly beforeState: Record<string, unknown>,
    private readonly afterState: Record<string, unknown>,
    private readonly viewStore: View2DViewStore
  ) {
    this.parameters = { planePath, beforeState, afterState };
  }

  apply(_world: World): OperationResult {
    try {
      const planeId = planeIdFromPath(this.planePath);
      this.viewStore.updateView2D(planeId, this.afterState);
      this.outputs = { updated: true };

      return {
        success: true,
        outputs: this.outputs
      };
    } catch (error) {
      return {
        success: false,
        outputs: {},
        error: error instanceof Error ? error.message : 'Failed to update view 2D'
      };
    }
  }

  undo(_world: World): void {
    const planeId = planeIdFromPath(this.planePath);
    this.viewStore.updateView2D(planeId, this.beforeState);
  }
}

/**
 * TogglePlaneVisibility operation - shows/hides a projection plane
 */
export class TogglePlaneVisibilityOp implements IOperation {
  readonly type = 'TogglePlaneVisibility';
  readonly parameters: Record<string, unknown>;
  outputs: JsonObject = {};

  constructor(
    private readonly planePath: string,
    private readonly beforeVisible: boolean,
    private readonly afterVisible: boolean,
    private readonly viewStore: PlaneVisibilityViewStore
  ) {
    this.parameters = { planePath, beforeVisible, afterVisible };
  }

  apply(_world: World): OperationResult {
    try {
      const planeId = planeIdFromPath(this.planePath);
      this.viewStore.setPlaneVisibility(planeId, this.afterVisible);
      this.outputs = { visible: this.afterVisible };

      return {
        success: true,
        outputs: this.outputs
      };
    } catch (error) {
      return {
        success: false,
        outputs: {},
        error: error instanceof Error ? error.message : 'Failed to toggle plane visibility'
      };
    }
  }

  undo(_world: World): void {
    const planeId = planeIdFromPath(this.planePath);
    this.viewStore.setPlaneVisibility(planeId, this.beforeVisible);
  }
}

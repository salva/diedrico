import { describe, expect, it } from 'vitest';
import { World } from '@/domain/world/World';
import {
  SetActivePlaneOp,
  TogglePlaneVisibilityOp,
  UpdateView2DOp
} from '@/commands/operations/viewState/ViewStateOperations';

describe('ViewStateOperations', () => {
  it('sets the active plane on apply and restores the previous active plane on undo', () => {
    const world = new World();
    const activePlaneChanges: string[] = [];
    const viewStore = {
      setActivePlane(planeId: string): void {
        activePlaneChanges.push(planeId);
      }
    };

    const op = new SetActivePlaneOp('/projectionPlanes/plane-before', '/projectionPlanes/plane-after', viewStore);

    const result = op.apply({ world });

    expect(result).toEqual({
      success: true,
      outputs: { activePlanePath: '/projectionPlanes/plane-after' }
    });
    expect(op.outputs).toEqual({ activePlanePath: '/projectionPlanes/plane-after' });
    expect(op.parameters).toEqual({
      beforePlanePath: '/projectionPlanes/plane-before',
      afterPlanePath: '/projectionPlanes/plane-after'
    });
    expect(activePlaneChanges).toEqual(['plane-after']);

    op.undo({ world });

    expect(activePlaneChanges).toEqual(['plane-after', 'plane-before']);
  });

  it('updates 2D view state on apply and restores the previous state on undo', () => {
    const world = new World();
    const beforeState = { zoom: 1, pan: { x: 0, y: 0 } };
    const afterState = { zoom: 2, pan: { x: 12, y: -4 } };
    const updates: Array<{ planeId: string; state: Record<string, unknown> }> = [];
    const viewStore = {
      updateView2D(planeId: string, state: Record<string, unknown>): void {
        updates.push({ planeId, state });
      }
    };

    const op = new UpdateView2DOp('/projectionPlanes/plane-1', beforeState, afterState, viewStore);

    const result = op.apply({ world });

    expect(result).toEqual({
      success: true,
      outputs: { updated: true }
    });
    expect(op.outputs).toEqual({ updated: true });
    expect(updates).toEqual([{ planeId: 'plane-1', state: afterState }]);

    op.undo({ world });

    expect(updates).toEqual([
      { planeId: 'plane-1', state: afterState },
      { planeId: 'plane-1', state: beforeState }
    ]);
  });

  it('toggles plane visibility on apply and restores the previous visibility on undo', () => {
    const world = new World();
    const visibilityChanges: Array<{ planeId: string; visible: boolean }> = [];
    const viewStore = {
      setPlaneVisibility(planeId: string, visible: boolean): void {
        visibilityChanges.push({ planeId, visible });
      }
    };

    const op = new TogglePlaneVisibilityOp('/projectionPlanes/plane-hidden', true, false, viewStore);

    const result = op.apply({ world });

    expect(result).toEqual({
      success: true,
      outputs: { visible: false }
    });
    expect(op.outputs).toEqual({ visible: false });
    expect(visibilityChanges).toEqual([{ planeId: 'plane-hidden', visible: false }]);

    op.undo({ world });

    expect(visibilityChanges).toEqual([
      { planeId: 'plane-hidden', visible: false },
      { planeId: 'plane-hidden', visible: true }
    ]);
  });

  it('returns an OperationResult failure with explicit empty outputs when the target plane path is invalid', () => {
    const world = new World();
    const activePlaneChanges: string[] = [];
    const viewStore = {
      setActivePlane(planeId: string): void {
        activePlaneChanges.push(planeId);
      }
    };

    const op = new SetActivePlaneOp('/projectionPlanes/plane-before', '/', viewStore);

    const result = op.apply({ world });

    expect(result).toEqual({
      success: false,
      outputs: {},
      error: 'Invalid plane path: /'
    });
    expect(op.outputs).toEqual({});
    expect(activePlaneChanges).toEqual([]);
  });
});

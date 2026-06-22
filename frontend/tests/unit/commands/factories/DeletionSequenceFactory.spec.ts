/**
 * DeletionSequenceFactory.spec.ts - Unit tests for DeletionSequenceFactory
 *
 * Covers cascade deletion behavior using Wave 005's explicit ownership model:
 * - process history is created through explicit ActionGroup + addActionToGroup setup
 * - dependency cascades are driven by DependencyService.registerNode()
 * - no implicit process-tree addAction() or dependency rebuild shim is used
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Vector3 } from 'three';
import type { World } from '../../../../src/domain/world/World';
import type { CommandStack } from '../../../../src/commands/CommandStack';
import type { OperationContext } from '../../../../src/commands/operations/OperationContext';
import type { Action } from '../../../../src/domain/processTree/Action';
import type { ActionGroup } from '../../../../src/domain/processTree/ProcessTree';
import { Command } from '../../../../src/commands/Command';
import { createTestWorld, getHorizontalPlaneId } from '../../../helpers/worldHelpers';
import { DeletionSequenceFactory } from '../../../../src/commands/factories/DeletionSequenceFactory';
import { AddFreePoint2DOp } from '../../../../src/commands/operations/world/AddFreePointOp';
import { AddLine2DByTwoPointsOp } from '../../../../src/commands/operations/world/AddLineOp';
import { AddCircle2DByCenterAndPointOp } from '../../../../src/commands/operations/world/AddCircleOp';
import { AddSegment2DByPointsOp } from '../../../../src/commands/operations/world/AddSegmentOp';
import { createPointAction } from '../../../../src/domain/processTree/actions/CreatePointAction';
import { createLineAction } from '../../../../src/domain/processTree/actions/CreateLineAction';
import { createCircleAction } from '../../../../src/domain/processTree/actions/CreateCircleAction';
import { createSegmentAction } from '../../../../src/domain/processTree/actions/CreateSegmentAction';

describe('DeletionSequenceFactory', () => {
  let world: World;
  let visibilityModel;
  let commandStack: CommandStack;
  let operationContext: OperationContext;
  let planeId: string;

  beforeEach(() => {
    const { world: w, visibilityModel: vm, commandStack: cs, operationContext: oc } = createTestWorld();
    world = w;

    visibilityModel = vm;    commandStack = cs;
    operationContext = oc;
    planeId = getHorizontalPlaneId(world);
  });

  function addExplicitProcessAction(action: Action): string {
    const processTree = operationContext.processTree;
    const actionGroup: ActionGroup = {
      id: `test-group-${action.elementId}`,
      type: 'actionGroup',
      children: [],
      isAuxiliary: false,
      isOutput: action.isOutput ?? true,
      created: new Date()
    };

    processTree.addActionGroup(actionGroup);
    const { actionNode } = processTree.addActionToGroup(action, actionGroup.id);

    if (!actionNode) {
      throw new Error(`Failed to insert process action for ${action.elementId}`);
    }

    return actionNode.id;
  }

  function deletionContext() {
    return {
      world,
      dependencyQuery: operationContext.dependencies,
      processTree: operationContext.processTree,
    };
  }

  function expectActionRemoved(elementId: string): void {
    expect(operationContext.processTree.getActionsProducingElement(elementId)).toHaveLength(0);
  }

  function expectActionPresent(elementId: string): void {
    expect(operationContext.processTree.getActionsProducingElement(elementId)).toHaveLength(1);
  }

  describe('createCascadeDeletion', () => {
    it('should handle empty selection gracefully', () => {
      const deleteCmd = new Command('Delete nothing', operationContext);
      DeletionSequenceFactory.createCascadeDeletion(deleteCmd, [], deletionContext());

      expect(deleteCmd.operations.length).toBe(0);
    });

    it('should delete a single point and tombstone its explicit process-tree action', () => {
      const setupCmd = new Command('Setup point', operationContext);
      const pointResult = setupCmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(100, 200, 1)));
      const pointId = pointResult.outputs.pointId!;
      addExplicitProcessAction(createPointAction(pointId));
      setupCmd.commit();

      expectActionPresent(pointId);

      const deleteCmd = new Command('Delete point', operationContext);
      DeletionSequenceFactory.createCascadeDeletion(deleteCmd, [pointId], deletionContext());
      deleteCmd.commit();

      const plane = world.getProjectionPlaneById(planeId)!;
      expect(plane.getPoint(pointId)).toBeUndefined();
      expectActionRemoved(pointId);
      expect(deleteCmd.operations.map(op => op.type)).toEqual([
        'RemoveActionFromProcessTree',
        'RemovePoint2D',
      ]);
    });

    it('should fail fast when element has no process tree action', () => {
      const setupCmd = new Command('Setup', operationContext);
      const pointResult = setupCmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(100, 200, 1)));
      const pointId = pointResult.outputs.pointId!;
      setupCmd.commit();

      const deleteCmd = new Command('Delete point', operationContext);
      expect(() => DeletionSequenceFactory.createCascadeDeletion(deleteCmd, [pointId], deletionContext())).toThrow(`Cannot delete ${pointId}: no producing action found in process tree`);
    });

    it('should cascade delete a dependent line before deleting its defining point', () => {
      const setupCmd = new Command('Setup line', operationContext);
      const p1Result = setupCmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(100, 200, 1)));
      const p2Result = setupCmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(300, 400, 1)));
      const point1Id = p1Result.outputs.pointId!;
      const point2Id = p2Result.outputs.pointId!;
      const lineResult = setupCmd.addAndExecute(new AddLine2DByTwoPointsOp(planeId, point1Id, point2Id));
      const lineId = lineResult.outputs.lineId!;

      addExplicitProcessAction(createPointAction(point1Id));
      addExplicitProcessAction(createPointAction(point2Id));
      addExplicitProcessAction(createLineAction(lineId));
      operationContext.dependencies.registerNode(lineId, [point1Id, point2Id]);
      setupCmd.commit();

      const deleteCmd = new Command('Delete point with cascade', operationContext);
      DeletionSequenceFactory.createCascadeDeletion(deleteCmd, [point1Id], deletionContext());
      deleteCmd.commit();

      const plane = world.getProjectionPlaneById(planeId)!;
      expect(plane.getLine(lineId)).toBeUndefined();
      expect(plane.getPoint(point1Id)).toBeUndefined();
      expect(plane.getPoint(point2Id)).toBeDefined();
      expectActionRemoved(lineId);
      expectActionRemoved(point1Id);
      expectActionPresent(point2Id);

      const operationTypes = deleteCmd.operations.map(op => op.type);
      expect(operationTypes.indexOf('RemoveLine2D')).toBeLessThan(operationTypes.indexOf('RemovePoint2D'));
      expect(operationTypes).toEqual([
        'RemoveActionFromProcessTree',
        'RemoveActionFromProcessTree',
        'RemoveLine2D',
        'RemovePoint2D'
      ]);
    });

    it('should cascade delete a dependent circle through real dependency registration', () => {
      const setupCmd = new Command('Setup circle', operationContext);
      const centerResult = setupCmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(200, 200, 1)));
      const circumferenceResult = setupCmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(300, 200, 1)));
      const centerId = centerResult.outputs.pointId!;
      const circumferenceId = circumferenceResult.outputs.pointId!;
      const circleResult = setupCmd.addAndExecute(new AddCircle2DByCenterAndPointOp(planeId, centerId, circumferenceId));
      const circleId = circleResult.outputs.circleId!;

      addExplicitProcessAction(createPointAction(centerId));
      addExplicitProcessAction(createPointAction(circumferenceId));
      addExplicitProcessAction(createCircleAction(circleId));
      operationContext.dependencies.registerNode(circleId, [centerId, circumferenceId]);
      setupCmd.commit();

      const deleteCmd = new Command('Delete center with cascade', operationContext);
      DeletionSequenceFactory.createCascadeDeletion(deleteCmd, [centerId], deletionContext());
      deleteCmd.commit();

      const plane = world.getProjectionPlaneById(planeId)!;
      expect(plane.getCircle(circleId)).toBeUndefined();
      expect(plane.getPoint(centerId)).toBeUndefined();
      expect(plane.getPoint(circumferenceId)).toBeDefined();
      expectActionRemoved(circleId);
      expectActionRemoved(centerId);
      expectActionPresent(circumferenceId);
      expect(deleteCmd.operations.map(op => op.type)).toEqual([
        'RemoveActionFromProcessTree',
        'RemoveActionFromProcessTree',
        'RemoveCircle2D',
        'RemovePoint2D'
      ]);
    });

    it('should delete multiple independent points and their explicit process-tree actions', () => {
      const setupCmd = new Command('Setup multiple points', operationContext);
      const p1Result = setupCmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(100, 200, 1)));
      const p2Result = setupCmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(300, 400, 1)));
      const p3Result = setupCmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(500, 600, 1)));
      const pointIds = [p1Result.outputs.pointId!, p2Result.outputs.pointId!, p3Result.outputs.pointId!];

      pointIds.forEach(pointId => addExplicitProcessAction(createPointAction(pointId)));
      setupCmd.commit();

      const deleteCmd = new Command('Delete multiple points', operationContext);
      DeletionSequenceFactory.createCascadeDeletion(deleteCmd, pointIds, deletionContext());
      deleteCmd.commit();

      const plane = world.getProjectionPlaneById(planeId)!;
      pointIds.forEach(pointId => {
        expect(plane.getPoint(pointId)).toBeUndefined();
        expectActionRemoved(pointId);
      });
      expect(deleteCmd.operations.map(op => op.type)).toEqual([
        'RemoveActionFromProcessTree',
        'RemoveActionFromProcessTree',
        'RemoveActionFromProcessTree',
        'RemovePoint2D',
        'RemovePoint2D',
        'RemovePoint2D'
      ]);
    });

    it('should support undo and redo for dependency-driven cascade deletion', () => {
      const setupCmd = new Command('Setup line', operationContext);
      const p1Result = setupCmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(100, 200, 1)));
      const p2Result = setupCmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(300, 400, 1)));
      const point1Id = p1Result.outputs.pointId!;
      const point2Id = p2Result.outputs.pointId!;
      const lineResult = setupCmd.addAndExecute(new AddLine2DByTwoPointsOp(planeId, point1Id, point2Id));
      const lineId = lineResult.outputs.lineId!;

      addExplicitProcessAction(createPointAction(point1Id));
      addExplicitProcessAction(createPointAction(point2Id));
      addExplicitProcessAction(createLineAction(lineId));
      operationContext.dependencies.registerNode(lineId, [point1Id, point2Id]);
      setupCmd.commit();
      commandStack.push(setupCmd);

      const deleteCmd = new Command('Delete point with cascade', operationContext);
      DeletionSequenceFactory.createCascadeDeletion(deleteCmd, [point1Id], deletionContext());
      deleteCmd.commit();
      commandStack.push(deleteCmd);

      const plane = world.getProjectionPlaneById(planeId)!;
      expect(plane.getPoint(point1Id)).toBeUndefined();
      expect(plane.getLine(lineId)).toBeUndefined();
      expectActionRemoved(point1Id);
      expectActionRemoved(lineId);

      commandStack.undo();
      expect(plane.getPoint(point1Id)).toBeDefined();
      expect(plane.getLine(lineId)).toBeDefined();
      expectActionPresent(point1Id);
      expectActionPresent(lineId);

      commandStack.redo();
      expect(plane.getPoint(point1Id)).toBeUndefined();
      expect(plane.getLine(lineId)).toBeUndefined();
      expectActionRemoved(point1Id);
      expectActionRemoved(lineId);
    });

    it('should dispatch segment deletion to RemoveSegment2D without deleting defining points', () => {
      const setupCmd = new Command('Setup segment', operationContext);
      const p1Result = setupCmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(100, 200, 1)));
      const p2Result = setupCmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(300, 400, 1)));
      const point1Id = p1Result.outputs.pointId!;
      const point2Id = p2Result.outputs.pointId!;
      const segmentResult = setupCmd.addAndExecute(new AddSegment2DByPointsOp(planeId, point1Id, point2Id));
      const segmentId = segmentResult.outputs.segmentId!;

      addExplicitProcessAction(createPointAction(point1Id));
      addExplicitProcessAction(createPointAction(point2Id));
      addExplicitProcessAction(createSegmentAction(segmentId));
      operationContext.dependencies.registerNode(segmentId, [point1Id, point2Id]);
      setupCmd.commit();

      const deleteCmd = new Command('Delete segment', operationContext);
      DeletionSequenceFactory.createCascadeDeletion(deleteCmd, [segmentId], deletionContext());
      deleteCmd.commit();

      const plane = world.getProjectionPlaneById(planeId)!;
      expect(plane.getLine(segmentId)).toBeUndefined();
      expect(plane.getPoint(point1Id)).toBeDefined();
      expect(plane.getPoint(point2Id)).toBeDefined();
      expectActionRemoved(segmentId);
      expectActionPresent(point1Id);
      expectActionPresent(point2Id);
      expect(deleteCmd.operations.map(op => op.type)).toEqual([
        'RemoveActionFromProcessTree',
        'RemoveSegment2D',
      ]);
    });
  });
});

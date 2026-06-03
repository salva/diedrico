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
import type { Action } from '../../../../src/domain/processTree/Action';
import type { ActionGroup } from '../../../../src/domain/processTree/ProcessTree';
import { Command } from '../../../../src/commands/Command';
import { createTestWorld } from '../../../helpers/worldHelpers';
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
  let commandStack: CommandStack;
  let planeId: string;

  beforeEach(() => {
    const { world: w, commandStack: cs } = createTestWorld();
    world = w;
    commandStack = cs;
    planeId = world.getProjectionPlaneByLabel('P_H').id!;
  });

  function addExplicitProcessAction(action: Action): string {
    const processTree = world.getProcessTree();
    const actionGroup: ActionGroup = {
      id: `test-group-${action.elementId}`,
      type: 'actionGroup',
      children: [],
      isAuxiliary: false,
      isOutput: action.isOutput ?? true,
      created: new Date()
    };

    processTree.addActionGroup(actionGroup);
    const index = processTree.addActionToGroup(action, actionGroup.id);
    const actionNode = actionGroup.children[index];

    if (!actionNode) {
      throw new Error(`Failed to insert process action for ${action.elementId}`);
    }

    return actionNode.id;
  }

  function expectActionRemoved(elementId: string): void {
    expect(world.getProcessTree().getActionsProducingElement(elementId)).toHaveLength(0);
  }

  function expectActionPresent(elementId: string): void {
    expect(world.getProcessTree().getActionsProducingElement(elementId)).toHaveLength(1);
  }

  describe('createCascadeDeletion', () => {
    it('should handle empty selection gracefully', () => {
      const deleteCmd = new Command('Delete nothing', world);
      DeletionSequenceFactory.createCascadeDeletion(deleteCmd, [], world);

      expect(deleteCmd.operations.length).toBe(0);
    });

    it('should delete a single point and tombstone its explicit process-tree action', () => {
      const setupCmd = new Command('Setup point', world);
      const pointResult = setupCmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(100, 200, 1)));
      const pointId = pointResult.outputs.pointId!;
      addExplicitProcessAction(createPointAction(pointId));
      setupCmd.commit();

      expectActionPresent(pointId);

      const deleteCmd = new Command('Delete point', world);
      DeletionSequenceFactory.createCascadeDeletion(deleteCmd, [pointId], world);
      deleteCmd.commit();

      const plane = world.getProjectionPlaneById(planeId)!;
      expect(plane.getPoint(pointId)).toBeUndefined();
      expectActionRemoved(pointId);
      expect(deleteCmd.operations.map(op => op.type)).toEqual([
        'RemovePoint2D',
        'RemoveActionFromProcessTree'
      ]);
    });

    it('should handle element without process tree action', () => {
      const setupCmd = new Command('Setup', world);
      const pointResult = setupCmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(100, 200, 1)));
      const pointId = pointResult.outputs.pointId!;
      setupCmd.commit();

      const deleteCmd = new Command('Delete point', world);
      DeletionSequenceFactory.createCascadeDeletion(deleteCmd, [pointId], world);
      deleteCmd.commit();

      const plane = world.getProjectionPlaneById(planeId)!;
      expect(plane.getPoint(pointId)).toBeUndefined();
      expect(deleteCmd.operations.length).toBe(1);
    });

    it('should cascade delete a dependent line before deleting its defining point', () => {
      const setupCmd = new Command('Setup line', world);
      const p1Result = setupCmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(100, 200, 1)));
      const p2Result = setupCmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(300, 400, 1)));
      const point1Id = p1Result.outputs.pointId!;
      const point2Id = p2Result.outputs.pointId!;
      const lineResult = setupCmd.addAndExecute(new AddLine2DByTwoPointsOp(planeId, point1Id, point2Id));
      const lineId = lineResult.outputs.lineId!;

      addExplicitProcessAction(createPointAction(point1Id));
      addExplicitProcessAction(createPointAction(point2Id));
      addExplicitProcessAction(createLineAction(lineId));
      world.getDependencyRegistrar().registerNode(lineId, [point1Id, point2Id]);
      setupCmd.commit();

      const deleteCmd = new Command('Delete point with cascade', world);
      DeletionSequenceFactory.createCascadeDeletion(deleteCmd, [point1Id], world);
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
        'RemoveLine2D',
        'RemovePoint2D',
        'RemoveActionFromProcessTree',
        'RemoveActionFromProcessTree'
      ]);
    });

    it('should cascade delete a dependent circle through real dependency registration', () => {
      const setupCmd = new Command('Setup circle', world);
      const centerResult = setupCmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(200, 200, 1)));
      const circumferenceResult = setupCmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(300, 200, 1)));
      const centerId = centerResult.outputs.pointId!;
      const circumferenceId = circumferenceResult.outputs.pointId!;
      const circleResult = setupCmd.addAndExecute(new AddCircle2DByCenterAndPointOp(planeId, centerId, circumferenceId));
      const circleId = circleResult.outputs.circleId!;

      addExplicitProcessAction(createPointAction(centerId));
      addExplicitProcessAction(createPointAction(circumferenceId));
      addExplicitProcessAction(createCircleAction(circleId));
      world.getDependencyRegistrar().registerNode(circleId, [centerId, circumferenceId]);
      setupCmd.commit();

      const deleteCmd = new Command('Delete center with cascade', world);
      DeletionSequenceFactory.createCascadeDeletion(deleteCmd, [centerId], world);
      deleteCmd.commit();

      const plane = world.getProjectionPlaneById(planeId)!;
      expect(plane.getCircle(circleId)).toBeUndefined();
      expect(plane.getPoint(centerId)).toBeUndefined();
      expect(plane.getPoint(circumferenceId)).toBeDefined();
      expectActionRemoved(circleId);
      expectActionRemoved(centerId);
      expectActionPresent(circumferenceId);
      expect(deleteCmd.operations.map(op => op.type)).toEqual([
        'RemoveCircle2D',
        'RemovePoint2D',
        'RemoveActionFromProcessTree',
        'RemoveActionFromProcessTree'
      ]);
    });

    it('should delete multiple independent points and their explicit process-tree actions', () => {
      const setupCmd = new Command('Setup multiple points', world);
      const p1Result = setupCmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(100, 200, 1)));
      const p2Result = setupCmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(300, 400, 1)));
      const p3Result = setupCmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(500, 600, 1)));
      const pointIds = [p1Result.outputs.pointId!, p2Result.outputs.pointId!, p3Result.outputs.pointId!];

      pointIds.forEach(pointId => addExplicitProcessAction(createPointAction(pointId)));
      setupCmd.commit();

      const deleteCmd = new Command('Delete multiple points', world);
      DeletionSequenceFactory.createCascadeDeletion(deleteCmd, pointIds, world);
      deleteCmd.commit();

      const plane = world.getProjectionPlaneById(planeId)!;
      pointIds.forEach(pointId => {
        expect(plane.getPoint(pointId)).toBeUndefined();
        expectActionRemoved(pointId);
      });
      expect(deleteCmd.operations.map(op => op.type)).toEqual([
        'RemovePoint2D',
        'RemovePoint2D',
        'RemovePoint2D',
        'RemoveActionFromProcessTree',
        'RemoveActionFromProcessTree',
        'RemoveActionFromProcessTree'
      ]);
    });

    it('should support undo and redo for dependency-driven cascade deletion', () => {
      const setupCmd = new Command('Setup line', world);
      const p1Result = setupCmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(100, 200, 1)));
      const p2Result = setupCmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(300, 400, 1)));
      const point1Id = p1Result.outputs.pointId!;
      const point2Id = p2Result.outputs.pointId!;
      const lineResult = setupCmd.addAndExecute(new AddLine2DByTwoPointsOp(planeId, point1Id, point2Id));
      const lineId = lineResult.outputs.lineId!;

      addExplicitProcessAction(createPointAction(point1Id));
      addExplicitProcessAction(createPointAction(point2Id));
      addExplicitProcessAction(createLineAction(lineId));
      world.getDependencyRegistrar().registerNode(lineId, [point1Id, point2Id]);
      setupCmd.commit();
      commandStack.push(setupCmd);

      const deleteCmd = new Command('Delete point with cascade', world);
      DeletionSequenceFactory.createCascadeDeletion(deleteCmd, [point1Id], world);
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
      const setupCmd = new Command('Setup segment', world);
      const p1Result = setupCmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(100, 200, 1)));
      const p2Result = setupCmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(300, 400, 1)));
      const point1Id = p1Result.outputs.pointId!;
      const point2Id = p2Result.outputs.pointId!;
      const segmentResult = setupCmd.addAndExecute(new AddSegment2DByPointsOp(planeId, point1Id, point2Id));
      const segmentId = segmentResult.outputs.segmentId!;

      addExplicitProcessAction(createPointAction(point1Id));
      addExplicitProcessAction(createPointAction(point2Id));
      addExplicitProcessAction(createSegmentAction(segmentId));
      world.getDependencyRegistrar().registerNode(segmentId, [point1Id, point2Id]);
      setupCmd.commit();

      const deleteCmd = new Command('Delete segment', world);
      DeletionSequenceFactory.createCascadeDeletion(deleteCmd, [segmentId], world);
      deleteCmd.commit();

      const plane = world.getProjectionPlaneById(planeId)!;
      expect(plane.getLine(segmentId)).toBeUndefined();
      expect(plane.getPoint(point1Id)).toBeDefined();
      expect(plane.getPoint(point2Id)).toBeDefined();
      expectActionRemoved(segmentId);
      expectActionPresent(point1Id);
      expectActionPresent(point2Id);
      expect(deleteCmd.operations.map(op => op.type)).toEqual([
        'RemoveSegment2D',
        'RemoveActionFromProcessTree'
      ]);
    });
  });
});

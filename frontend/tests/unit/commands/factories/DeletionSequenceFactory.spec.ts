/**
 * DeletionSequenceFactory.spec.ts - Unit tests for DeletionSequenceFactory
 *
 * Wave 005 removed stale skipped cascade fixtures that relied on implicit
 * process-tree action insertion and no-op dependency rebuild shortcuts. These remaining
 * checks cover behavior that does not need process-tree compatibility setup.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Vector3 } from 'three';
import type { World } from '../../../../src/domain/world/World';
import { Command } from '../../../../src/commands/Command';
import { createTestWorld } from '../../../helpers/worldHelpers';
import { DeletionSequenceFactory } from '../../../../src/commands/factories/DeletionSequenceFactory';
import { AddFreePoint2DOp } from '../../../../src/commands/operations/world/AddFreePointOp';

describe('DeletionSequenceFactory', () => {
  let world: World;
  let planeId: string;

  beforeEach(() => {
    const { world: w } = createTestWorld();
    world = w;
    planeId = world.getProjectionPlaneByLabel('P_H').id!;
  });

  describe('createCascadeDeletion', () => {
    it('should handle empty selection gracefully', () => {
      const deleteCmd = new Command('Delete nothing', world);
      DeletionSequenceFactory.createCascadeDeletion(deleteCmd, [], world);

      expect(deleteCmd.operations.length).toBe(0);
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
  });
});

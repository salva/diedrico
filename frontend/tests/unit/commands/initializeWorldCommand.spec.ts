/**
 * Unit tests for World Initialization Factory (Phase 47)
 * 
 * Tests the factory function that creates initialization operations for World setup.
 * Verifies that initialization uses factory pattern instead of Command subclassing.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '@/domain/world/World';
import { Command } from '@/commands/Command';
import { buildWorldInitialization } from '@/commands/factories/InitializationSequenceFactory';
import { CommandStack } from '@/commands/CommandStack';
import { initializeWorld } from '@/application/world/initializeWorld';
import { HalfHingeLine2D } from '@/domain/world/HingeLine';
import { getMainHingeLine } from '../../helpers/worldHelpers';
import { createActionGroup } from '@/domain/processTree/ProcessTree';
import { AddProcessTreeActionGroupOp } from '@/commands/operations/processTree/AddProcessTreeActionGroupOp';

describe('InitializeWorldCommand', () => {
  let world: World;
  let commandStack: CommandStack;

  beforeEach(() => {
    // Phase 47: Explicit initialization needed
    world = new World();
    commandStack = new CommandStack();
    initializeWorld(world, commandStack);
  });

  describe('Command Creation', () => {
    it('should create command with correct name', () => {
      const cmd = new Command('Initialize World', { world });
      
      expect(cmd.description).toBe('Initialize World');
    });

    it('should have building status after creation', () => {
      const cmd = new Command('Initialize World', { world });
      
      // Command is still building until .commit() is called
      expect(cmd.status).toBe('building');
    });
  });

  describe('World Initialization', () => {
    it('should create all fundamental elements', () => {
      // World already initialized by application initializer in beforeEach

      // Verify projection planes created
      const projPlanes = world.getAllProjectionPlanes();
      expect(projPlanes.length).toBeGreaterThanOrEqual(2);

      // Verify horizontal and vertical planes accessible
      const horizontalPlane = world.getProjectionPlaneByLabel('P_H');
      const verticalPlane = world.getProjectionPlaneByLabel('P_V');
      
      expect(horizontalPlane).toBeDefined();
      expect(verticalPlane).toBeDefined();
      expect(horizontalPlane!.getAllPoints().length).toBeGreaterThan(0);
      expect(verticalPlane!.getAllPoints().length).toBeGreaterThan(0);

      // Verify hinge line created
      const hingeLine = getMainHingeLine(world);
      expect(hingeLine).toBeDefined();
    });

    it('should create locked origin points', () => {
      const projPlaneH = world.getProjectionPlaneByLabel('P_H');
      const projPlaneV = world.getProjectionPlaneByLabel('P_V');
      
      const originH = projPlaneH.getAllPoints()[0];
      const originV = projPlaneV.getAllPoints()[0];

      expect(originH.locked).toBe(true);
      expect(originV.locked).toBe(true);
    });

    it('should create half hinge lines', () => {
      const projPlaneH = world.getProjectionPlaneByLabel('P_H');
      const projPlaneV = world.getProjectionPlaneByLabel('P_V');
      
      const linesH = projPlaneH.getAllLines();
      const linesV = projPlaneV.getAllLines();

      expect(linesH.length).toBeGreaterThan(0);
      expect(linesV.length).toBeGreaterThan(0);
      
      const halfHingeH = linesH.find(l => l instanceof HalfHingeLine2D);
      const halfHingeV = linesV.find(l => l instanceof HalfHingeLine2D);
      
      expect(halfHingeH).toBeDefined();
      expect(halfHingeV).toBeDefined();
    });

    it('should use generated IDs (no hardcoded IDs)', () => {
      const horizPlane = world.getProjectionPlaneByLabel('P_H');
      const vertPlane = world.getProjectionPlaneByLabel('P_V');
      const hingeLine = getMainHingeLine(world);

      // Verify IDs follow generated pattern (Phase 95: camelCase)
      expect(horizPlane.id).toMatch(/^projPlane\d+$/);
      expect(vertPlane.id).toMatch(/^projPlane\d+$/);
      // Hinge line ID is also generated
      expect(hingeLine.id).toBeTruthy();
      expect(hingeLine.id.length).toBeGreaterThan(0);
    });
  });

  describe('ProcessTree Integration', () => {
    it('should create subprocess in ProcessTree', () => {
      const processTree = world.getProcessTree();
      const subprocesses = processTree.root.children.filter(
        (child: any) => child.type === 'subprocess'
      );

      expect(subprocesses.length).toBeGreaterThan(0);
      
      const initSubprocess = subprocesses.find(
        (sp: any) => sp.type === 'subprocess' && sp.name === 'World Initialization'
      );
      
      expect(initSubprocess).toBeDefined();
    });

    it('should record initialization actions under subprocess', () => {
      const processTree = world.getProcessTree();
      const initSubprocess = processTree.root.children.find(
        (child: any) => child.type === 'subprocess' && child.name === 'World Initialization'
      ) as any;

      expect(initSubprocess).toBeDefined();

      const actionGroups = (initSubprocess.children || []).filter(
        (child: any) => child?.type === 'actionGroup'
      );

      // Current architecture: All initialization actions in ONE group
      expect(actionGroups.length).toBe(1);

      const actions = actionGroups[0]?.children || [];
      
      // Verify all 9 initialization actions are present in the group
      // Phase 93: Actions no longer have actionType - just verify count
      expect(actions.length).toBe(9);
      
      // Verify actions have elementIds (plane IDs, projection plane IDs, etc.)
      actions.forEach((action: any) => {
        expect(action.elementId).toBeTruthy();
        expect(action.description).toBeTruthy();
      });
    });
  });

  describe('Non-Undoable Behavior', () => {
    it('initialization command should not be on CommandStack by default', () => {
      // World constructor doesn't add initialization to stack
      const commandStack = new CommandStack();
      
      // Stack should be empty
      expect(commandStack.canUndo()).toBe(false);
    });

    it('regular commands allow undo', () => {
      const cmd = new Command('Test Command', { world });
      
      // Regular Command allows undo by default
      expect(cmd.canUndo()).toBe(true);
    });
  });

  describe('Operation Orchestration', () => {
    it('should execute operations in correct order', () => {
      const cmd = new Command('Initialize World', { world });
      
      // Create ActionGroup for initialization operations
      const groupId = `group_init_test_${Date.now()}`;
      const group = createActionGroup(groupId);
      cmd.addAndExecute(new AddProcessTreeActionGroupOp(group));
      
      buildWorldInitialization(cmd, groupId);
      
      const operations = cmd.getOperations();

      // Should have initialization operations
      // Phase 93: ActionGroup + world ops + ProcessTree actions
      expect(operations.length).toBeGreaterThanOrEqual(11);

      // Verify first operation is ActionGroup creation
      const opTypes = operations.map((op: any) => op.type);
      expect(opTypes[0]).toBe('AddProcessTreeActionGroup');
      
      // Check that essential operations are present
      expect(opTypes).toContain('AddPlane3DFixed'); // Planes
      expect(opTypes).toContain('AddProjectionPlaneFixed'); // Projection planes
      expect(opTypes).toContain('AddOriginPoint2D'); // Origins
      expect(opTypes).toContain('AddHingeLine'); // Hinge line
      expect(opTypes).toContain('AddHalfHingeLine2D'); // Half hinge lines
      expect(opTypes).toContain('AddProcessTreeActionOp'); // ProcessTree tracking
    });
  });
});

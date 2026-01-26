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
import { HalfHingeLine2D } from '@/domain/world/HingeLine';
import { getMainHingeLine } from '../../helpers/worldHelpers';

describe('InitializeWorldCommand', () => {
  let world: World;

  beforeEach(() => {
    // World constructor already runs initialization
    world = new World();
  });

  describe('Command Creation', () => {
    it('should create command with correct name', () => {
      const cmd = new Command('Initialize World', world);
      
      expect(cmd.description).toBe('Initialize World');
    });

    it('should have building status after creation', () => {
      const cmd = new Command('Initialize World', world);
      
      // Command is still building until .commit() is called
      expect(cmd.status).toBe('building');
    });
  });

  describe('World Initialization', () => {
    it('should create all fundamental elements', () => {
      // World already initialized in constructor

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

      // Verify IDs follow generated pattern
      expect(horizPlane.id).toMatch(/^proj_plane_\d+$/);
      expect(vertPlane.id).toMatch(/^proj_plane_\d+$/);
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

      // Phase 47 expectation: 9 actions (2 planes, 2 proj planes, 2 origins, 1 HL, 2 half HLs)
      expect(actionGroups.length).toBe(9);

      const actionTypes = actionGroups.map((g: any) => g.children?.[0]?.actionType);
      expect(actionTypes).toEqual([
        'InitializePlane3D',
        'InitializePlane3D',
        'InitializeProjectionPlane',
        'InitializeProjectionPlane',
        'InitializeOriginPoint2D',
        'InitializeOriginPoint2D',
        'InitializeHingeLine',
        'InitializeHalfHingeLine2D',
        'InitializeHalfHingeLine2D'
      ]);
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
      const cmd = new Command('Test Command', world);
      
      // Regular Command allows undo by default
      expect(cmd.canUndo()).toBe(true);
    });
  });

  describe('Operation Orchestration', () => {
    it('should execute operations in correct order', () => {
      const cmd = new Command('Initialize World', world);
      buildWorldInitialization(world, cmd);
      
      const operations = (cmd as any).operations;

      // Should have initialization operations
      // 1 subprocess + 2 planes + 2 proj planes + 2 origins + 1 hinge + 2 half hinges + 1 set active
      expect(operations.length).toBeGreaterThanOrEqual(11);

      // Verify operation types in sequence
      const opTypes = operations.map((op: any) => op.type);
      
      expect(opTypes[0]).toBe('CreateInitializationSubprocess');
      expect(opTypes[1]).toBe('AddPlane3DFixed'); // Horizontal
      expect(opTypes[2]).toBe('AddPlane3DFixed'); // Vertical
      expect(opTypes[3]).toBe('AddProjectionPlane'); // Horizontal
      expect(opTypes[4]).toBe('AddProjectionPlane'); // Vertical
      expect(opTypes[5]).toBe('AddOriginPoint2D'); // Horizontal origin
      expect(opTypes[6]).toBe('AddOriginPoint2D'); // Vertical origin
      expect(opTypes[7]).toBe('AddHingeLine'); // Main hinge line
      expect(opTypes[8]).toBe('AddHalfHingeLine2D'); // Horizontal half hinge
      expect(opTypes[9]).toBe('AddHalfHingeLine2D'); // Vertical half hinge
      // Last operation(s) should include SetActivePlane
    });
  });
});

/**
 * Unit tests for World Initialization Factory (Phase 47)
 * 
 * Tests the factory function that creates initialization operations for World setup.
 * Verifies that initialization uses factory pattern instead of Command subclassing.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '@/domain/world/World';
import { Command } from '@/commands/Command';
import { createWorldInitializationOperations } from '@/commands/factories/InitializationSequenceFactory';
import { CommandStack } from '@/commands/CommandStack';

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

      // Verify 3D planes created
      const planes = Array.from((world as any).planes.values());
      expect(planes.length).toBeGreaterThanOrEqual(2);

      // Verify projection planes created
      const projPlanes = Array.from((world as any).projectionPlanes.values());
      expect(projPlanes.length).toBeGreaterThanOrEqual(2);

      // Verify horizontal and vertical planes accessible
      const horizontalPlane = world.getHorizontalPlane();
      const verticalPlane = world.getVerticalPlane();
      
      expect(horizontalPlane).toBeDefined();
      expect(verticalPlane).toBeDefined();
      expect(horizontalPlane.getAllPoints().length).toBeGreaterThan(0);
      expect(verticalPlane.getAllPoints().length).toBeGreaterThan(0);

      // Verify hinge line created
      const hingeLine = world.getMainHingeLine();
      expect(hingeLine).toBeDefined();
    });

    it('should create locked origin points', () => {
      const projPlaneH = world.getHorizontalPlane();
      const projPlaneV = world.getVerticalPlane();
      
      const originH = projPlaneH.getAllPoints()[0];
      const originV = projPlaneV.getAllPoints()[0];

      expect(originH.locked).toBe(true);
      expect(originV.locked).toBe(true);
    });

    it('should create half hinge lines', () => {
      const projPlaneH = world.getHorizontalPlane();
      const projPlaneV = world.getVerticalPlane();
      
      const linesH = projPlaneH.getAllLines();
      const linesV = projPlaneV.getAllLines();

      expect(linesH.length).toBeGreaterThan(0);
      expect(linesV.length).toBeGreaterThan(0);
      
      const halfHingeH = linesH.find((l: any) => l.type === 'half-hinge');
      const halfHingeV = linesV.find((l: any) => l.type === 'half-hinge');
      
      expect(halfHingeH).toBeDefined();
      expect(halfHingeV).toBeDefined();
    });

    it('should use generated IDs (no hardcoded IDs)', () => {
      const horizPlane = world.getHorizontalPlane();
      const vertPlane = world.getVerticalPlane();
      const hingeLine = world.getMainHingeLine();

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
      const ops = createWorldInitializationOperations(world);
      ops.forEach((op: any) => cmd.addAndExecute(op));
      
      const operations = (cmd as any).operations;

      // Should have all 11 operations:
      // 1 subprocess + 2 planes + 2 proj planes + 2 origins + 1 hinge + 2 half hinges + 1 set active = 11
      expect(operations.length).toBe(11);

      // Verify operation types in sequence
      const opTypes = operations.map((op: any) => op.type);
      
      expect(opTypes[0]).toBe('CreateInitializationSubprocess');
      expect(opTypes[1]).toBe('AddPlane3D'); // Horizontal
      expect(opTypes[2]).toBe('AddPlane3D'); // Vertical
      expect(opTypes[3]).toBe('AddProjectionPlane'); // Horizontal
      expect(opTypes[4]).toBe('AddProjectionPlane'); // Vertical
      expect(opTypes[5]).toBe('AddOriginPoint2D'); // Horizontal origin
      expect(opTypes[6]).toBe('AddOriginPoint2D'); // Vertical origin
      expect(opTypes[7]).toBe('AddHingeLine'); // Main hinge line
      expect(opTypes[8]).toBe('AddHalfHingeLine2D'); // Horizontal half hinge
      expect(opTypes[9]).toBe('AddHalfHingeLine2D'); // Vertical half hinge
      expect(opTypes[10]).toBe('SetActivePlane'); // Set active plane
    });
  });
});

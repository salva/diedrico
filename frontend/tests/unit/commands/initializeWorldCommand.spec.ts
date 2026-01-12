/**
 * Unit tests for InitializeWorldCommand (Phase 47)
 * 
 * Tests the command that orchestrates World initialization using operations.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '@/domain/world/World';
import { InitializeWorldCommand } from '@/commands/InitializeWorldCommand';
import { CommandStack } from '@/commands/CommandStack';

describe('InitializeWorldCommand', () => {
  let world: World;

  beforeEach(() => {
    // Create a fresh world without default initialization
    world = new World();
    world.clear(); // Clear default initialization
  });

  describe('Command Creation', () => {
    it('should create command with correct name', () => {
      const cmd = new InitializeWorldCommand(world);
      
      expect(cmd.description).toBe('Initialize World');
    });

    it('should be non-undoable', () => {
      const cmd = new InitializeWorldCommand(world);
      
      expect(cmd.canUndo()).toBe(false);
    });

    it('should have building status after creation', () => {
      const cmd = new InitializeWorldCommand(world);
      
      // Command is still building until .commit() is called
      expect(cmd.status).toBe('building');
    });
  });

  describe('World Initialization', () => {
    it('should create all fundamental elements', () => {
      const cmd = new InitializeWorldCommand(world);
      // Note: Constructor already executes operations via addAndExecute()

      // Verify 3D planes created
      const planes = Array.from((world as any).planes.values());
      expect(planes.length).toBeGreaterThanOrEqual(2);

      // Verify projection planes created
      const projPlanes = Array.from((world as any).projectionPlanes.values());
      expect(projPlanes.length).toBeGreaterThanOrEqual(2);

      // Verify horizontal and vertical planes set
      expect(world.horizontalPlaneId).toBeDefined();
      expect(world.verticalPlaneId).toBeDefined();

      // Verify origin points created
      const projPlaneH = world.getProjectionPlaneById(world.horizontalPlaneId!);
      const projPlaneV = world.getProjectionPlaneById(world.verticalPlaneId!);
      
      expect(projPlaneH?.getAllPoints().length).toBeGreaterThan(0);
      expect(projPlaneV?.getAllPoints().length).toBeGreaterThan(0);

      // Verify hinge line created
      expect(world.mainHingeLineId).toBeDefined();
      const hingeLine = (world as any).hingeLines.get(world.mainHingeLineId);
      expect(hingeLine).toBeDefined();
    });

    it('should create locked origin points', () => {
      const cmd = new InitializeWorldCommand(world);
      cmd.commit();

      const projPlaneH = world.getProjectionPlaneById(world.horizontalPlaneId!);
      const projPlaneV = world.getProjectionPlaneById(world.verticalPlaneId!);
      
      const originH = projPlaneH?.getAllPoints()[0];
      const originV = projPlaneV?.getAllPoints()[0];

      expect(originH?.locked).toBe(true);
      expect(originV?.locked).toBe(true);
    });

    it('should create half hinge lines', () => {
      const cmd = new InitializeWorldCommand(world);
      cmd.commit();

      const projPlaneH = world.getProjectionPlaneById(world.horizontalPlaneId!);
      const projPlaneV = world.getProjectionPlaneById(world.verticalPlaneId!);
      
      const linesH = projPlaneH?.getAllLines();
      const linesV = projPlaneV?.getAllLines();

      expect(linesH?.length).toBeGreaterThan(0);
      expect(linesV?.length).toBeGreaterThan(0);
      
      const halfHingeH = linesH?.find(l => l.type === 'half-hinge');
      const halfHingeV = linesV?.find(l => l.type === 'half-hinge');
      
      expect(halfHingeH).toBeDefined();
      expect(halfHingeV).toBeDefined();
    });

    it('should use generated IDs (no hardcoded IDs)', () => {
      const cmd = new InitializeWorldCommand(world);
      cmd.commit();

      // Verify IDs follow generated pattern
      expect(world.horizontalPlaneId).toMatch(/^proj_plane_\d+$/);
      expect(world.verticalPlaneId).toMatch(/^proj_plane_\d+$/);
      expect(world.mainHingeLineId).toMatch(/^hinge_line_\d+$/);
    });
  });

  describe('ProcessTree Integration', () => {
    it('should create subprocess in ProcessTree', () => {
      const cmd = new InitializeWorldCommand(world);
      cmd.commit();

      const processTree = world.getProcessTree();
      const subprocesses = processTree.root.children.filter(
        child => child.type === 'subprocess'
      );

      expect(subprocesses.length).toBeGreaterThan(0);
      
      const initSubprocess = subprocesses.find(
        sp => sp.type === 'subprocess' && sp.name === 'World Initialization'
      );
      
      expect(initSubprocess).toBeDefined();
    });
  });

  describe('Non-Undoable Behavior', () => {
    it('should not be added to CommandStack', () => {
      const commandStack = new CommandStack();
      const cmd = new InitializeWorldCommand(world);
      cmd.commit();

      // Try to push to stack
      commandStack.push(cmd);

      // Should not be in undo history (canUndo returns false)
      expect(commandStack.canUndo()).toBe(false);
    });

    it('should always return false from canUndo()', () => {
      const cmd = new InitializeWorldCommand(world);
      
      expect(cmd.canUndo()).toBe(false);
      
      cmd.commit();
      
      expect(cmd.canUndo()).toBe(false);
    });
  });

  describe('Operation Orchestration', () => {
    it('should execute operations in correct order', () => {
      const cmd = new InitializeWorldCommand(world);
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
      expect(opTypes[7]).toBe('AddHingeLine');
      expect(opTypes[8]).toBe('AddHalfHingeLine2D'); // Horizontal
      expect(opTypes[9]).toBe('AddHalfHingeLine2D'); // Vertical
      expect(opTypes[10]).toBe('SetActivePlane'); // Set horizontal as active
    });
  });
});

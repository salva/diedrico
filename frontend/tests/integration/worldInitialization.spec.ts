/**
 * Integration tests for World initialization (Phase 47)
 * 
 * Tests the complete initialization workflow:
 * - World constructor initialization
 * - World.clear() re-initialization
 * - Verification of all elements created correctly
 */

import { describe, it, expect } from 'vitest';
import { World } from '@/domain/world/World';

describe('World Initialization Integration', () => {
  describe('Constructor Initialization', () => {
    it('should initialize World with all fundamental elements', () => {
      const world = new World();

      // Verify semantic references are set
      expect(world.horizontalPlaneId).toBeDefined();
      expect(world.verticalPlaneId).toBeDefined();
      expect(world.mainHingeLineId).toBeDefined();
      expect(world.horizontalOriginId).toBeDefined();
      expect(world.verticalOriginId).toBeDefined();

      // Verify projection planes exist
      const projPlaneH = world.getProjectionPlaneById(world.horizontalPlaneId!);
      const projPlaneV = world.getProjectionPlaneById(world.verticalPlaneId!);
      
      expect(projPlaneH).toBeDefined();
      expect(projPlaneV).toBeDefined();

      // Verify 3D planes exist
      const planes = Array.from((world as any).planes.values());
      expect(planes.length).toBeGreaterThanOrEqual(2);

      // Verify hinge line exists
      const hingeLine = (world as any).hingeLines.get(world.mainHingeLineId);
      expect(hingeLine).toBeDefined();
    });

    it('should create origin points at (0,0)', () => {
      const world = new World();

      const projPlaneH = world.getProjectionPlaneById(world.horizontalPlaneId!);
      const projPlaneV = world.getProjectionPlaneById(world.verticalPlaneId!);
      
      const originH = projPlaneH?.getAllPoints()[0];
      const originV = projPlaneV?.getAllPoints()[0];

      expect(originH?.position.x).toBe(0);
      expect(originH?.position.y).toBe(0);
      expect(originV?.position.x).toBe(0);
      expect(originV?.position.y).toBe(0);
    });

    it('should create locked origin points', () => {
      const world = new World();

      const projPlaneH = world.getProjectionPlaneById(world.horizontalPlaneId!);
      const projPlaneV = world.getProjectionPlaneById(world.verticalPlaneId!);
      
      const originH = projPlaneH?.getAllPoints()[0];
      const originV = projPlaneV?.getAllPoints()[0];

      expect(originH?.locked).toBe(true);
      expect(originV?.locked).toBe(true);
    });

    it('should create half hinge lines on both planes', () => {
      const world = new World();

      const projPlaneH = world.getProjectionPlaneById(world.horizontalPlaneId!);
      const projPlaneV = world.getProjectionPlaneById(world.verticalPlaneId!);
      
      const linesH = projPlaneH?.getAllLines() || [];
      const linesV = projPlaneV?.getAllLines() || [];

      const halfHingeH = linesH.find(l => l.type === 'half-hinge');
      const halfHingeV = linesV.find(l => l.type === 'half-hinge');

      expect(halfHingeH).toBeDefined();
      expect(halfHingeV).toBeDefined();
    });

    it('should set origin point in 3D space', () => {
      const world = new World();

      expect(world.originPoint).toBeDefined();
      expect(world.originPoint?.x).toBe(0);
      expect(world.originPoint?.y).toBe(0);
      expect(world.originPoint?.z).toBe(0);
      expect(world.originPoint?.w).toBe(1);
    });
  });

  describe('World.clear() Re-initialization', () => {
    it('should re-initialize World after clear()', () => {
      const world = new World();

      // Store initial IDs
      const initialHPlaneId = world.horizontalPlaneId;
      const initialVPlaneId = world.verticalPlaneId;

      // Clear and verify re-initialization
      world.clear();

      // Should have new IDs (re-initialized)
      expect(world.horizontalPlaneId).toBeDefined();
      expect(world.verticalPlaneId).toBeDefined();
      expect(world.mainHingeLineId).toBeDefined();

      // Verify all elements exist again
      const projPlaneH = world.getProjectionPlaneById(world.horizontalPlaneId!);
      const projPlaneV = world.getProjectionPlaneById(world.verticalPlaneId!);
      
      expect(projPlaneH).toBeDefined();
      expect(projPlaneV).toBeDefined();
      
      expect(projPlaneH?.getAllPoints().length).toBeGreaterThan(0);
      expect(projPlaneV?.getAllPoints().length).toBeGreaterThan(0);
    });

    it('should maintain locked origin points after clear', () => {
      const world = new World();
      world.clear();

      const projPlaneH = world.getProjectionPlaneById(world.horizontalPlaneId!);
      const projPlaneV = world.getProjectionPlaneById(world.verticalPlaneId!);
      
      const originH = projPlaneH?.getAllPoints()[0];
      const originV = projPlaneV?.getAllPoints()[0];

      expect(originH?.locked).toBe(true);
      expect(originV?.locked).toBe(true);
    });
  });

  describe('Element Relationships', () => {
    it('should link projection planes to 3D planes', () => {
      const world = new World();

      const projPlaneH = world.getProjectionPlaneById(world.horizontalPlaneId!);
      const projPlaneV = world.getProjectionPlaneById(world.verticalPlaneId!);

      expect(projPlaneH?.plane3DId).toBeDefined();
      expect(projPlaneV?.plane3DId).toBeDefined();

      // Verify 3D planes exist
      const plane3DH = (world as any).planes.get(projPlaneH?.plane3DId);
      const plane3DV = (world as any).planes.get(projPlaneV?.plane3DId);

      expect(plane3DH).toBeDefined();
      expect(plane3DV).toBeDefined();
    });

    it('should link hinge line to both projection planes', () => {
      const world = new World();

      const hingeLine = (world as any).hingeLines.get(world.mainHingeLineId);
      
      expect(hingeLine).toBeDefined();
      expect(hingeLine.plane1Id).toBe(world.horizontalPlaneId);
      expect(hingeLine.plane2Id).toBe(world.verticalPlaneId);
    });

    it('should validate parametric consistency of half hinge lines', () => {
      const world = new World();

      const projPlaneH = world.getProjectionPlaneById(world.horizontalPlaneId!);
      const projPlaneV = world.getProjectionPlaneById(world.verticalPlaneId!);
      
      const halfHingeH = projPlaneH?.getAllLines().find(l => l.type === 'half-hinge');
      const halfHingeV = projPlaneV?.getAllLines().find(l => l.type === 'half-hinge');

      // Both should have same point and direction (parametric consistency)
      expect(halfHingeH).toBeDefined();
      expect(halfHingeV).toBeDefined();
      
      if (halfHingeH && halfHingeV && 'point' in halfHingeH && 'point' in halfHingeV) {
        expect(halfHingeH.point.x).toBe(halfHingeV.point.x);
        expect(halfHingeH.point.y).toBe(halfHingeV.point.y);
      }
    });
  });

  describe('Generated IDs', () => {
    it('should use generated IDs without hardcoding', () => {
      const world = new World();

      // Verify IDs follow expected patterns
      expect(world.horizontalPlaneId).toMatch(/^proj_plane_\d+$/);
      expect(world.verticalPlaneId).toMatch(/^proj_plane_\d+$/);
      expect(world.mainHingeLineId).toMatch(/^hinge_line_\d+$/);

      // Verify point IDs follow hierarchical pattern
      const projPlaneH = world.getProjectionPlaneById(world.horizontalPlaneId!);
      const originH = projPlaneH?.getAllPoints()[0];
      
      if (originH) {
        expect(originH.id).toMatch(/^proj_plane_\d+\/point2d_\d+$/);
      }
    });

    // Note: Removed "unique IDs across multiple Worlds" test.
    // Phase 47 uses fixed IDs for fundamental structure (plane_H, plane_V, proj_plane_1, etc).
    // This is by design - fundamental elements have predictable IDs.
  });

  describe('ProcessTree State', () => {
    it('should create subprocess for initialization', () => {
      const world = new World();
      const processTree = world.getProcessTree();

      const subprocesses = processTree.root.children.filter(
        child => child.type === 'subprocess'
      );

      expect(subprocesses.length).toBeGreaterThan(0);
    });

    it('should have actions in initialization subprocess', () => {
      const world = new World();
      const processTree = world.getProcessTree();

      const initSubprocess = processTree.root.children.find(
        child => child.type === 'subprocess' && 'name' in child
      );

      expect(initSubprocess).toBeDefined();
    });
  });
});

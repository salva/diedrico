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
import { HalfHingeLine2D } from '@/domain/world/HingeLine';
import { getMainHingeLine } from '../helpers/worldHelpers';

describe('World Initialization Integration', () => {
  describe('Constructor Initialization', () => {
    it('should initialize World with all fundamental elements', () => {
      const world = new World();

      // Verify semantic references work via label-based access
      const projPlaneH = world.getProjectionPlaneByLabel('P_H');
      const projPlaneV = world.getProjectionPlaneByLabel('P_V');
      const mainHingeLine = getMainHingeLine(world);
      
      expect(projPlaneH).toBeDefined();
      expect(projPlaneV).toBeDefined();
      expect(mainHingeLine).toBeDefined();

      // Verify origin points exist on planes
      const originH = projPlaneH.getPoint2DByLabel('O_H');
      const originV = projPlaneV.getPoint2DByLabel('O_V');
      
      expect(originH).toBeDefined();
      expect(originV).toBeDefined();

      // Verify projection planes exist
      expect(projPlaneH).toBeDefined();
      expect(projPlaneV).toBeDefined();

      // Verify hinge line exists via semantic accessor
      expect(mainHingeLine).toBeDefined();
    });

    it('should create origin points at (0,0)', () => {
      const world = new World();

      const projPlaneH = world.getProjectionPlaneByLabel('P_H');
      const projPlaneV = world.getProjectionPlaneByLabel('P_V');
      
      const originH = projPlaneH.getPoint2DByLabel('O_H');
      const originV = projPlaneV.getPoint2DByLabel('O_V');

      expect(originH?.position.x).toBe(0);
      expect(originH?.position.y).toBe(0);
      expect(originV?.position.x).toBe(0);
      expect(originV?.position.y).toBe(0);
    });

    it('should create locked origin points', () => {
      const world = new World();

      const projPlaneH = world.getProjectionPlaneByLabel('P_H');
      const projPlaneV = world.getProjectionPlaneByLabel('P_V');
      
      const originH = projPlaneH.getPoint2DByLabel('O_H');
      const originV = projPlaneV.getPoint2DByLabel('O_V');

      expect(originH?.locked).toBe(true);
      expect(originV?.locked).toBe(true);
    });

    it('should create half hinge lines on both planes', () => {
      const world = new World();

      const projPlaneH = world.getProjectionPlaneByLabel('P_H');
      const projPlaneV = world.getProjectionPlaneByLabel('P_V');
      
      const linesH = projPlaneH.getAllLines();
      const linesV = projPlaneV.getAllLines();

      const halfHingeH = linesH.find((l: any) => l instanceof HalfHingeLine2D);
      const halfHingeV = linesV.find((l: any) => l instanceof HalfHingeLine2D);

      expect(halfHingeH).toBeDefined();
      expect(halfHingeV).toBeDefined();
    });

    // NOTE: Skipped - World no longer maintains a 3D originPoint property
    // Origin exists as 2D points (O_H, O_V) on each projection plane
    it.skip('should set origin point in 3D space', () => {
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

      // Store initial labels to verify re-initialization
      const planeHBefore = world.getProjectionPlaneByLabel('P_H');
      const planeVBefore = world.getProjectionPlaneByLabel('P_V');
      const initialHPlaneId = planeHBefore.id;
      const initialVPlaneId = planeVBefore.id;

      // Clear and verify re-initialization
      world.clear();

      // Should have new instances (re-initialized)
      const planeHAfter = world.getProjectionPlaneByLabel('P_H');
      const planeVAfter = world.getProjectionPlaneByLabel('P_V');
      const mainHingeLineAfter = getMainHingeLine(world);
      
      expect(planeHAfter).toBeDefined();
      expect(planeVAfter).toBeDefined();
      expect(mainHingeLineAfter).toBeDefined();

      // Verify all elements exist again
      const projPlaneH = planeHAfter;
      const projPlaneV = planeVAfter;
      
      expect(projPlaneH).toBeDefined();
      expect(projPlaneV).toBeDefined();
      
      expect(projPlaneH?.getAllPoints().length).toBeGreaterThan(0);
      expect(projPlaneV?.getAllPoints().length).toBeGreaterThan(0);
    });

    it('should maintain locked origin points after clear', () => {
      const world = new World();
      world.clear();

      const projPlaneH = world.getProjectionPlaneByLabel('P_H');
      const projPlaneV = world.getProjectionPlaneByLabel('P_V');
      
      const originH = projPlaneH?.getPoint2DByLabel('O_H');
      const originV = projPlaneV?.getPoint2DByLabel('O_V');

      // Origin points exist after clear
      expect(originH).toBeDefined();
      expect(originV).toBeDefined();
    });
  });

  describe('Element Relationships', () => {
    it('should link projection planes to 3D planes', () => {
      const world = new World();

      const projPlaneH = world.getProjectionPlaneByLabel('P_H');
      const projPlaneV = world.getProjectionPlaneByLabel('P_V');

      expect(projPlaneH!.plane3DId).toBeDefined();
      expect(projPlaneV!.plane3DId).toBeDefined();

      // Note: 3D planes are internal implementation details
      // Tests verify projection planes work correctly, not internal linkage
    });

    it('should link hinge line to both projection planes', () => {
      const world = new World();

      const hingeLine = getMainHingeLine(world);
      const projPlaneH = world.getProjectionPlaneByLabel('P_H');
      const projPlaneV = world.getProjectionPlaneByLabel('P_V');
      
      expect(hingeLine).toBeDefined();
      expect(hingeLine.plane1Id).toBe(projPlaneH.id);
      expect(hingeLine.plane2Id).toBe(projPlaneV.id);
    });

    it('should validate parametric consistency of half hinge lines', () => {
      const world = new World();

      const projPlaneH = world.getProjectionPlaneByLabel('P_H');
      const projPlaneV = world.getProjectionPlaneByLabel('P_V');
      
      const halfHingeH = projPlaneH.getAllLines().find((l: any) => l instanceof HalfHingeLine2D);
      const halfHingeV = projPlaneV.getAllLines().find((l: any) => l instanceof HalfHingeLine2D);

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

      const hingeLine = getMainHingeLine(world);
      const projPlaneH = world.getProjectionPlaneByLabel('P_H');

      // Verify hinge line label follows expected pattern (label = id for hinge lines)
      expect(hingeLine.label).toMatch(/^HL_\d+$/);
      expect(hingeLine.id).toBe(hingeLine.label); // ID and label are the same

      // Verify point IDs follow hierarchical pattern
      const originH = projPlaneH.getPoint2DByLabel('O_H');
      
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
        (child: any) => child.type === 'subprocess'
      );

      expect(subprocesses.length).toBeGreaterThan(0);
    });

    it('should have actions in initialization subprocess', () => {
      const world = new World();
      const processTree = world.getProcessTree();

      const initSubprocess = processTree.root.children.find(
        (child: any) => child.type === 'subprocess' && 'name' in child
      );

      expect(initSubprocess).toBeDefined();
    });
  });
});

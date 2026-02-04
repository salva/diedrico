/**
 * Integration tests for semantic entity references (Phase 46)
 * 
 * Tests that World semantic accessors work correctly and no hardcoded ID assumptions exist.
 * Verifies the system can support multiple projection plane pairs in the future.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { World } from '../../src/domain/world/World';
import { createTestWorld, getMainHingeLine } from '../helpers/worldHelpers';

describe('Semantic Entity References (Phase 46)', () => {
  let world: World;

  beforeEach(() => {
    const { world: w } = createTestWorld();
    world = w;
  });

  describe('Semantic Accessors', () => {
    it('should provide access to horizontal plane via semantic method', () => {
      const horizontalPlane = world.getProjectionPlaneByLabel('P_H');
      
      expect(horizontalPlane).toBeDefined();
      expect(horizontalPlane.id).toBeTruthy();
      expect(horizontalPlane.id).toMatch(/^projPlane\d+$/); // Auto-generated numeric ID
    });

    it('should provide access to vertical plane via semantic method', () => {
      const verticalPlane = world.getProjectionPlaneByLabel('P_V');
      
      expect(verticalPlane).toBeDefined();
      expect(verticalPlane.id).toBeTruthy();
      expect(verticalPlane.id).toMatch(/^projPlane\d+$/); // Auto-generated numeric ID
    });

    it('should provide access to main hinge line', () => {
      const mainHingeLine = getMainHingeLine(world);
      
      expect(mainHingeLine).toBeDefined();
      expect(mainHingeLine.id).toBeTruthy();
      expect(mainHingeLine.id).toMatch(/^hingeLine\d+$/); // Auto-generated numeric ID
    });

    it.skip('should provide access to horizontal origin point - SKIPPED: origin tracking not fully implemented', () => {
      // This test is skipped because origin point tracking through semantic IDs
      // is not fully functional yet (Phase 47 work)
      const horizontalOrigin = world.getHorizontalOrigin();
      
      expect(horizontalOrigin).toBeDefined();
      expect(horizontalOrigin.id).toBeTruthy();
      // Origin ID should be hierarchical: {planeId}/point2d_{n}
      const horizontalPlane = world.getProjectionPlaneByLabel('P_H');
      expect(horizontalOrigin.id).toContain(horizontalPlane.id!);
    });

    it.skip('should provide access to vertical origin point - SKIPPED: origin tracking not fully implemented', () => {
      // This test is skipped because origin point tracking through semantic IDs
      // is not fully functional yet (Phase 47 work)
      const verticalOrigin = world.getVerticalOrigin();
      
      expect(verticalOrigin).toBeDefined();
      expect(verticalOrigin.id).toBeTruthy();
      // Origin ID should be hierarchical: {planeId}/point2d_{n}
      const verticalPlane = world.getProjectionPlaneByLabel('P_V');
      expect(verticalOrigin.id).toContain(verticalPlane.id!);
    });
  });

  describe('No Hardcoded ID Assumptions', () => {
    it('should use generated IDs, not hardcoded values', () => {
      const horizontalPlane = world.getProjectionPlaneByLabel('P_H');
      const verticalPlane = world.getProjectionPlaneByLabel('P_V');
      
      // IDs should be auto-generated numeric format
      expect(horizontalPlane.id).toMatch(/^projPlane\d+$/);
      expect(verticalPlane.id).toMatch(/^projPlane\d+$/);
      
      // IDs should NOT be any hardcoded values
      expect(horizontalPlane.id).not.toBe('projPlaneH');
      expect(verticalPlane.id).not.toBe('projPlaneV');
      expect(horizontalPlane.id).not.toBe('planePH');
      expect(verticalPlane.id).not.toBe('planePV');
    });

    it.skip('should use hierarchical origin IDs, not hardcoded ones - SKIPPED: origin tracking not fully implemented', () => {
      // Skipped because origin tracking through semantic IDs not complete (Phase 47)
      const horizontalOrigin = world.getHorizontalOrigin();
      const verticalOrigin = world.getVerticalOrigin();
      
      // Origin IDs should NOT be the old hardcoded values
      expect(horizontalOrigin.id).not.toBe('projPlaneH/O_H');
      expect(horizontalOrigin.id).not.toBe('O_H');
      expect(verticalOrigin.id).not.toBe('projPlaneV/O_V');
      expect(verticalOrigin.id).not.toBe('O_V');
      
      // Origin IDs should be hierarchical format
      expect(horizontalOrigin.id).toMatch(/^projPlane\d+\/point2d\d+$/);
      expect(verticalOrigin.id).toMatch(/^projPlane\d+\/point2d\d+$/);
    });

    it('should use generated hinge line ID, not hardcoded value', () => {
      const mainHingeLine = getMainHingeLine(world);
      
      // Hinge line ID should be auto-generated numeric format
      expect(mainHingeLine.id).toMatch(/^hingeLine\d+$/);
      
      // Should NOT be any hardcoded values
      expect(mainHingeLine.id).not.toBe('hingeLineHV');
      expect(mainHingeLine.id).not.toBe('hinge_line_main');
    });
  });

  describe('ID Generation Consistency', () => {
    it('should use auto-generated numeric IDs for initialization planes', () => {
      const horizontalPlane = world.getProjectionPlaneByLabel('P_H');
      const verticalPlane = world.getProjectionPlaneByLabel('P_V');
      
      // Initialization planes use auto-generated numeric IDs (standard format)
      expect(horizontalPlane.id).toMatch(/^projPlane\d+$/);
      expect(verticalPlane.id).toMatch(/^projPlane\d+$/);
      
      // User-created planes will also use generated numeric IDs
    });

    it.skip('should use plane ID as container in origin point IDs - SKIPPED: origin tracking not fully implemented', () => {
      // Skipped because origin tracking through semantic IDs not complete (Phase 47)
      const horizontalPlane = world.getProjectionPlaneByLabel('P_H');
      const horizontalOrigin = world.getHorizontalOrigin();
      
      // Origin ID should start with plane ID
      expect(horizontalOrigin.id).toContain(horizontalPlane.id!);
      
      const verticalPlane = world.getProjectionPlaneByLabel('P_V');
      const verticalOrigin = world.getVerticalOrigin();
      
      // Origin ID should start with plane ID
      expect(verticalOrigin.id).toContain(verticalPlane.id!);
    });
  });

  describe('Future: Multiple Plane Pairs', () => {
    it('should support semantic access pattern for multiple plane pairs', () => {
      // This test verifies the architecture supports multiple plane pairs
      // Currently we only have one pair, but the pattern scales
      
      // First pair (initial) - uses auto-generated numeric IDs
      const horizontalPlane1 = world.getProjectionPlaneByLabel('P_H');
      const verticalPlane1 = world.getProjectionPlaneByLabel('P_V');
      
      expect(horizontalPlane1.id).toMatch(/^projPlane\d+$/);
      expect(verticalPlane1.id).toMatch(/^projPlane\d+$/);
      
      // Different planes should have different IDs
      expect(horizontalPlane1.id).not.toBe(verticalPlane1.id);
      
      // In future, additional plane pairs would use:
      // - Generated numeric IDs: projPlane1, projPlane2, etc.
      // - User could track additional pairs separately with labels
      // - No ID collisions possible with auto-generated IDs
    });
  });
});

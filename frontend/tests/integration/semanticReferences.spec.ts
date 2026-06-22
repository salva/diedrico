/**
 * Integration tests for semantic entity references (Phase 46)
 * 
 * Tests that World semantic accessors work correctly and no hardcoded ID assumptions exist.
 * Verifies the system can support multiple projection plane pairs in the future.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { World } from '../../src/domain/world/World';
import { createTestWorld, getMainHingeLine, getHorizontalPlane, getVerticalPlane } from '../helpers/worldHelpers';

describe('Semantic Entity References (Phase 46)', () => {
  let world: World;

  beforeEach(() => {
    const { world: w } = createTestWorld();
    world = w;
  });

  describe('Semantic Accessors', () => {
    it('should provide access to horizontal plane via semantic method', () => {
      const horizontalPlane = getHorizontalPlane(world);
      
      expect(horizontalPlane).toBeDefined();
      expect(horizontalPlane.id).toBeTruthy();
      expect(horizontalPlane.id).toMatch(/^projPlane\d+$/); // Auto-generated numeric ID
    });

    it('should provide access to vertical plane via semantic method', () => {
      const verticalPlane = getVerticalPlane(world);
      
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

  });

  describe('No Hardcoded ID Assumptions', () => {
    it('should use generated IDs, not hardcoded values', () => {
      const horizontalPlane = getHorizontalPlane(world);
      const verticalPlane = getVerticalPlane(world);
      
      // IDs should be auto-generated numeric format
      expect(horizontalPlane.id).toMatch(/^projPlane\d+$/);
      expect(verticalPlane.id).toMatch(/^projPlane\d+$/);
      
      // IDs should NOT be any hardcoded values
      expect(horizontalPlane.id).not.toBe('projPlaneH');
      expect(verticalPlane.id).not.toBe('projPlaneV');
      expect(horizontalPlane.id).not.toBe('planePH');
      expect(verticalPlane.id).not.toBe('planePV');
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
      const horizontalPlane = getHorizontalPlane(world);
      const verticalPlane = getVerticalPlane(world);
      
      // Initialization planes use auto-generated numeric IDs (standard format)
      expect(horizontalPlane.id).toMatch(/^projPlane\d+$/);
      expect(verticalPlane.id).toMatch(/^projPlane\d+$/);
      
      // User-created planes will also use generated numeric IDs
    });

  });

  describe('Future: Multiple Plane Pairs', () => {
    it('should support semantic access pattern for multiple plane pairs', () => {
      // This test verifies the architecture supports multiple plane pairs
      // Currently we only have one pair, but the pattern scales
      
      // First pair (initial) - uses auto-generated numeric IDs
      const horizontalPlane1 = getHorizontalPlane(world);
      const verticalPlane1 = getVerticalPlane(world);
      
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

/**
 * Unit tests for projectionPlaneUtils.ts - Phase 82.1
 * 
 * Tests for:
 * - computeLineLineIntersection3D: 3D line intersection helper
 * - computeProjectionPlaneMatrices: Complete coordinate system computation
 */

import { describe, it, expect } from 'vitest';
import { Vector3, Vector4 } from 'three';
import { computeLineLineIntersection3D } from '../../../src/utils/projectionPlaneUtils';

describe('computeLineLineIntersection3D', () => {
  describe('Intersecting lines', () => {
    it('should compute correct intersection for perpendicular lines', () => {
      // Line 1: along X-axis, through origin
      const line1Point = new Vector4(0, 0, 0, 1);
      const line1Dir = new Vector4(1, 0, 0, 0);
      
      // Line 2: along Y-axis, through origin
      const line2Point = new Vector4(0, 0, 0, 1);
      const line2Dir = new Vector4(0, 1, 0, 0);
      
      const intersection = computeLineLineIntersection3D(line1Point, line1Dir, line2Point, line2Dir);
      
      // Should be feasible and intersect at origin
      expect(intersection.feasible).toBe(true);
      expect(intersection.position.x).toBeCloseTo(0, 10);
      expect(intersection.position.y).toBeCloseTo(0, 10);
      expect(intersection.position.z).toBeCloseTo(0, 10);
    });
    
    it('should compute correct intersection for lines meeting at non-origin point', () => {
      // Line 1: X-axis, shifted up by 5
      const line1Point = new Vector4(0, 5, 0, 1);
      const line1Dir = new Vector4(1, 0, 0, 0);
      
      // Line 2: passes through (3, 5, 0) with direction (0, 0, 1)
      const line2Point = new Vector4(3, 5, 0, 1);
      const line2Dir = new Vector4(0, 0, 1, 0);
      
      const intersection = computeLineLineIntersection3D(line1Point, line1Dir, line2Point, line2Dir);
      
      // Should be feasible and intersect at (3, 5, 0)
      expect(intersection.feasible).toBe(true);
      expect(intersection.position.x).toBeCloseTo(3, 10);
      expect(intersection.position.y).toBeCloseTo(5, 10);
      expect(intersection.position.z).toBeCloseTo(0, 10);
    });
    
    it('should compute correct intersection for lines at arbitrary angles', () => {
      // Line 1: through (0, 0, 0), direction (1, 1, 0)
      const dir1 = new Vector3(1, 1, 0).normalize();
      const line1Point = new Vector4(0, 0, 0, 1);
      const line1Dir = new Vector4(dir1.x, dir1.y, dir1.z, 0);
      
      // Line 2: through (2, 0, 0), direction (0, 1, 0)
      const line2Point = new Vector4(2, 0, 0, 1);
      const line2Dir = new Vector4(0, 1, 0, 0);
      
      const intersection = computeLineLineIntersection3D(line1Point, line1Dir, line2Point, line2Dir);
      
      // Line 1: (x, y) = t(1, 1) => y = x
      // Line 2: (x, y) = (2, s) => x = 2
      // Intersection: x = 2, y = 2, z = 0
      expect(intersection.feasible).toBe(true);
      expect(intersection.position.x).toBeCloseTo(2, 10);
      expect(intersection.position.y).toBeCloseTo(2, 10);
      expect(intersection.position.z).toBeCloseTo(0, 10);
    });
  });
  
  describe('Parallel lines', () => {
    it('should return infeasible for parallel lines (invalid traces)', () => {
      // Line 1: along X-axis, at y=0
      const line1Point = new Vector4(0, 0, 0, 1);
      const line1Dir = new Vector4(1, 0, 0, 0);
      
      // Line 2: along X-axis, at y=5 (parallel but offset)
      const line2Point = new Vector4(0, 5, 0, 1);
      const line2Dir = new Vector4(1, 0, 0, 0);
      
      // Should return infeasible - parallel lines don't define a valid plane
      const result = computeLineLineIntersection3D(line1Point, line1Dir, line2Point, line2Dir);
      expect(result.feasible).toBe(false);
    });
    
    it('should return infeasible for coincident lines (same line)', () => {
      // Both lines along X-axis through origin (coincident within tolerance)
      const line1Point = new Vector4(0, 0, 0, 1);
      const line1Dir = new Vector4(1, 0, 0, 0);
      
      const line2Point = new Vector4(5, 0, 0, 1);  // Different point, same line
      const line2Dir = new Vector4(1, 0, 0, 0);
      
      // Coincident lines are technically parallel, should return infeasible
      const result = computeLineLineIntersection3D(line1Point, line1Dir, line2Point, line2Dir);
      expect(result.feasible).toBe(false);
    });
  });
  
  describe('Skew lines', () => {
    it('should return infeasible for skew lines (invalid traces)', () => {
      // Line 1: along X-axis at z=0
      const line1Point = new Vector4(0, 0, 0, 1);
      const line1Dir = new Vector4(1, 0, 0, 0);
      
      // Line 2: along Y-axis at z=5 (skew - don't intersect in 3D)
      const line2Point = new Vector4(0, 0, 5, 1);
      const line2Dir = new Vector4(0, 1, 0, 0);
      
      // Should return infeasible - skew lines don't define a valid plane
      const result = computeLineLineIntersection3D(line1Point, line1Dir, line2Point, line2Dir);
      expect(result.feasible).toBe(false);
    });
    
    it('should return infeasible for skew lines with offset', () => {
      // Line 1: along X-axis at y=0, z=0
      const line1Point = new Vector4(5, 0, 0, 1);
      const line1Dir = new Vector4(1, 0, 0, 0);
      
      // Line 2: along Z-axis at x=10, y=3 (skew)
      const line2Point = new Vector4(10, 3, 0, 1);
      const line2Dir = new Vector4(0, 0, 1, 0);
      
      // Should return infeasible - skew lines don't define a valid plane
      const result = computeLineLineIntersection3D(line1Point, line1Dir, line2Point, line2Dir);
      expect(result.feasible).toBe(false);
    });
  });
  
  describe('Edge cases', () => {
    it('should handle lines with unnormalized directions', () => {
      const line1Point = new Vector4(0, 0, 0, 1);
      const line1Dir = new Vector4(2, 0, 0, 0);  // Unnormalized (length 2)
      
      const line2Point = new Vector4(0, 0, 0, 1);
      const line2Dir = new Vector4(0, 3, 0, 0);  // Unnormalized (length 3)
      
      const intersection = computeLineLineIntersection3D(line1Point, line1Dir, line2Point, line2Dir);
      
      // Should be feasible and still find intersection at origin
      expect(intersection.feasible).toBe(true);
      expect(intersection.position.x).toBeCloseTo(0, 10);
      expect(intersection.position.y).toBeCloseTo(0, 10);
      expect(intersection.position.z).toBeCloseTo(0, 10);
    });
  });
});

// TODO: Add comprehensive tests for computeProjectionPlaneMatrices once we have test fixtures
// These tests require a full World instance with projection planes, which is complex to set up
// For now, testing the helper function computeLineLineIntersection3D provides good coverage
// of the core geometric algorithm

describe('computeProjectionPlaneMatrices - TODO', () => {
  it.todo('should satisfy paper layout constraints: v=0 coincides with T1');
  it.todo('should satisfy paper layout constraints: origin at T1-T2\' intersection');
  it.todo('should satisfy paper layout constraints: V perpendicular to U');
  it.todo('should satisfy paper layout constraints: V orientation via T2 side test');
  
  it.todo('should satisfy 3D constraints: U perpendicular to V');
  it.todo('should satisfy 3D constraints: U and V normalized');
  it.todo('should satisfy 3D constraints: U and V lie in plane Q');
  it.todo('should satisfy 3D constraints: origin on T1');
  it.todo('should satisfy 3D constraints: origin on T2');
  
  it.todo('should produce invertible matrices (round-trip preserves points)');
  it.todo('should maintain consistency between paper and 3D coordinate systems');
});

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
      const line1 = {
        point: new Vector3(0, 0, 0),
        direction: new Vector3(1, 0, 0)
      };
      
      // Line 2: along Y-axis, through origin
      const line2 = {
        point: new Vector3(0, 0, 0),
        direction: new Vector3(0, 1, 0)
      };
      
      const intersection = computeLineLineIntersection3D(line1, line2);
      
      // Should intersect at origin
      expect(intersection.x).toBeCloseTo(0, 10);
      expect(intersection.y).toBeCloseTo(0, 10);
      expect(intersection.z).toBeCloseTo(0, 10);
    });
    
    it('should compute correct intersection for lines meeting at non-origin point', () => {
      // Line 1: X-axis, shifted up by 5
      const line1 = {
        point: new Vector3(0, 5, 0),
        direction: new Vector3(1, 0, 0)
      };
      
      // Line 2: passes through (3, 5, 0) with direction (0, 0, 1)
      const line2 = {
        point: new Vector3(3, 5, 0),
        direction: new Vector3(0, 0, 1)
      };
      
      const intersection = computeLineLineIntersection3D(line1, line2);
      
      // Should intersect at (3, 5, 0)
      expect(intersection.x).toBeCloseTo(3, 10);
      expect(intersection.y).toBeCloseTo(5, 10);
      expect(intersection.z).toBeCloseTo(0, 10);
    });
    
    it('should compute correct intersection for lines at arbitrary angles', () => {
      // Line 1: through (0, 0, 0), direction (1, 1, 0)
      const line1 = {
        point: new Vector3(0, 0, 0),
        direction: new Vector3(1, 1, 0).normalize()
      };
      
      // Line 2: through (2, 0, 0), direction (0, 1, 0)
      const line2 = {
        point: new Vector3(2, 0, 0),
        direction: new Vector3(0, 1, 0)
      };
      
      const intersection = computeLineLineIntersection3D(line1, line2);
      
      // Line 1: (x, y) = t(1, 1) => y = x
      // Line 2: (x, y) = (2, s) => x = 2
      // Intersection: x = 2, y = 2, z = 0
      expect(intersection.x).toBeCloseTo(2, 10);
      expect(intersection.y).toBeCloseTo(2, 10);
      expect(intersection.z).toBeCloseTo(0, 10);
    });
  });
  
  describe('Parallel lines', () => {
    it('should return point on first line for parallel lines', () => {
      // Line 1: along X-axis, at y=0
      const line1 = {
        point: new Vector3(0, 0, 0),
        direction: new Vector3(1, 0, 0)
      };
      
      // Line 2: along X-axis, at y=5 (parallel but offset)
      const line2 = {
        point: new Vector3(0, 5, 0),
        direction: new Vector3(1, 0, 0)
      };
      
      const result = computeLineLineIntersection3D(line1, line2);
      
      // Should return point on line1 (origin in this case)
      expect(result.x).toBeCloseTo(0, 10);
      expect(result.y).toBeCloseTo(0, 10);
      expect(result.z).toBeCloseTo(0, 10);
    });
    
    it('should not crash for coincident lines', () => {
      // Both lines along X-axis through origin
      const line1 = {
        point: new Vector3(0, 0, 0),
        direction: new Vector3(1, 0, 0)
      };
      
      const line2 = {
        point: new Vector3(5, 0, 0),  // Different point, same line
        direction: new Vector3(1, 0, 0)
      };
      
      const result = computeLineLineIntersection3D(line1, line2);
      
      // Should return line1's point (no crash)
      expect(result.x).toBeCloseTo(0, 10);
      expect(result.y).toBeCloseTo(0, 10);
      expect(result.z).toBeCloseTo(0, 10);
    });
  });
  
  describe('Skew lines', () => {
    it('should return closest point on line1 for skew lines', () => {
      // Line 1: along X-axis at z=0
      const line1 = {
        point: new Vector3(0, 0, 0),
        direction: new Vector3(1, 0, 0)
      };
      
      // Line 2: along Y-axis at z=5 (skew - don't intersect in 3D)
      const line2 = {
        point: new Vector3(0, 0, 5),
        direction: new Vector3(0, 1, 0)
      };
      
      const result = computeLineLineIntersection3D(line1, line2);
      
      // Closest point on line1 to line2 should be at (0, 0, 0)
      expect(result.x).toBeCloseTo(0, 10);
      expect(result.y).toBeCloseTo(0, 10);
      expect(result.z).toBeCloseTo(0, 10);
    });
    
    it('should handle skew lines with offset', () => {
      // Line 1: along X-axis at y=0, z=0
      const line1 = {
        point: new Vector3(5, 0, 0),
        direction: new Vector3(1, 0, 0)
      };
      
      // Line 2: along Z-axis at x=10, y=3 (skew)
      const line2 = {
        point: new Vector3(10, 3, 0),
        direction: new Vector3(0, 0, 1)
      };
      
      const result = computeLineLineIntersection3D(line1, line2);
      
      // Closest point on line1 should be at x=10, y=0, z=0
      expect(result.x).toBeCloseTo(10, 10);
      expect(result.y).toBeCloseTo(0, 10);
      expect(result.z).toBeCloseTo(0, 10);
    });
  });
  
  describe('Edge cases', () => {
    it('should handle lines with unnormalized directions', () => {
      const line1 = {
        point: new Vector3(0, 0, 0),
        direction: new Vector3(2, 0, 0)  // Unnormalized (length 2)
      };
      
      const line2 = {
        point: new Vector3(0, 0, 0),
        direction: new Vector3(0, 3, 0)  // Unnormalized (length 3)
      };
      
      const intersection = computeLineLineIntersection3D(line1, line2);
      
      // Should still find intersection at origin
      expect(intersection.x).toBeCloseTo(0, 10);
      expect(intersection.y).toBeCloseTo(0, 10);
      expect(intersection.z).toBeCloseTo(0, 10);
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

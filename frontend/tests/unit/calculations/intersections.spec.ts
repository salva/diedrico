/**
 * Unit tests for Intersections module
 * 
 * Tests geometric intersection calculations using homogeneous coordinates.
 * Validates cross product algorithm for line-line intersections.
 * 
 * Test coverage:
 * - Standard intersections (perpendicular, diagonal)
 * - Edge cases (parallel, coincident)
 * - Homogeneous coordinate correctness
 * - Numerical stability
 */

import { describe, it, expect } from 'vitest';
import { Vector3 } from 'three';
import { intersectLineLine, areLinesParallel } from '../../../src/domain/calculations/Intersections';
import { Line2DRealization } from '../../../src/domain/world/Line';

describe('Intersections', () => {
  describe('intersectLineLine', () => {
    it('should find intersection of perpendicular lines', () => {
      // Horizontal line through (0, 2): y = 2
      // Parametric: P(t) = (0, 2, 1) + t*(1, 0, 0)
      const line1 = new Line2DRealization(
        new Vector3(0, 2, 1),  // point
        new Vector3(1, 0, 0)   // direction (horizontal)
      );
      
      // Vertical line through (3, 0): x = 3
      // Parametric: P(t) = (3, 0, 1) + t*(0, 1, 0)
      const line2 = new Line2DRealization(
        new Vector3(3, 0, 1),  // point
        new Vector3(0, 1, 0)   // direction (vertical)
      );
      
      const result = intersectLineLine(line1, line2);
      
      expect(result.type).toBe('point');
      expect(result.point).not.toBeNull();
      expect(result.point!.x).toBeCloseTo(3, 6);
      expect(result.point!.y).toBeCloseTo(2, 6);
      expect(result.point!.z).toBe(1); // homogeneous coordinate
    });
    
    it('should find intersection of diagonal lines', () => {
      // Line 1: passing through (0, 0) with direction (1, 1)
      // Equation: y = x
      const line1 = new Line2DRealization(
        new Vector3(0, 0, 1),
        new Vector3(1, 1, 0).normalize()
      );
      
      // Line 2: passing through (0, 4) with direction (1, -1)
      // Equation: y = -x + 4
      const line2 = new Line2DRealization(
        new Vector3(0, 4, 1),
        new Vector3(1, -1, 0).normalize()
      );
      
      const result = intersectLineLine(line1, line2);
      
      // Intersection: y = x and y = -x + 4
      // x = -x + 4 => 2x = 4 => x = 2, y = 2
      expect(result.type).toBe('point');
      expect(result.point).not.toBeNull();
      expect(result.point!.x).toBeCloseTo(2, 6);
      expect(result.point!.y).toBeCloseTo(2, 6);
      expect(result.point!.z).toBe(1);
    });
    
    it('should detect parallel horizontal lines', () => {
      // Line 1: y = 2
      const line1 = new Line2DRealization(
        new Vector3(0, 2, 1),
        new Vector3(1, 0, 0)
      );
      
      // Line 2: y = 5 (parallel to line1)
      const line2 = new Line2DRealization(
        new Vector3(0, 5, 1),
        new Vector3(1, 0, 0)
      );
      
      const result = intersectLineLine(line1, line2);
      
      expect(result.type).toBe('parallel');
      expect(result.point).toBeNull();
      expect(result.message).toContain('parallel');
    });
    
    it('should detect parallel vertical lines', () => {
      // Line 1: x = 3
      const line1 = new Line2DRealization(
        new Vector3(3, 0, 1),
        new Vector3(0, 1, 0)
      );
      
      // Line 2: x = -2 (parallel to line1)
      const line2 = new Line2DRealization(
        new Vector3(-2, 0, 1),
        new Vector3(0, 1, 0)
      );
      
      const result = intersectLineLine(line1, line2);
      
      expect(result.type).toBe('parallel');
      expect(result.point).toBeNull();
    });
    
    it('should detect parallel diagonal lines', () => {
      // Line 1: y = x
      const line1 = new Line2DRealization(
        new Vector3(0, 0, 1),
        new Vector3(1, 1, 0).normalize()
      );
      
      // Line 2: y = x + 3 (parallel to line1)
      const line2 = new Line2DRealization(
        new Vector3(0, 3, 1),
        new Vector3(1, 1, 0).normalize()
      );
      
      const result = intersectLineLine(line1, line2);
      
      expect(result.type).toBe('parallel');
      expect(result.point).toBeNull();
    });
    
    it('should detect coincident lines', () => {
      // Line 1: y = 2x through (0, 0)
      const line1 = new Line2DRealization(
        new Vector3(0, 0, 1),
        new Vector3(1, 2, 0).normalize()
      );
      
      // Line 2: Same line through different point (1, 2)
      const line2 = new Line2DRealization(
        new Vector3(1, 2, 1),
        new Vector3(1, 2, 0).normalize()
      );
      
      const result = intersectLineLine(line1, line2);
      
      expect(result.type).toBe('coincident');
      expect(result.point).toBeNull();
      expect(result.message).toContain('coincident');
    });
    
    it('should handle lines with non-unit direction vectors', () => {
      // Line 1 with direction (2, 0) instead of normalized (1, 0)
      const line1 = new Line2DRealization(
        new Vector3(0, 1, 1),
        new Vector3(2, 0, 0)  // Not normalized
      );
      
      // Line 2 with direction (0, 3) instead of normalized (0, 1)
      const line2 = new Line2DRealization(
        new Vector3(4, 0, 1),
        new Vector3(0, 3, 0)  // Not normalized
      );
      
      const result = intersectLineLine(line1, line2);
      
      // Should still find correct intersection at (4, 1)
      expect(result.type).toBe('point');
      expect(result.point!.x).toBeCloseTo(4, 6);
      expect(result.point!.y).toBeCloseTo(1, 6);
    });
    
    it('should produce homogeneous points with z=1', () => {
      const line1 = new Line2DRealization(
        new Vector3(0, 0, 1),
        new Vector3(1, 0, 0)
      );
      
      const line2 = new Line2DRealization(
        new Vector3(5, 5, 1),
        new Vector3(0, 1, 0)
      );
      
      const result = intersectLineLine(line1, line2);
      
      expect(result.point).not.toBeNull();
      expect(result.point!.z).toBe(1); // Homogeneous coordinate
    });
    
    it('should handle intersection at origin', () => {
      // Line 1: y = x through origin
      const line1 = new Line2DRealization(
        new Vector3(0, 0, 1),
        new Vector3(1, 1, 0).normalize()
      );
      
      // Line 2: y = -x through origin
      const line2 = new Line2DRealization(
        new Vector3(0, 0, 1),
        new Vector3(1, -1, 0).normalize()
      );
      
      const result = intersectLineLine(line1, line2);
      
      expect(result.type).toBe('point');
      expect(result.point!.x).toBeCloseTo(0, 6);
      expect(result.point!.y).toBeCloseTo(0, 6);
    });
    
    it('should handle intersection with negative coordinates', () => {
      // Line 1: horizontal through y = -3
      const line1 = new Line2DRealization(
        new Vector3(0, -3, 1),
        new Vector3(1, 0, 0)
      );
      
      // Line 2: vertical through x = -5
      const line2 = new Line2DRealization(
        new Vector3(-5, 0, 1),
        new Vector3(0, 1, 0)
      );
      
      const result = intersectLineLine(line1, line2);
      
      expect(result.type).toBe('point');
      expect(result.point!.x).toBeCloseTo(-5, 6);
      expect(result.point!.y).toBeCloseTo(-3, 6);
    });
  });
  
  describe('areLinesParallel', () => {
    it('should detect parallel horizontal lines', () => {
      const line1 = new Line2DRealization(
        new Vector3(0, 1, 1),
        new Vector3(1, 0, 0)
      );
      
      const line2 = new Line2DRealization(
        new Vector3(0, 5, 1),
        new Vector3(1, 0, 0)
      );
      
      expect(areLinesParallel(line1, line2)).toBe(true);
    });
    
    it('should detect parallel vertical lines', () => {
      const line1 = new Line2DRealization(
        new Vector3(2, 0, 1),
        new Vector3(0, 1, 0)
      );
      
      const line2 = new Line2DRealization(
        new Vector3(-3, 0, 1),
        new Vector3(0, 1, 0)
      );
      
      expect(areLinesParallel(line1, line2)).toBe(true);
    });
    
    it('should detect non-parallel lines', () => {
      const line1 = new Line2DRealization(
        new Vector3(0, 0, 1),
        new Vector3(1, 0, 0)
      );
      
      const line2 = new Line2DRealization(
        new Vector3(0, 0, 1),
        new Vector3(0, 1, 0)
      );
      
      expect(areLinesParallel(line1, line2)).toBe(false);
    });
    
    it('should handle anti-parallel directions', () => {
      // Line 1: direction (1, 1)
      const line1 = new Line2DRealization(
        new Vector3(0, 0, 1),
        new Vector3(1, 1, 0).normalize()
      );
      
      // Line 2: direction (-1, -1) (opposite but parallel)
      const line2 = new Line2DRealization(
        new Vector3(5, 5, 1),
        new Vector3(-1, -1, 0).normalize()
      );
      
      expect(areLinesParallel(line1, line2)).toBe(true);
    });
  });
});

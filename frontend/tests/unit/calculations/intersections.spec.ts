/**
 * Unit tests for Intersections module
 * 
 * Tests geometric intersection calculations using homogeneous coordinates.
 * Validates:
 * - Line-line intersections (cross product algorithm)
 * - Line-circle intersections (quadratic formula)
 * - Circle-circle intersections (geometric formula)
 * 
 * Test coverage:
 * - Standard intersections (perpendicular, diagonal, tangent, secant)
 * - Edge cases (parallel, coincident, no intersection, multiple solutions)
 * - Homogeneous coordinate correctness
 * - Numerical stability
 */

import { describe, it, expect } from 'vitest';
import { Vector3 } from 'three';
import { 
  intersectLineLine, 
  areLinesParallel,
  intersectLineCircle,
  intersectCircleCircle
} from '../../../src/domain/calculations/Intersections';
import { Line2DRealization2D } from '../../../src/domain/world/Line';
import { Circle2DRealization2D } from '../../../src/domain/world/Circle';

describe('Intersections', () => {
  describe('intersectLineLine', () => {
    it('should find intersection of perpendicular lines', () => {
      // Horizontal line through (0, 2): y = 2
      // Parametric: P(t) = (0, 2, 1) + t*(1, 0, 0)
      const line1 = new Line2DRealization2D(
        new Vector3(0, 2, 1),  // point
        new Vector3(1, 0, 0)   // direction (horizontal)
      );
      
      // Vertical line through (3, 0): x = 3
      // Parametric: P(t) = (3, 0, 1) + t*(0, 1, 0)
      const line2 = new Line2DRealization2D(
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
      const line1 = new Line2DRealization2D(
        new Vector3(0, 0, 1),
        new Vector3(1, 1, 0).normalize()
      );
      
      // Line 2: passing through (0, 4) with direction (1, -1)
      // Equation: y = -x + 4
      const line2 = new Line2DRealization2D(
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
      const line1 = new Line2DRealization2D(
        new Vector3(0, 2, 1),
        new Vector3(1, 0, 0)
      );
      
      // Line 2: y = 5 (parallel to line1)
      const line2 = new Line2DRealization2D(
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
      const line1 = new Line2DRealization2D(
        new Vector3(3, 0, 1),
        new Vector3(0, 1, 0)
      );
      
      // Line 2: x = -2 (parallel to line1)
      const line2 = new Line2DRealization2D(
        new Vector3(-2, 0, 1),
        new Vector3(0, 1, 0)
      );
      
      const result = intersectLineLine(line1, line2);
      
      expect(result.type).toBe('parallel');
      expect(result.point).toBeNull();
    });
    
    it('should detect parallel diagonal lines', () => {
      // Line 1: y = x
      const line1 = new Line2DRealization2D(
        new Vector3(0, 0, 1),
        new Vector3(1, 1, 0).normalize()
      );
      
      // Line 2: y = x + 3 (parallel to line1)
      const line2 = new Line2DRealization2D(
        new Vector3(0, 3, 1),
        new Vector3(1, 1, 0).normalize()
      );
      
      const result = intersectLineLine(line1, line2);
      
      expect(result.type).toBe('parallel');
      expect(result.point).toBeNull();
    });
    
    it('should detect coincident lines', () => {
      // Line 1: y = 2x through (0, 0)
      const line1 = new Line2DRealization2D(
        new Vector3(0, 0, 1),
        new Vector3(1, 2, 0).normalize()
      );
      
      // Line 2: Same line through different point (1, 2)
      const line2 = new Line2DRealization2D(
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
      const line1 = new Line2DRealization2D(
        new Vector3(0, 1, 1),
        new Vector3(2, 0, 0)  // Not normalized
      );
      
      // Line 2 with direction (0, 3) instead of normalized (0, 1)
      const line2 = new Line2DRealization2D(
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
      const line1 = new Line2DRealization2D(
        new Vector3(0, 0, 1),
        new Vector3(1, 0, 0)
      );
      
      const line2 = new Line2DRealization2D(
        new Vector3(5, 5, 1),
        new Vector3(0, 1, 0)
      );
      
      const result = intersectLineLine(line1, line2);
      
      expect(result.point).not.toBeNull();
      expect(result.point!.z).toBe(1); // Homogeneous coordinate
    });
    
    it('should handle intersection at origin', () => {
      // Line 1: y = x through origin
      const line1 = new Line2DRealization2D(
        new Vector3(0, 0, 1),
        new Vector3(1, 1, 0).normalize()
      );
      
      // Line 2: y = -x through origin
      const line2 = new Line2DRealization2D(
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
      const line1 = new Line2DRealization2D(
        new Vector3(0, -3, 1),
        new Vector3(1, 0, 0)
      );
      
      // Line 2: vertical through x = -5
      const line2 = new Line2DRealization2D(
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
      const line1 = new Line2DRealization2D(
        new Vector3(0, 1, 1),
        new Vector3(1, 0, 0)
      );
      
      const line2 = new Line2DRealization2D(
        new Vector3(0, 5, 1),
        new Vector3(1, 0, 0)
      );
      
      expect(areLinesParallel(line1, line2)).toBe(true);
    });
    
    it('should detect parallel vertical lines', () => {
      const line1 = new Line2DRealization2D(
        new Vector3(2, 0, 1),
        new Vector3(0, 1, 0)
      );
      
      const line2 = new Line2DRealization2D(
        new Vector3(-3, 0, 1),
        new Vector3(0, 1, 0)
      );
      
      expect(areLinesParallel(line1, line2)).toBe(true);
    });
    
    it('should detect non-parallel lines', () => {
      const line1 = new Line2DRealization2D(
        new Vector3(0, 0, 1),
        new Vector3(1, 0, 0)
      );
      
      const line2 = new Line2DRealization2D(
        new Vector3(0, 0, 1),
        new Vector3(0, 1, 0)
      );
      
      expect(areLinesParallel(line1, line2)).toBe(false);
    });
    
    it('should handle anti-parallel directions', () => {
      // Line 1: direction (1, 1)
      const line1 = new Line2DRealization2D(
        new Vector3(0, 0, 1),
        new Vector3(1, 1, 0).normalize()
      );
      
      // Line 2: direction (-1, -1) (opposite but parallel)
      const line2 = new Line2DRealization2D(
        new Vector3(5, 5, 1),
        new Vector3(-1, -1, 0).normalize()
      );
      
      expect(areLinesParallel(line1, line2)).toBe(true);
    });
  });

  describe('intersectLineCircle', () => {
    it('should find secant intersection - horizontal line through circle center', () => {
      // Circle at origin with radius 5
      const circle = new Circle2DRealization2D(new Vector3(0, 0, 1), new Vector3(5, 0, 0));
      
      // Horizontal line through center: y = 0
      const line = new Line2DRealization2D(
        new Vector3(0, 0, 1),
        new Vector3(1, 0, 0)
      );
      
      const result = intersectLineCircle(line, circle);
      
      expect(result.type).toBe('secant');
      expect(result.points).toHaveLength(2);
      
      // Intersection points should be at (-5, 0) and (5, 0)
      const x1 = result.points[0].x;
      const x2 = result.points[1].x;
      expect(Math.min(x1, x2)).toBeCloseTo(-5, 6);
      expect(Math.max(x1, x2)).toBeCloseTo(5, 6);
      expect(result.points[0].y).toBeCloseTo(0, 6);
      expect(result.points[1].y).toBeCloseTo(0, 6);
    });

    it('should find secant intersection - vertical line through circle center', () => {
      // Circle at (3, 2) with radius 4
      const circle = new Circle2DRealization2D(new Vector3(3, 2, 1), new Vector3(4, 0, 0));
      
      // Vertical line through center: x = 3
      const line = new Line2DRealization2D(
        new Vector3(3, 0, 1),
        new Vector3(0, 1, 0)
      );
      
      const result = intersectLineCircle(line, circle);
      
      expect(result.type).toBe('secant');
      expect(result.points).toHaveLength(2);
      
      // Intersection points should be at (3, -2) and (3, 6)
      const y1 = result.points[0].y;
      const y2 = result.points[1].y;
      expect(Math.min(y1, y2)).toBeCloseTo(-2, 6);
      expect(Math.max(y1, y2)).toBeCloseTo(6, 6);
      expect(result.points[0].x).toBeCloseTo(3, 6);
      expect(result.points[1].x).toBeCloseTo(3, 6);
    });

    it('should find tangent intersection', () => {
      // Circle at origin with radius 3
      const circle = new Circle2DRealization2D(new Vector3(0, 0, 1), new Vector3(3, 0, 0));
      
      // Horizontal line tangent at top: y = 3
      const line = new Line2DRealization2D(
        new Vector3(0, 3, 1),
        new Vector3(1, 0, 0)
      );
      
      const result = intersectLineCircle(line, circle);
      
      expect(result.type).toBe('tangent');
      expect(result.points).toHaveLength(1);
      expect(result.points[0].x).toBeCloseTo(0, 6);
      expect(result.points[0].y).toBeCloseTo(3, 6);
      expect(result.points[0].z).toBe(1);
    });

    it('should detect no intersection - line too far', () => {
      // Circle at origin with radius 2
      const circle = new Circle2DRealization2D(new Vector3(0, 0, 1), new Vector3(2, 0, 0));
      
      // Horizontal line above circle: y = 5
      const line = new Line2DRealization2D(
        new Vector3(0, 5, 1),
        new Vector3(1, 0, 0)
      );
      
      const result = intersectLineCircle(line, circle);
      
      expect(result.type).toBe('none');
      expect(result.points).toHaveLength(0);
    });

    it('should find diagonal secant intersection', () => {
      // Circle at origin with radius sqrt(2)
      const circle = new Circle2DRealization2D(new Vector3(0, 0, 1), new Vector3(Math.sqrt(2), 0, 0));
      
      // Diagonal line: y = x (passes through origin)
      const line = new Line2DRealization2D(
        new Vector3(0, 0, 1),
        new Vector3(1, 1, 0).normalize()
      );
      
      const result = intersectLineCircle(line, circle);
      
      expect(result.type).toBe('secant');
      expect(result.points).toHaveLength(2);
      
      // Points should be at (-1, -1) and (1, 1)
      // Distance from origin: sqrt(1^2 + 1^2) = sqrt(2) = radius
      for (const point of result.points) {
        const dist = Math.sqrt(point.x * point.x + point.y * point.y);
        expect(dist).toBeCloseTo(Math.sqrt(2), 6);
        expect(point.x).toBeCloseTo(point.y, 6); // On line y=x
      }
    });

    it('should handle circle offset from origin', () => {
      // Circle at (10, -5) with radius 7
      const circle = new Circle2DRealization2D(new Vector3(10, -5, 1), new Vector3(7, 0, 0));
      
      // Vertical line through center: x = 10
      const line = new Line2DRealization2D(
        new Vector3(10, 0, 1),
        new Vector3(0, 1, 0)
      );
      
      const result = intersectLineCircle(line, circle);
      
      expect(result.type).toBe('secant');
      expect(result.points).toHaveLength(2);
      
      // Intersection at (10, -5±7) = (10, -12) and (10, 2)
      const y1 = result.points[0].y;
      const y2 = result.points[1].y;
      expect(Math.min(y1, y2)).toBeCloseTo(-12, 6);
      expect(Math.max(y1, y2)).toBeCloseTo(2, 6);
    });

    it('should produce homogeneous points with z=1', () => {
      const circle = new Circle2DRealization2D(new Vector3(0, 0, 1), new Vector3(5, 0, 0));
      const line = new Line2DRealization2D(new Vector3(0, 0, 1), new Vector3(1, 0, 0));
      
      const result = intersectLineCircle(line, circle);
      
      for (const point of result.points) {
        expect(point.z).toBe(1);
      }
    });
  });

  describe('intersectCircleCircle', () => {
    it('should find secant intersection - circles of equal radius', () => {
      // Circle 1 at (-2, 0) with radius 3
      const circle1 = new Circle2DRealization2D(new Vector3(-2, 0, 1), new Vector3(3, 0, 0));
      
      // Circle 2 at (2, 0) with radius 3
      const circle2 = new Circle2DRealization2D(new Vector3(2, 0, 1), new Vector3(3, 0, 0));
      
      const result = intersectCircleCircle(circle1, circle2);
      
      expect(result.type).toBe('secant');
      expect(result.points).toHaveLength(2);
      
      // Intersection points should be on vertical line x=0
      expect(result.points[0].x).toBeCloseTo(0, 5);
      expect(result.points[1].x).toBeCloseTo(0, 5);
      
      // Check symmetry around x-axis
      expect(Math.abs(result.points[0].y)).toBeCloseTo(Math.abs(result.points[1].y), 5);
      
      // Verify points are on both circles
      for (const point of result.points) {
        const dist1 = Math.sqrt((point.x + 2)**2 + point.y**2);
        const dist2 = Math.sqrt((point.x - 2)**2 + point.y**2);
        expect(dist1).toBeCloseTo(3, 5);
        expect(dist2).toBeCloseTo(3, 5);
      }
    });

    it('should find external tangent intersection', () => {
      // Circle 1 at origin with radius 3
      const circle1 = new Circle2DRealization2D(new Vector3(0, 0, 1), new Vector3(3, 0, 0));
      
      // Circle 2 at (6, 0) with radius 3 - exactly touching
      const circle2 = new Circle2DRealization2D(new Vector3(6, 0, 1), new Vector3(3, 0, 0));
      
      const result = intersectCircleCircle(circle1, circle2);
      
      expect(result.type).toBe('tangent');
      expect(result.points).toHaveLength(1);
      expect(result.points[0].x).toBeCloseTo(3, 6);
      expect(result.points[0].y).toBeCloseTo(0, 6);
    });

    it('should find internal tangent intersection', () => {
      // Large circle at origin with radius 5
      const circle1 = new Circle2DRealization2D(new Vector3(0, 0, 1), new Vector3(5, 0, 0));
      
      // Small circle at (3, 0) with radius 2 - internally tangent
      const circle2 = new Circle2DRealization2D(new Vector3(3, 0, 1), new Vector3(2, 0, 0));
      
      const result = intersectCircleCircle(circle1, circle2);
      
      expect(result.type).toBe('tangent');
      expect(result.points).toHaveLength(1);
      expect(result.points[0].x).toBeCloseTo(5, 6);
      expect(result.points[0].y).toBeCloseTo(0, 6);
    });

    it('should detect no intersection - circles too far apart', () => {
      // Circle 1 at origin
      const circle1 = new Circle2DRealization2D(new Vector3(0, 0, 1), new Vector3(2, 0, 0));
      
      // Circle 2 far away
      const circle2 = new Circle2DRealization2D(new Vector3(10, 0, 1), new Vector3(3, 0, 0));
      
      const result = intersectCircleCircle(circle1, circle2);
      
      expect(result.type).toBe('none');
      expect(result.points).toHaveLength(0);
    });

    it('should detect no intersection - one circle inside the other', () => {
      // Large circle at origin
      const circle1 = new Circle2DRealization2D(new Vector3(0, 0, 1), new Vector3(10, 0, 0));
      
      // Small circle inside
      const circle2 = new Circle2DRealization2D(new Vector3(2, 0, 1), new Vector3(3, 0, 0));
      
      const result = intersectCircleCircle(circle1, circle2);
      
      expect(result.type).toBe('none');
      expect(result.points).toHaveLength(0);
    });

    it('should detect coincident circles', () => {
      // Same circle defined at same location
      const circle1 = new Circle2DRealization2D(new Vector3(5, 3, 1), new Vector3(4, 0, 0));
      const circle2 = new Circle2DRealization2D(new Vector3(5, 3, 1), new Vector3(4, 0, 0));
      
      const result = intersectCircleCircle(circle1, circle2);
      
      expect(result.type).toBe('coincident');
      expect(result.points).toHaveLength(0);
    });

    it('should find secant intersection - different radii', () => {
      // Circle 1 at origin with radius 5
      const circle1 = new Circle2DRealization2D(new Vector3(0, 0, 1), new Vector3(5, 0, 0));
      
      // Circle 2 at (4, 0) with radius 3
      const circle2 = new Circle2DRealization2D(new Vector3(4, 0, 1), new Vector3(3, 0, 0));
      
      const result = intersectCircleCircle(circle1, circle2);
      
      expect(result.type).toBe('secant');
      expect(result.points).toHaveLength(2);
      
      // Verify points are on both circles
      for (const point of result.points) {
        const dist1 = Math.sqrt(point.x**2 + point.y**2);
        const dist2 = Math.sqrt((point.x - 4)**2 + point.y**2);
        expect(dist1).toBeCloseTo(5, 5);
        expect(dist2).toBeCloseTo(3, 5);
      }
    });

    it('should handle circles in different quadrants', () => {
      // Circle 1 in quadrant II
      const circle1 = new Circle2DRealization2D(new Vector3(-3, 4, 1), new Vector3(2, 0, 0));
      
      // Circle 2 in quadrant IV
      const circle2 = new Circle2DRealization2D(new Vector3(2, -1, 1), new Vector3(6, 0, 0));
      
      const result = intersectCircleCircle(circle1, circle2);
      
      // Distance between centers: sqrt((2-(-3))^2 + (-1-4)^2) = sqrt(25+25) = sqrt(50) ≈ 7.07
      // r1 + r2 = 2 + 6 = 8 > 7.07, so they should intersect
      // |r1 - r2| = 4 < 7.07, so not one inside the other
      expect(result.type).toBe('secant');
      expect(result.points).toHaveLength(2);
    });

    it('should produce homogeneous points with z=1', () => {
      const circle1 = new Circle2DRealization2D(new Vector3(0, 0, 1), new Vector3(3, 0, 0));
      const circle2 = new Circle2DRealization2D(new Vector3(4, 0, 1), new Vector3(3, 0, 0));
      
      const result = intersectCircleCircle(circle1, circle2);
      
      for (const point of result.points) {
        expect(point.z).toBe(1);
      }
    });

    it('should handle vertical separation', () => {
      // Circle 1 at top
      const circle1 = new Circle2DRealization2D(new Vector3(0, 5, 1), new Vector3(3, 0, 0));
      
      // Circle 2 at bottom  
      const circle2 = new Circle2DRealization2D(new Vector3(0, -5, 1), new Vector3(3, 0, 0));
      
      const result = intersectCircleCircle(circle1, circle2);
      
      // Distance = 10, sum of radii = 6, so no intersection
      expect(result.type).toBe('none');
      expect(result.points).toHaveLength(0);
    });

    // ============================================================================
    // INTERSECTION ORDERING TESTS (Phase 33)
    // ============================================================================
    // Per data-model.md: Circle intersection points must be ordered by angle 
    // relative to the first circle's radius vector. Index 0 = smallest relative
    // angle (Δθ), measured counterclockwise from the radius vector.
    // 
    // Algorithm: Δθ = atan2(P.y - C.y, P.x - C.x) - atan2(R.y, R.x), normalized to [0, 2π)
    // ============================================================================

    describe('Circle-Circle Intersection Ordering (T325, Phase 72)', () => {
      /**
       * Helper function to compute signed angle from center line for circle-circle intersections.
       * Returns the angular position relative to the line connecting the two circle centers.
       * Positive values indicate counterclockwise from center line, negative values clockwise.
       */
      function computeSignedAngle(point: Vector3, circle1: Circle2DRealization2D, circle2: Circle2DRealization2D): number {
        const C1 = circle1.center;
        const C2 = circle2.center;
        
        // Angle of center line (C1 → C2)
        const theta_centerLine = Math.atan2(C2.y - C1.y, C2.x - C1.x);
        
        // Angle from C1 to intersection point
        const theta_I = Math.atan2(point.y - C1.y, point.x - C1.x);
        
        // Relative angle (signed)
        let deltaTheta = theta_I - theta_centerLine;
        
        // Normalize to [-π, π]
        while (deltaTheta > Math.PI) {
          deltaTheta -= 2 * Math.PI;
        }
        while (deltaTheta < -Math.PI) {
          deltaTheta += 2 * Math.PI;
        }
        
        return deltaTheta;
      }

      it('should order intersections by signed angle from horizontal center line', () => {
        // Circle 1: center at origin
        const circle1 = new Circle2DRealization2D(
          new Vector3(0, 0, 1),
          new Vector3(3, 0, 0)    // radius vector at 0°
        );
        
        // Circle 2: center at (4, 0), center line is horizontal
        const circle2 = new Circle2DRealization2D(
          new Vector3(4, 0, 1),
          new Vector3(3, 0, 0)
        );
        
        const result = intersectCircleCircle(circle1, circle2);
        
        expect(result.type).toBe('secant');
        expect(result.points).toHaveLength(2);
        
        // Compute signed angles from center line
        const angle0 = computeSignedAngle(result.points[0], circle1, circle2);
        const angle1 = computeSignedAngle(result.points[1], circle1, circle2);
        
        // Index 0 must have positive angle (counterclockwise from center line)
        // Index 1 must have negative angle (clockwise from center line)
        expect(angle0).toBeGreaterThan(0);
        expect(angle1).toBeLessThan(0);
        
        // Intersection points should be symmetric about x-axis (center line)
        expect(result.points[0].y).toBeGreaterThan(0); // Index 0 above center line
        expect(result.points[1].y).toBeLessThan(0);    // Index 1 below center line
      });

      it('should order intersections with vertical center line', () => {
        // Circle 1: center at (0, 0)
        const circle1 = new Circle2DRealization2D(
          new Vector3(0, 0, 1),
          new Vector3(3, 0, 0)
        );
        
        // Circle 2: center above circle1, center line is vertical
        const circle2 = new Circle2DRealization2D(
          new Vector3(0, 4, 1),
          new Vector3(3, 0, 0)
        );
        
        const result = intersectCircleCircle(circle1, circle2);
        
        expect(result.type).toBe('secant');
        expect(result.points).toHaveLength(2);
        
        const angle0 = computeSignedAngle(result.points[0], circle1, circle2);
        const angle1 = computeSignedAngle(result.points[1], circle1, circle2);
        
        // Index 0 positive (counterclockwise), index 1 negative (clockwise)
        expect(angle0).toBeGreaterThan(0);
        expect(angle1).toBeLessThan(0);
        
        // Points should be symmetric about y-axis (center line)
        expect(Math.abs(result.points[0].x)).toBeCloseTo(Math.abs(result.points[1].x), 5);
        // Left point (negative x) is counterclockwise from vertical upward line
        expect(result.points[0].x).toBeLessThan(0);
        expect(result.points[1].x).toBeGreaterThan(0);
      });

      it('should order intersections with diagonal center line (45°)', () => {
        // Circle 1: center at origin
        const circle1 = new Circle2DRealization2D(
          new Vector3(0, 0, 1),
          new Vector3(3, 0, 0)
        );
        
        // Circle 2: center at 45° from origin
        const circle2 = new Circle2DRealization2D(
          new Vector3(3, 3, 1),
          new Vector3(3, 0, 0)
        );
        
        const result = intersectCircleCircle(circle1, circle2);
        
        expect(result.type).toBe('secant');
        expect(result.points).toHaveLength(2);
        
        const angle0 = computeSignedAngle(result.points[0], circle1, circle2);
        const angle1 = computeSignedAngle(result.points[1], circle1, circle2);
        
        // Index 0 positive (counterclockwise), index 1 negative (clockwise)
        expect(angle0).toBeGreaterThan(0);
        expect(angle1).toBeLessThan(0);
      });

      it('should order intersections with diagonal center line (135°)', () => {
        // Circle 1: center at origin
        const circle1 = new Circle2DRealization2D(
          new Vector3(0, 0, 1),
          new Vector3(3, 0, 0)
        );
        
        // Circle 2: center at 135° from origin
        const circle2 = new Circle2DRealization2D(
          new Vector3(-3, 3, 1),
          new Vector3(3, 0, 0)
        );
        
        const result = intersectCircleCircle(circle1, circle2);
        
        expect(result.type).toBe('secant');
        expect(result.points).toHaveLength(2);
        
        const angle0 = computeSignedAngle(result.points[0], circle1, circle2);
        const angle1 = computeSignedAngle(result.points[1], circle1, circle2);
        
        // Index 0 positive (counterclockwise), index 1 negative (clockwise)
        expect(angle0).toBeGreaterThan(0);
        expect(angle1).toBeLessThan(0);
      });

      it('should order intersections with horizontal center line (circles reversed)', () => {
        // Test that ordering is independent of which circle is "first"
        // Circle 1 on right, Circle 2 on left (center line points left)
        const circle1 = new Circle2DRealization2D(
          new Vector3(4, 0, 1),
          new Vector3(3, 0, 0)
        );
        
        const circle2 = new Circle2DRealization2D(
          new Vector3(0, 0, 1),
          new Vector3(3, 0, 0)
        );
        
        const result = intersectCircleCircle(circle1, circle2);
        
        expect(result.type).toBe('secant');
        expect(result.points).toHaveLength(2);
        
        const angle0 = computeSignedAngle(result.points[0], circle1, circle2);
        const angle1 = computeSignedAngle(result.points[1], circle1, circle2);
        
        // Index 0 positive (counterclockwise), index 1 negative (clockwise)
        expect(angle0).toBeGreaterThan(0);
        expect(angle1).toBeLessThan(0);
        
        // Center line now points left, so counterclockwise from left is downward
        expect(result.points[0].y).toBeLessThan(0); // Index 0 below center line (counterclockwise from left)
        expect(result.points[1].y).toBeGreaterThan(0); // Index 1 above center line (clockwise from left)
      });

      it('should handle ordering with very small angular separation', () => {
        // Create circles where intersections are very close in angle
        const circle1 = new Circle2DRealization2D(
          new Vector3(0, 0, 1),
          new Vector3(5, 0, 0)
        );
        
        // Circle 2 offset slightly up
        const circle2 = new Circle2DRealization2D(
          new Vector3(8, 0.5, 1),
          new Vector3(5, 0, 0)
        );
        
        const result = intersectCircleCircle(circle1, circle2);
        
        if (result.type === 'secant') {
          expect(result.points).toHaveLength(2);
          
          const angle0 = computeSignedAngle(result.points[0], circle1, circle2);
          const angle1 = computeSignedAngle(result.points[1], circle1, circle2);
          
          // Even with small separation, ordering must be consistent
          expect(angle0).toBeGreaterThan(0);
          expect(angle1).toBeLessThan(0);
        }
      });

      it('should handle tangent case (single point on center line)', () => {
        // Two circles touching at exactly one point
        const circle1 = new Circle2DRealization2D(
          new Vector3(0, 0, 1),
          new Vector3(3, 0, 0)    // radius 3
        );
        
        const circle2 = new Circle2DRealization2D(
          new Vector3(6, 0, 1),   // distance = 6 = 3 + 3 (external tangent)
          new Vector3(3, 0, 0)    // radius 3
        );
        
        const result = intersectCircleCircle(circle1, circle2);
        
        expect(result.type).toBe('tangent');
        expect(result.points).toHaveLength(1);
        
        const angle = computeSignedAngle(result.points[0], circle1, circle2);
        
        // Tangent point should be on center line (angle ≈ 0)
        expect(Math.abs(angle)).toBeLessThan(1e-10);
        
        // Tangent point should be at (3, 0)
        expect(result.points[0].x).toBeCloseTo(3, 10);
        expect(result.points[0].y).toBeCloseTo(0, 10);
      });

      it('should handle internal tangent case', () => {
        // Small circle inside large circle, touching at one point
        const circle1 = new Circle2DRealization2D(
          new Vector3(0, 0, 1),
          new Vector3(5, 0, 0)    // radius 5
        );
        
        const circle2 = new Circle2DRealization2D(
          new Vector3(3, 0, 1),   // distance = 3, radius_diff = 2, so 3 = 5 - 2 (internal tangent)
          new Vector3(2, 0, 0)    // radius 2
        );
        
        const result = intersectCircleCircle(circle1, circle2);
        
        expect(result.type).toBe('tangent');
        expect(result.points).toHaveLength(1);
        
        const angle = computeSignedAngle(result.points[0], circle1, circle2);
        
        // Tangent point should be on center line (angle ≈ 0)
        expect(Math.abs(angle)).toBeLessThan(1e-10);
        
        // Tangent point should be at (5, 0)
        expect(result.points[0].x).toBeCloseTo(5, 10);
        expect(result.points[0].y).toBeCloseTo(0, 10);
      });

      it('should maintain consistent ordering across different circle configurations', () => {
        // Test multiple configurations to ensure consistency
        const testCases = [
          { c1: new Vector3(0, 0, 1), c2: new Vector3(4, 0, 1) },    // horizontal
          { c1: new Vector3(0, 0, 1), c2: new Vector3(0, 4, 1) },    // vertical
          { c1: new Vector3(0, 0, 1), c2: new Vector3(3, 3, 1) },    // diagonal 45°
          { c1: new Vector3(0, 0, 1), c2: new Vector3(-3, 3, 1) },   // diagonal 135°
          { c1: new Vector3(0, 0, 1), c2: new Vector3(-4, 0, 1) },   // horizontal left
          { c1: new Vector3(0, 0, 1), c2: new Vector3(0, -4, 1) },   // vertical down
        ];
        
        testCases.forEach(({ c1, c2 }) => {
          const circle1 = new Circle2DRealization2D(c1, new Vector3(3, 0, 0));
          const circle2 = new Circle2DRealization2D(c2, new Vector3(3, 0, 0));
          
          const result = intersectCircleCircle(circle1, circle2);
          
          if (result.type === 'secant') {
            const angle0 = computeSignedAngle(result.points[0], circle1, circle2);
            const angle1 = computeSignedAngle(result.points[1], circle1, circle2);
            
            // Invariant: index 0 always positive, index 1 always negative
            expect(angle0).toBeGreaterThan(0);
            expect(angle1).toBeLessThan(0);
          }
        });
      });
    });

    describe('Line-Circle Intersection Parameter-Based Ordering (T326, Phase 71)', () => {
      /**
       * Helper function to compute parameter s for a point on line L = P + s*V
       * For intersection point I: s = (I - P) · V / |V|²
       */
      function computeParameter(point: Vector3, line: Line2DRealization2D): number {
        const P = line.point1;
        const V = line.getDirection();
        const toPoint = point.clone().sub(P);
        return toPoint.dot(V) / V.lengthSq();
      }

      it('should order line-circle intersections by parameter along line direction', () => {
        // Circle: center at origin, radius 3
        const circle = new Circle2DRealization2D(
          new Vector3(0, 0, 1),
          new Vector3(3, 0, 0)
        );
        
        // Horizontal line through y=1, direction right (1, 0, 0)
        const line = new Line2DRealization2D(
          new Vector3(0, 1, 1),   // Point P on line
          new Vector3(1, 0, 0)    // Direction V (pointing right)
        );
        
        const result = intersectLineCircle(line, circle);
        
        expect(result.type).toBe('secant');
        expect(result.points).toHaveLength(2);
        
        // Compute parameters s₁ and s₂
        const s0 = computeParameter(result.points[0], line);
        const s1 = computeParameter(result.points[1], line);
        
        // Index 0 must have lesser parameter (earlier along direction)
        expect(s0).toBeLessThan(s1);
        
        // For this geometry: left intersection has negative s, right has positive s
        expect(s0).toBeLessThan(0);  // Index 0: left intersection (before P)
        expect(s1).toBeGreaterThan(0); // Index 1: right intersection (after P)
        expect(result.points[0].x).toBeLessThan(result.points[1].x); // Physical ordering matches
      });

      it('should order vertical line intersections by parameter', () => {
        // Circle: center at origin, radius 3
        const circle = new Circle2DRealization2D(
          new Vector3(0, 0, 1),
          new Vector3(3, 0, 0)
        );
        
        // Vertical line at x=1, direction up (0, 1, 0)
        const line = new Line2DRealization2D(
          new Vector3(1, 0, 1),   // Point P on line
          new Vector3(0, 1, 0)    // Direction V (pointing up)
        );
        
        const result = intersectLineCircle(line, circle);
        
        expect(result.type).toBe('secant');
        expect(result.points).toHaveLength(2);
        
        const s0 = computeParameter(result.points[0], line);
        const s1 = computeParameter(result.points[1], line);
        
        // Index 0 has lesser parameter
        expect(s0).toBeLessThan(s1);
        
        // Point with lesser y should be index 0 (earlier along upward direction from P at y=0)
        expect(result.points[0].y).toBeLessThan(result.points[1].y);
      });

      it('should order diagonal line intersections by parameter', () => {
        // Circle: center at origin, radius 3
        const circle = new Circle2DRealization2D(
          new Vector3(0, 0, 1),
          new Vector3(3 * Math.cos(Math.PI/4), 3 * Math.sin(Math.PI/4), 0)
        );
        
        // Diagonal line: y = -x + 1, direction (1, -1, 0) normalized
        const direction = new Vector3(1, -1, 0).normalize();
        const line = new Line2DRealization2D(
          new Vector3(0, 1, 1),   // Point P on line
          direction               // Direction V
        );
        
        const result = intersectLineCircle(line, circle);
        
        expect(result.type).toBe('secant');
        expect(result.points).toHaveLength(2);
        
        const s0 = computeParameter(result.points[0], line);
        const s1 = computeParameter(result.points[1], line);
        
        // Index 0 has lesser parameter
        expect(s0).toBeLessThan(s1);
      });

      it('should order intersections independent of circle radius orientation', () => {
        // Circle: radius pointing up (90°) - irrelevant for line-circle indexing
        const circle = new Circle2DRealization2D(
          new Vector3(0, 0, 1),
          new Vector3(0, 3, 0)
        );
        
        // Horizontal line: y = 1, direction right
        const line = new Line2DRealization2D(
          new Vector3(0, 1, 1),
          new Vector3(1, 0, 0)
        );
        
        const result = intersectLineCircle(line, circle);
        
        expect(result.type).toBe('secant');
        expect(result.points).toHaveLength(2);
        
        const s0 = computeParameter(result.points[0], line);
        const s1 = computeParameter(result.points[1], line);
        
        // Index 0 has lesser parameter (independent of circle's radius orientation)
        expect(s0).toBeLessThan(s1);
        // Left point has lesser s, right point has greater s
        expect(result.points[0].x).toBeLessThan(result.points[1].x);
      });

      it('should order intersections with different circle radius orientation', () => {
        // Circle: radius pointing left (180°) - still irrelevant for line-circle indexing
        const circle = new Circle2DRealization2D(
          new Vector3(0, 0, 1),
          new Vector3(-3, 0, 0)
        );
        
        // Horizontal line: y = 1, direction right
        const line = new Line2DRealization2D(
          new Vector3(0, 1, 1),
          new Vector3(1, 0, 0)
        );
        
        const result = intersectLineCircle(line, circle);
        
        expect(result.type).toBe('secant');
        expect(result.points).toHaveLength(2);
        
        const s0 = computeParameter(result.points[0], line);
        const s1 = computeParameter(result.points[1], line);
        
        // Index 0 has lesser parameter
        expect(s0).toBeLessThan(s1);
        // Ordering determined by line direction, not circle radius
        expect(result.points[0].x).toBeLessThan(result.points[1].x);
      });
    });

    describe('Line-Circle Intersection Edge Cases (Phase 71)', () => {
      function computeParameter(point: Vector3, line: Line2DRealization2D): number {
        const P = line.point1;
        const V = line.getDirection();
        const toPoint = point.clone().sub(P);
        return toPoint.dot(V) / V.lengthSq();
      }

      it('should handle intersections with negative parameters (before line origin)', () => {
        // Circle: center at origin, radius 3
        const circle = new Circle2DRealization2D(
          new Vector3(0, 0, 1),
          new Vector3(3, 0, 0)
        );
        
        // Line: starts at (5, 0), direction left (-1, 0)
        const line = new Line2DRealization2D(
          new Vector3(5, 0, 1),   // Point P (outside circle)
          new Vector3(-1, 0, 0)   // Direction V (pointing left toward circle)
        );
        
        const result = intersectLineCircle(line, circle);
        expect(result.type).toBe('secant');
        expect(result.points).toHaveLength(2);
        
        // Both intersections are to the left of P (positive s values along -x direction)
        const s0 = computeParameter(result.points[0], line);
        const s1 = computeParameter(result.points[1], line);
        
        expect(s0).toBeLessThan(s1);  // Index 0 still has lesser s
        expect(s0).toBeGreaterThan(0); // Closer intersection (s ≈ 2)
        expect(s1).toBeGreaterThan(s0); // Farther intersection (s ≈ 8)
        
        // Verify physical ordering: index 0 is closer to P
        const dist0 = result.points[0].distanceTo(new Vector3(5, 0, 1));
        const dist1 = result.points[1].distanceTo(new Vector3(5, 0, 1));
        expect(dist0).toBeLessThan(dist1);
      });

      it('should maintain index stability when line rotates', () => {
        const circle = new Circle2DRealization2D(
          new Vector3(0, 0, 1),
          new Vector3(3, 0, 0)
        );
        
        // Test with multiple line orientations
        const angles = [0, 45, 90, 135, 180, 225, 270, 315];
        
        for (const angleDeg of angles) {
          const angleRad = (angleDeg * Math.PI) / 180;
          const line = new Line2DRealization2D(
            new Vector3(0, 0, 1),  // Origin (inside circle for all angles)
            new Vector3(Math.cos(angleRad), Math.sin(angleRad), 0)
          );
          
          const result = intersectLineCircle(line, circle);
          if (result.points.length === 2) {
            const s0 = computeParameter(result.points[0], line);
            const s1 = computeParameter(result.points[1], line);
            
            // Index 0 always has lesser s regardless of line orientation
            expect(s0).toBeLessThan(s1);
            
            // For line from origin (inside circle), one parameter is negative, one positive
            // The absolute values should be close to the radius (≈ 3)
            expect(Math.abs(s0)).toBeCloseTo(3, 0);
            expect(Math.abs(s1)).toBeCloseTo(3, 0);
          }
        }
      });

      it('should handle line starting outside circle, pointing away', () => {
        const circle = new Circle2DRealization2D(
          new Vector3(0, 0, 1),
          new Vector3(3, 0, 0)
        );
        
        // Line starts at (5, 1), direction right (1, 0)
        // This is an INFINITE line, so it extends left and does intersect the circle
        // Line equation: y = 1 (for all x)
        const line = new Line2DRealization2D(
          new Vector3(5, 1, 1),
          new Vector3(1, 0, 0)   // z=0 means this is a direction vector (infinite line)
        );
        
        const result = intersectLineCircle(line, circle);
        
        // Infinite line DOES intersect circle (even though origin is at x=5, line extends left)
        expect(result.type).toBe('secant');
        expect(result.points).toHaveLength(2);
        
        // Both intersections should be to the left of x=5 (negative parameter)
        const s0 = computeParameter(result.points[0], line);
        const s1 = computeParameter(result.points[1], line);
        expect(s0).toBeLessThan(0);
        expect(s1).toBeLessThan(0);
        expect(s0).toBeLessThan(s1); // Maintain ordering
      });

      it('should order intersections with line passing through circle center', () => {
        const circle = new Circle2DRealization2D(
          new Vector3(0, 0, 1),
          new Vector3(3, 0, 0)
        );
        
        // Line through center, horizontal
        const line = new Line2DRealization2D(
          new Vector3(0, 0, 1),   // Center of circle
          new Vector3(1, 0, 0)    // Direction right
        );
        
        const result = intersectLineCircle(line, circle);
        expect(result.type).toBe('secant');
        expect(result.points).toHaveLength(2);
        
        const s0 = computeParameter(result.points[0], line);
        const s1 = computeParameter(result.points[1], line);
        
        // Index 0 has lesser (negative) parameter, index 1 has greater (positive) parameter
        expect(s0).toBeLessThan(s1);
        expect(s0).toBeLessThan(0);  // Left intersection (before center)
        expect(s1).toBeGreaterThan(0); // Right intersection (after center)
        
        // Both parameters should be ±radius in magnitude
        expect(Math.abs(s0)).toBeCloseTo(3, 1);
        expect(Math.abs(s1)).toBeCloseTo(3, 1);
      });
    });

    describe('Edge Cases for Intersection Ordering (T327, Phase 72)', () => {
      function computeSignedAngle(point: Vector3, circle1: Circle2DRealization2D, circle2: Circle2DRealization2D): number {
        const C1 = circle1.center;
        const C2 = circle2.center;
        
        const theta_centerLine = Math.atan2(C2.y - C1.y, C2.x - C1.x);
        const theta_I = Math.atan2(point.y - C1.y, point.x - C1.x);
        let deltaTheta = theta_I - theta_centerLine;
        
        while (deltaTheta > Math.PI) {
          deltaTheta -= 2 * Math.PI;
        }
        while (deltaTheta < -Math.PI) {
          deltaTheta += 2 * Math.PI;
        }
        
        return deltaTheta;
      }

      it('should handle tangent intersection (single point)', () => {
        // Circle 1 at origin
        const circle1 = new Circle2DRealization2D(
          new Vector3(0, 0, 1),
          new Vector3(3, 0, 0)
        );
        
        // Circle 2 externally tangent
        const circle2 = new Circle2DRealization2D(
          new Vector3(6, 0, 1),
          new Vector3(3, 0, 0)
        );
        
        const result = intersectCircleCircle(circle1, circle2);
        
        expect(result.type).toBe('tangent');
        expect(result.points).toHaveLength(1);
        
        // Single tangent point should be on center line (angle ≈ 0)
        const angle = computeSignedAngle(result.points[0], circle1, circle2);
        expect(Math.abs(angle)).toBeLessThan(1e-10);
      });

      it('should handle intersection where radius vector points directly at intersection', () => {
        // Circle 1: center at origin, radius at 0°
        const circle1 = new Circle2DRealization2D(
          new Vector3(0, 0, 1),
          new Vector3(3, 0, 0)    // Points directly at tangent point
        );
        
        // Circle 2: externally tangent at (3, 0) - exactly on radius vector
        const circle2 = new Circle2DRealization2D(
          new Vector3(6, 0, 1),
          new Vector3(3, 0, 0)
        );
        
        const result = intersectCircleCircle(circle1, circle2);
        
        expect(result.type).toBe('tangent');
        expect(result.points).toHaveLength(1);
        
        // Tangent point on center line (horizontal)
        const angle = computeSignedAngle(result.points[0], circle1, circle2);
        expect(Math.abs(angle)).toBeLessThan(1e-10);
      });

      it('should handle circles with perpendicular radius vectors (90° apart)', () => {
        // Circle 1: radius at 0°
        const circle1 = new Circle2DRealization2D(
          new Vector3(0, 0, 1),
          new Vector3(3, 0, 0)
        );
        
        // Circle 2: radius at 90° (perpendicular)
        const circle2 = new Circle2DRealization2D(
          new Vector3(4, 0, 1),
          new Vector3(0, 3, 0)    // perpendicular to circle1's radius
        );
        
        const result = intersectCircleCircle(circle1, circle2);
        
        expect(result.type).toBe('secant');
        expect(result.points).toHaveLength(2);
        
        const angle0 = computeSignedAngle(result.points[0], circle1, circle2);
        const angle1 = computeSignedAngle(result.points[1], circle1, circle2);
        
        // Radius vector orientation doesn't affect center-line-based ordering
        expect(angle0).toBeGreaterThan(0);
        expect(angle1).toBeLessThan(0);
      });

      it('should handle circles with same center x-coordinate (vertically aligned)', () => {
        // Circle 1 at origin
        const circle1 = new Circle2DRealization2D(
          new Vector3(0, 0, 1),
          new Vector3(3, 0, 0)
        );
        
        // Circle 2 directly above
        const circle2 = new Circle2DRealization2D(
          new Vector3(0, 4, 1),   // Same x, different y
          new Vector3(3, 0, 0)
        );
        
        const result = intersectCircleCircle(circle1, circle2);
        
        expect(result.type).toBe('secant');
        expect(result.points).toHaveLength(2);
        
        const angle0 = computeSignedAngle(result.points[0], circle1, circle2);
        const angle1 = computeSignedAngle(result.points[1], circle1, circle2);
        
        // Index 0 positive (counterclockwise), index 1 negative (clockwise)
        expect(angle0).toBeGreaterThan(0);
        expect(angle1).toBeLessThan(0);
        
        // Points should be symmetric about y-axis (center line is vertical)
        expect(result.points[0].x).toBeLessThan(0);   // Left point (counterclockwise from up)
        expect(result.points[1].x).toBeGreaterThan(0); // Right point (clockwise from up)
        expect(Math.abs(result.points[0].x)).toBeCloseTo(Math.abs(result.points[1].x), 5);
      });

      it('should handle circles with same center y-coordinate (horizontally aligned)', () => {
        // Circle 1 at origin
        const circle1 = new Circle2DRealization2D(
          new Vector3(0, 0, 1),
          new Vector3(3, 0, 0)
        );
        
        // Circle 2 to the right
        const circle2 = new Circle2DRealization2D(
          new Vector3(4, 0, 1),   // Same y, different x
          new Vector3(3, 0, 0)
        );
        
        const result = intersectCircleCircle(circle1, circle2);
        
        expect(result.type).toBe('secant');
        expect(result.points).toHaveLength(2);
        
        const angle0 = computeSignedAngle(result.points[0], circle1, circle2);
        const angle1 = computeSignedAngle(result.points[1], circle1, circle2);
        
        // Index 0 positive (counterclockwise), index 1 negative (clockwise)
        expect(angle0).toBeGreaterThan(0);
        expect(angle1).toBeLessThan(0);
        
        // Points should be symmetric about x-axis (center line is horizontal)
        expect(result.points[0].y).toBeGreaterThan(0); // Above center line
        expect(result.points[1].y).toBeLessThan(0);    // Below center line
      });
    });

    describe('Real-World Regression Test (T328)', () => {
      /**
       * Real-world scenario: User creates two circles and marks their intersection points.
       * 
       * Geometric setup:
       *   Circle A: Center at (2, 3), radius 5 (radius point at (7, 3))
       *   Circle B: Center at (8, 3), radius 4 (radius point at (12, 3))
       * 
       * Expected behavior:
       *   - Two intersection points exist (secant intersection)
       *   - Points ordered by angle relative to Circle A's radius vector (pointing right)
       *   - Index 0 should be the point with smaller angle (upper intersection)
       *   - Index 1 should be the point with larger angle (lower intersection)
       * 
       * Diagram (not to scale):
       * 
       *        Circle A              Circle B
       *      (center 2,3)          (center 8,3)
       *         radius 5              radius 4
       *            
       *            ●────────────────●
       *           /│\              /│\
       *          / │ \            / │ \
       *         /  │  \          /  │  \
       *        │   │   │        │   │   │
       *        │   │ X │ X X X  │   │   │  <- Intersection points
       *        │   │/  │        │  \│   │
       *         \  /   \        /   \  /
       *          \/     \      /     \/
       *           ───────●────●───────
       *                 radius vectors
       */
      it('should correctly order intersections in user construction scenario', () => {
        // Circle A: center at (2, 3), radius vector pointing right to (7, 3)
        const circleA = new Circle2DRealization2D(
          new Vector3(2, 3, 1),     // center
          new Vector3(5, 0, 0)      // radius vector (length 5, horizontal)
        );
        
        // Circle B: center at (8, 3), radius vector pointing right
        const circleB = new Circle2DRealization2D(
          new Vector3(8, 3, 1),     // center
          new Vector3(4, 0, 0)      // radius vector (length 4, horizontal)
        );
        
        const result = intersectCircleCircle(circleA, circleB);
        
        // Verify intersection type
        expect(result.type).toBe('secant');
        expect(result.points).toHaveLength(2);
        
        // Compute relative angles from Circle A's radius vector
        const center = circleA.center;
        const radiusVector = circleA.radiusVector;
        const theta0 = Math.atan2(radiusVector.y, radiusVector.x); // Should be 0 (horizontal)
        
        const angles = result.points.map(point => {
          const theta = Math.atan2(point.y - center.y, point.x - center.x);
          let deltaTheta = theta - theta0;
          while (deltaTheta < 0) deltaTheta += 2 * Math.PI;
          while (deltaTheta >= 2 * Math.PI) deltaTheta -= 2 * Math.PI;
          return deltaTheta;
        });
        
        // Verify ordering: angle[0] < angle[1]
        expect(angles[0]).toBeLessThan(angles[1]);
        
        // Verify geometric properties
        // Upper point (index 0) should have positive y relative to center
        // Lower point (index 1) should have negative y relative to center
        expect(result.points[0].y).toBeGreaterThan(center.y);
        expect(result.points[1].y).toBeLessThan(center.y);
        
        // Both points should have same x coordinate (on vertical line of intersection)
        expect(result.points[0].x).toBeCloseTo(result.points[1].x, 5);
        
        // Verify points are on both circles
        for (const point of result.points) {
          const distA = Math.sqrt((point.x - 2)**2 + (point.y - 3)**2);
          const distB = Math.sqrt((point.x - 8)**2 + (point.y - 3)**2);
          expect(distA).toBeCloseTo(5, 5);
          expect(distB).toBeCloseTo(4, 5);
        }
      });
    });
  });
});

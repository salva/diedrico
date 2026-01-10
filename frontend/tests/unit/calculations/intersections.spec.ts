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

    describe('Circle-Circle Intersection Ordering (T325)', () => {
      /**
       * Helper function to compute relative angle from a point to a circle's radius vector
       */
      function computeRelativeAngle(point: Vector3, circle: Circle2DRealization2D): number {
        const center = circle.center;
        const radiusVector = circle.radiusVector;
        
        const theta = Math.atan2(point.y - center.y, point.x - center.x);
        const theta0 = Math.atan2(radiusVector.y, radiusVector.x);
        let deltaTheta = theta - theta0;
        
        // Normalize to [0, 2π)
        while (deltaTheta < 0) {
          deltaTheta += 2 * Math.PI;
        }
        while (deltaTheta >= 2 * Math.PI) {
          deltaTheta -= 2 * Math.PI;
        }
        
        return deltaTheta;
      }

      it('should order intersections with radius vector at 0° (horizontal right)', () => {
        // Circle 1: center at origin, radius vector pointing right (0°)
        const circle1 = new Circle2DRealization2D(
          new Vector3(0, 0, 1),   // center
          new Vector3(3, 0, 0)    // radius vector at 0°
        );
        
        // Circle 2: center at (4, 0), creates two intersections
        const circle2 = new Circle2DRealization2D(
          new Vector3(4, 0, 1),   // center
          new Vector3(3, 0, 0)    // radius vector (doesn't affect ordering for circle1)
        );
        
        const result = intersectCircleCircle(circle1, circle2);
        
        expect(result.type).toBe('secant');
        expect(result.points).toHaveLength(2);
        
        // Compute relative angles from circle1's radius vector
        const angle0 = computeRelativeAngle(result.points[0], circle1);
        const angle1 = computeRelativeAngle(result.points[1], circle1);
        
        // Index 0 must have smaller angle than index 1
        expect(angle0).toBeLessThan(angle1);
        
        // Intersection points should be symmetric about x-axis
        // Point at negative y should have larger angle (below x-axis)
        expect(result.points[0].y).toBeGreaterThan(0); // Index 0 above x-axis (smaller angle)
        expect(result.points[1].y).toBeLessThan(0);    // Index 1 below x-axis (larger angle)
      });

      it('should order intersections with radius vector at 45°', () => {
        // Circle 1: center at origin, radius vector at 45°
        const circle1 = new Circle2DRealization2D(
          new Vector3(0, 0, 1),
          new Vector3(3 * Math.cos(Math.PI/4), 3 * Math.sin(Math.PI/4), 0) // 45°
        );
        
        // Circle 2: center at (4, 0)
        const circle2 = new Circle2DRealization2D(
          new Vector3(4, 0, 1),
          new Vector3(3, 0, 0)
        );
        
        const result = intersectCircleCircle(circle1, circle2);
        
        expect(result.type).toBe('secant');
        expect(result.points).toHaveLength(2);
        
        const angle0 = computeRelativeAngle(result.points[0], circle1);
        const angle1 = computeRelativeAngle(result.points[1], circle1);
        
        expect(angle0).toBeLessThan(angle1);
      });

      it('should order intersections with radius vector at 90° (vertical up)', () => {
        // Circle 1: center at origin, radius vector pointing up (90°)
        const circle1 = new Circle2DRealization2D(
          new Vector3(0, 0, 1),
          new Vector3(0, 3, 0)    // 90°
        );
        
        // Circle 2: center at (4, 0)
        const circle2 = new Circle2DRealization2D(
          new Vector3(4, 0, 1),
          new Vector3(3, 0, 0)
        );
        
        const result = intersectCircleCircle(circle1, circle2);
        
        expect(result.type).toBe('secant');
        expect(result.points).toHaveLength(2);
        
        const angle0 = computeRelativeAngle(result.points[0], circle1);
        const angle1 = computeRelativeAngle(result.points[1], circle1);
        
        expect(angle0).toBeLessThan(angle1);
        
        // With radius at 90°, the point with positive y and closer to right should be index 0
        // (measuring counterclockwise from 90°)
      });

      it('should order intersections with radius vector at 135°', () => {
        // Circle 1: radius vector at 135°
        const circle1 = new Circle2DRealization2D(
          new Vector3(0, 0, 1),
          new Vector3(3 * Math.cos(3*Math.PI/4), 3 * Math.sin(3*Math.PI/4), 0)
        );
        
        const circle2 = new Circle2DRealization2D(
          new Vector3(4, 0, 1),
          new Vector3(3, 0, 0)
        );
        
        const result = intersectCircleCircle(circle1, circle2);
        
        expect(result.type).toBe('secant');
        expect(result.points).toHaveLength(2);
        
        const angle0 = computeRelativeAngle(result.points[0], circle1);
        const angle1 = computeRelativeAngle(result.points[1], circle1);
        
        expect(angle0).toBeLessThan(angle1);
      });

      it('should order intersections with radius vector at 180° (horizontal left)', () => {
        // Circle 1: radius vector pointing left (180°)
        const circle1 = new Circle2DRealization2D(
          new Vector3(0, 0, 1),
          new Vector3(-3, 0, 0)   // 180°
        );
        
        const circle2 = new Circle2DRealization2D(
          new Vector3(4, 0, 1),
          new Vector3(3, 0, 0)
        );
        
        const result = intersectCircleCircle(circle1, circle2);
        
        expect(result.type).toBe('secant');
        expect(result.points).toHaveLength(2);
        
        const angle0 = computeRelativeAngle(result.points[0], circle1);
        const angle1 = computeRelativeAngle(result.points[1], circle1);
        
        expect(angle0).toBeLessThan(angle1);
      });

      it('should order intersections with radius vector at 270° (vertical down)', () => {
        // Circle 1: radius vector pointing down (270°)
        const circle1 = new Circle2DRealization2D(
          new Vector3(0, 0, 1),
          new Vector3(0, -3, 0)   // 270°
        );
        
        const circle2 = new Circle2DRealization2D(
          new Vector3(4, 0, 1),
          new Vector3(3, 0, 0)
        );
        
        const result = intersectCircleCircle(circle1, circle2);
        
        expect(result.type).toBe('secant');
        expect(result.points).toHaveLength(2);
        
        const angle0 = computeRelativeAngle(result.points[0], circle1);
        const angle1 = computeRelativeAngle(result.points[1], circle1);
        
        expect(angle0).toBeLessThan(angle1);
      });

      it('should maintain ordering with vertical circle centers', () => {
        // Circle 1: center at (0, 0), radius vector at 0°
        const circle1 = new Circle2DRealization2D(
          new Vector3(0, 0, 1),
          new Vector3(3, 0, 0)
        );
        
        // Circle 2: center above circle1
        const circle2 = new Circle2DRealization2D(
          new Vector3(0, 4, 1),
          new Vector3(3, 0, 0)
        );
        
        const result = intersectCircleCircle(circle1, circle2);
        
        expect(result.type).toBe('secant');
        expect(result.points).toHaveLength(2);
        
        const angle0 = computeRelativeAngle(result.points[0], circle1);
        const angle1 = computeRelativeAngle(result.points[1], circle1);
        
        expect(angle0).toBeLessThan(angle1);
        
        // Points should be symmetric about y-axis
        expect(Math.abs(result.points[0].x)).toBeCloseTo(Math.abs(result.points[1].x), 5);
      });

      it('should maintain ordering with diagonal circle centers', () => {
        // Circle 1: center at origin
        const circle1 = new Circle2DRealization2D(
          new Vector3(0, 0, 1),
          new Vector3(3, 0, 0)    // radius at 0°
        );
        
        // Circle 2: center at 45° from origin
        const circle2 = new Circle2DRealization2D(
          new Vector3(3, 3, 1),
          new Vector3(3, 0, 0)
        );
        
        const result = intersectCircleCircle(circle1, circle2);
        
        expect(result.type).toBe('secant');
        expect(result.points).toHaveLength(2);
        
        const angle0 = computeRelativeAngle(result.points[0], circle1);
        const angle1 = computeRelativeAngle(result.points[1], circle1);
        
        expect(angle0).toBeLessThan(angle1);
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
          
          const angle0 = computeRelativeAngle(result.points[0], circle1);
          const angle1 = computeRelativeAngle(result.points[1], circle1);
          
          // Even with small separation, ordering must be consistent
          expect(angle0).toBeLessThan(angle1);
        }
      });
    });

    describe('Line-Circle Intersection Ordering (T326)', () => {
      function computeRelativeAngle(point: Vector3, circle: Circle2DRealization2D): number {
        const center = circle.center;
        const radiusVector = circle.radiusVector;
        
        const theta = Math.atan2(point.y - center.y, point.x - center.x);
        const theta0 = Math.atan2(radiusVector.y, radiusVector.x);
        let deltaTheta = theta - theta0;
        
        while (deltaTheta < 0) {
          deltaTheta += 2 * Math.PI;
        }
        while (deltaTheta >= 2 * Math.PI) {
          deltaTheta -= 2 * Math.PI;
        }
        
        return deltaTheta;
      }

      it('should order line-circle intersections with horizontal line, radius at 0°', () => {
        // Circle: center at origin, radius vector at 0°
        const circle = new Circle2DRealization2D(
          new Vector3(0, 0, 1),
          new Vector3(3, 0, 0)
        );
        
        // Horizontal line above center: y = 1
        const line = new Line2DRealization2D(
          new Vector3(0, 1, 1),
          new Vector3(1, 0, 0)
        );
        
        const result = intersectLineCircle(line, circle);
        
        expect(result.type).toBe('secant');
        expect(result.points).toHaveLength(2);
        
        const angle0 = computeRelativeAngle(result.points[0], circle);
        const angle1 = computeRelativeAngle(result.points[1], circle);
        
        expect(angle0).toBeLessThan(angle1);
        
        // Point with positive x should be index 0 (smaller angle from 0°)
        expect(result.points[0].x).toBeGreaterThan(result.points[1].x);
      });

      it('should order line-circle intersections with vertical line, radius at 0°', () => {
        // Circle: center at origin
        const circle = new Circle2DRealization2D(
          new Vector3(0, 0, 1),
          new Vector3(3, 0, 0)
        );
        
        // Vertical line right of center: x = 1
        const line = new Line2DRealization2D(
          new Vector3(1, 0, 1),
          new Vector3(0, 1, 0)
        );
        
        const result = intersectLineCircle(line, circle);
        
        expect(result.type).toBe('secant');
        expect(result.points).toHaveLength(2);
        
        const angle0 = computeRelativeAngle(result.points[0], circle);
        const angle1 = computeRelativeAngle(result.points[1], circle);
        
        expect(angle0).toBeLessThan(angle1);
        
        // Point with positive y should be index 0 (smaller angle, upper quadrant)
        expect(result.points[0].y).toBeGreaterThan(0);
        expect(result.points[1].y).toBeLessThan(0);
      });

      it('should order line-circle intersections with diagonal line, radius at 45°', () => {
        // Circle: center at origin, radius at 45°
        const circle = new Circle2DRealization2D(
          new Vector3(0, 0, 1),
          new Vector3(3 * Math.cos(Math.PI/4), 3 * Math.sin(Math.PI/4), 0)
        );
        
        // Diagonal line: y = -x + 1
        const line = new Line2DRealization2D(
          new Vector3(0, 1, 1),
          new Vector3(1, -1, 0).normalize()
        );
        
        const result = intersectLineCircle(line, circle);
        
        expect(result.type).toBe('secant');
        expect(result.points).toHaveLength(2);
        
        const angle0 = computeRelativeAngle(result.points[0], circle);
        const angle1 = computeRelativeAngle(result.points[1], circle);
        
        expect(angle0).toBeLessThan(angle1);
      });

      it('should order line-circle intersections with radius at 90°', () => {
        // Circle: radius pointing up (90°)
        const circle = new Circle2DRealization2D(
          new Vector3(0, 0, 1),
          new Vector3(0, 3, 0)
        );
        
        // Horizontal line: y = 1
        const line = new Line2DRealization2D(
          new Vector3(0, 1, 1),
          new Vector3(1, 0, 0)
        );
        
        const result = intersectLineCircle(line, circle);
        
        expect(result.type).toBe('secant');
        expect(result.points).toHaveLength(2);
        
        const angle0 = computeRelativeAngle(result.points[0], circle);
        const angle1 = computeRelativeAngle(result.points[1], circle);
        
        expect(angle0).toBeLessThan(angle1);
      });

      it('should order line-circle intersections with radius at 180°', () => {
        // Circle: radius pointing left (180°)
        const circle = new Circle2DRealization2D(
          new Vector3(0, 0, 1),
          new Vector3(-3, 0, 0)
        );
        
        // Horizontal line: y = 1
        const line = new Line2DRealization2D(
          new Vector3(0, 1, 1),
          new Vector3(1, 0, 0)
        );
        
        const result = intersectLineCircle(line, circle);
        
        expect(result.type).toBe('secant');
        expect(result.points).toHaveLength(2);
        
        const angle0 = computeRelativeAngle(result.points[0], circle);
        const angle1 = computeRelativeAngle(result.points[1], circle);
        
        expect(angle0).toBeLessThan(angle1);
      });
    });

    describe('Edge Cases for Intersection Ordering (T327)', () => {
      function computeRelativeAngle(point: Vector3, circle: Circle2DRealization2D): number {
        const center = circle.center;
        const radiusVector = circle.radiusVector;
        
        const theta = Math.atan2(point.y - center.y, point.x - center.x);
        const theta0 = Math.atan2(radiusVector.y, radiusVector.x);
        let deltaTheta = theta - theta0;
        
        while (deltaTheta < 0) {
          deltaTheta += 2 * Math.PI;
        }
        while (deltaTheta >= 2 * Math.PI) {
          deltaTheta -= 2 * Math.PI;
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
        
        // Single point doesn't need ordering, but angle should be computable
        const angle = computeRelativeAngle(result.points[0], circle1);
        expect(angle).toBeGreaterThanOrEqual(0);
        expect(angle).toBeLessThan(2 * Math.PI);
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
        
        // Angle should be exactly 0 (on the radius vector)
        const angle = computeRelativeAngle(result.points[0], circle1);
        expect(angle).toBeCloseTo(0, 10);
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
        
        const angle0 = computeRelativeAngle(result.points[0], circle1);
        const angle1 = computeRelativeAngle(result.points[1], circle1);
        
        expect(angle0).toBeLessThan(angle1);
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
        
        const angle0 = computeRelativeAngle(result.points[0], circle1);
        const angle1 = computeRelativeAngle(result.points[1], circle1);
        
        expect(angle0).toBeLessThan(angle1);
        
        // Points should be symmetric about y-axis (same |x|, opposite signs)
        expect(result.points[0].x).toBeGreaterThan(0);
        expect(result.points[1].x).toBeLessThan(0);
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
        
        const angle0 = computeRelativeAngle(result.points[0], circle1);
        const angle1 = computeRelativeAngle(result.points[1], circle1);
        
        expect(angle0).toBeLessThan(angle1);
        
        // Points should be symmetric about x-axis
        expect(result.points[0].y).toBeGreaterThan(0);
        expect(result.points[1].y).toBeLessThan(0);
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

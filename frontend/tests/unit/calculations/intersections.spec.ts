import { describe, it, expect } from 'vitest';
import {
  lineLineIntersection,
  lineCircleIntersection,
  circleCircleIntersection
} from '../../../src/domain/calculations/intersections';

describe('intersections', () => {
  describe('lineLineIntersection', () => {
    it('should find intersection of two non-parallel lines', () => {
      const line1 = { x1: 0, y1: 0, x2: 10, y2: 10 };
      const line2 = { x1: 0, y1: 10, x2: 10, y2: 0 };
      
      const result = lineLineIntersection(line1, line2);
      
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.x).toBeCloseTo(5);
        expect(result.value.y).toBeCloseTo(5);
      }
    });

    it('should detect parallel lines', () => {
      const line1 = { x1: 0, y1: 0, x2: 10, y2: 0 };
      const line2 = { x1: 0, y1: 5, x2: 10, y2: 5 };
      
      const result = lineLineIntersection(line1, line2);
      
      expect(result.ok).toBe(false);
    });

    it('should find intersection of perpendicular lines', () => {
      const line1 = { x1: 0, y1: 5, x2: 10, y2: 5 };
      const line2 = { x1: 5, y1: 0, x2: 5, y2: 10 };
      
      const result = lineLineIntersection(line1, line2);
      
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.x).toBeCloseTo(5);
        expect(result.value.y).toBeCloseTo(5);
      }
    });
  });

  describe('lineCircleIntersection', () => {
    it('should find two intersections when line crosses circle', () => {
      const line = { x1: 0, y1: 5, x2: 10, y2: 5 };
      const circle = { cx: 5, cy: 5, r: 3 };
      
      const result = lineCircleIntersection(line, circle);
      
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(2);
        expect(result.value[0].y).toBeCloseTo(5);
        expect(result.value[1].y).toBeCloseTo(5);
      }
    });

    it('should find one intersection when line is tangent', () => {
      const line = { x1: 0, y1: 8, x2: 10, y2: 8 };
      const circle = { cx: 5, cy: 5, r: 3 };
      
      const result = lineCircleIntersection(line, circle);
      
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0].x).toBeCloseTo(5);
        expect(result.value[0].y).toBeCloseTo(8);
      }
    });

    it('should find no intersections when line misses circle', () => {
      const line = { x1: 0, y1: 10, x2: 10, y2: 10 };
      const circle = { cx: 5, cy: 5, r: 3 };
      
      const result = lineCircleIntersection(line, circle);
      
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(0);
      }
    });
  });

  describe('circleCircleIntersection', () => {
    it('should find two intersections when circles overlap', () => {
      const circle1 = { cx: 0, cy: 0, r: 5 };
      const circle2 = { cx: 6, cy: 0, r: 5 };
      
      const result = circleCircleIntersection(circle1, circle2);
      
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(2);
      }
    });

    it('should find one intersection when circles are tangent', () => {
      const circle1 = { cx: 0, cy: 0, r: 5 };
      const circle2 = { cx: 10, cy: 0, r: 5 };
      
      const result = circleCircleIntersection(circle1, circle2);
      
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0].x).toBeCloseTo(5);
        expect(result.value[0].y).toBeCloseTo(0);
      }
    });

    it('should find no intersections when circles are too far apart', () => {
      const circle1 = { cx: 0, cy: 0, r: 3 };
      const circle2 = { cx: 10, cy: 0, r: 3 };
      
      const result = circleCircleIntersection(circle1, circle2);
      
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(0);
      }
    });

    it('should detect coincident circles', () => {
      const circle1 = { cx: 5, cy: 5, r: 3 };
      const circle2 = { cx: 5, cy: 5, r: 3 };
      
      const result = circleCircleIntersection(circle1, circle2);
      
      expect(result.ok).toBe(false);
    });

    it('should find no intersections when one circle contains the other', () => {
      const circle1 = { cx: 5, cy: 5, r: 10 };
      const circle2 = { cx: 5, cy: 5, r: 3 };
      
      const result = circleCircleIntersection(circle1, circle2);
      
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(0);
      }
    });
  });
});

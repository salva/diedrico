import { describe, it, expect } from 'vitest';
import {
  pointPointDistance,
  pointLineDistance,
  pointSegmentDistance,
  isWithinDistance,
  closestPointOnLine,
  closestPointOnSegment
} from '../../../src/domain/calculations/distances';

describe('distances', () => {
  describe('pointPointDistance', () => {
    it('should calculate distance between two points', () => {
      const p1 = { x: 0, y: 0 };
      const p2 = { x: 3, y: 4 };
      
      const distance = pointPointDistance(p1, p2);
      
      expect(distance).toBeCloseTo(5);
    });

    it('should return zero for coincident points', () => {
      const p1 = { x: 5, y: 5 };
      const p2 = { x: 5, y: 5 };
      
      const distance = pointPointDistance(p1, p2);
      
      expect(distance).toBeCloseTo(0);
    });

    it('should calculate horizontal distance', () => {
      const p1 = { x: 0, y: 5 };
      const p2 = { x: 10, y: 5 };
      
      const distance = pointPointDistance(p1, p2);
      
      expect(distance).toBeCloseTo(10);
    });

    it('should calculate vertical distance', () => {
      const p1 = { x: 5, y: 0 };
      const p2 = { x: 5, y: 10 };
      
      const distance = pointPointDistance(p1, p2);
      
      expect(distance).toBeCloseTo(10);
    });
  });

  describe('pointLineDistance', () => {
    it('should calculate distance to horizontal line', () => {
      const point = { x: 5, y: 8 };
      const line = { x1: 0, y1: 5, x2: 10, y2: 5 };
      
      const result = pointLineDistance(point, line);
      
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBeCloseTo(3);
      }
    });

    it('should calculate distance to vertical line', () => {
      const point = { x: 8, y: 5 };
      const line = { x1: 5, y1: 0, x2: 5, y2: 10 };
      
      const result = pointLineDistance(point, line);
      
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBeCloseTo(3);
      }
    });

    it('should calculate distance to diagonal line', () => {
      const point = { x: 5, y: 0 };
      const line = { x1: 0, y1: 0, x2: 10, y2: 10 };
      
      const result = pointLineDistance(point, line);
      
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBeCloseTo(5 / Math.sqrt(2));
      }
    });

    it('should return zero for point on line', () => {
      const point = { x: 5, y: 5 };
      const line = { x1: 0, y1: 0, x2: 10, y2: 10 };
      
      const result = pointLineDistance(point, line);
      
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBeCloseTo(0);
      }
    });
  });

  describe('pointSegmentDistance', () => {
    it('should calculate distance to segment interior', () => {
      const point = { x: 5, y: 8 };
      const segment = { x1: 0, y1: 5, x2: 10, y2: 5 };
      
      const result = pointSegmentDistance(point, segment);
      
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBeCloseTo(3);
      }
    });

    it('should calculate distance to segment endpoint', () => {
      const point = { x: 15, y: 5 };
      const segment = { x1: 0, y1: 5, x2: 10, y2: 5 };
      
      const result = pointSegmentDistance(point, segment);
      
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBeCloseTo(5);
      }
    });

    it('should calculate distance to opposite endpoint', () => {
      const point = { x: -5, y: 5 };
      const segment = { x1: 0, y1: 5, x2: 10, y2: 5 };
      
      const result = pointSegmentDistance(point, segment);
      
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBeCloseTo(5);
      }
    });
  });

  describe('isWithinDistance', () => {
    it('should return true for points within distance', () => {
      const p1 = { x: 0, y: 0 };
      const p2 = { x: 3, y: 4 };
      
      expect(isWithinDistance(p1, p2, 5)).toBe(true);
      expect(isWithinDistance(p1, p2, 6)).toBe(true);
    });

    it('should return false for points beyond distance', () => {
      const p1 = { x: 0, y: 0 };
      const p2 = { x: 3, y: 4 };
      
      expect(isWithinDistance(p1, p2, 4)).toBe(false);
    });
  });

  describe('closestPointOnLine', () => {
    it('should find closest point on horizontal line', () => {
      const point = { x: 5, y: 8 };
      const line = { x1: 0, y1: 5, x2: 10, y2: 5 };
      
      const result = closestPointOnLine(point, line);
      
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.x).toBeCloseTo(5);
        expect(result.value.y).toBeCloseTo(5);
      }
    });

    it('should find closest point on diagonal line', () => {
      const point = { x: 5, y: 0 };
      const line = { x1: 0, y1: 0, x2: 10, y2: 10 };
      
      const result = closestPointOnLine(point, line);
      
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.x).toBeCloseTo(2.5);
        expect(result.value.y).toBeCloseTo(2.5);
      }
    });
  });

  describe('closestPointOnSegment', () => {
    it('should find closest point on segment interior', () => {
      const point = { x: 5, y: 8 };
      const segment = { x1: 0, y1: 5, x2: 10, y2: 5 };
      
      const result = closestPointOnSegment(point, segment);
      
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.x).toBeCloseTo(5);
        expect(result.value.y).toBeCloseTo(5);
      }
    });

    it('should clamp to segment endpoint', () => {
      const point = { x: 15, y: 5 };
      const segment = { x1: 0, y1: 5, x2: 10, y2: 5 };
      
      const result = closestPointOnSegment(point, segment);
      
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.x).toBeCloseTo(10);
        expect(result.value.y).toBeCloseTo(5);
      }
    });

    it('should clamp to opposite endpoint', () => {
      const point = { x: -5, y: 5 };
      const segment = { x1: 0, y1: 5, x2: 10, y2: 5 };
      
      const result = closestPointOnSegment(point, segment);
      
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.x).toBeCloseTo(0);
        expect(result.value.y).toBeCloseTo(5);
      }
    });
  });
});

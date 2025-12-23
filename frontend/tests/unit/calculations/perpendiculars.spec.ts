import { describe, it, expect } from 'vitest';
import {
  perpendicularThroughPoint,
  perpendicularFoot,
  arePerpendicular
} from '../../../src/domain/calculations/perpendiculars';

describe('perpendiculars', () => {
  describe('perpendicularThroughPoint', () => {
    it('should construct perpendicular to horizontal line', () => {
      const line = { x1: 0, y1: 5, x2: 10, y2: 5 };
      const point = { x: 5, y: 3 };
      
      const result = perpendicularThroughPoint(line, point);
      
      expect(result.ok).toBe(true);
      if (result.ok) {
        // Perpendicular to horizontal line should be vertical
        expect(result.value.x1).toBeCloseTo(result.value.x2);
        expect(result.value.x1).toBeCloseTo(5);
      }
    });

    it('should construct perpendicular to vertical line', () => {
      const line = { x1: 5, y1: 0, x2: 5, y2: 10 };
      const point = { x: 3, y: 5 };
      
      const result = perpendicularThroughPoint(line, point);
      
      expect(result.ok).toBe(true);
      if (result.ok) {
        // Perpendicular to vertical line should be horizontal
        expect(result.value.y1).toBeCloseTo(result.value.y2);
        expect(result.value.y1).toBeCloseTo(5);
      }
    });

    it('should construct perpendicular to diagonal line', () => {
      const line = { x1: 0, y1: 0, x2: 10, y2: 10 };
      const point = { x: 5, y: 0 };
      
      const result = perpendicularThroughPoint(line, point);
      
      expect(result.ok).toBe(true);
      if (result.ok) {
        const dx1 = line.x2 - line.x1;
        const dy1 = line.y2 - line.y1;
        const dx2 = result.value.x2 - result.value.x1;
        const dy2 = result.value.y2 - result.value.y1;
        
        // Dot product should be zero for perpendicular lines
        const dotProduct = dx1 * dx2 + dy1 * dy2;
        expect(Math.abs(dotProduct)).toBeLessThan(1e-10);
      }
    });

    it('should reject zero-length line', () => {
      const line = { x1: 5, y1: 5, x2: 5, y2: 5 };
      const point = { x: 3, y: 3 };
      
      const result = perpendicularThroughPoint(line, point);
      
      expect(result.ok).toBe(false);
    });
  });

  describe('perpendicularFoot', () => {
    it('should find foot on horizontal line', () => {
      const line = { x1: 0, y1: 5, x2: 10, y2: 5 };
      const point = { x: 3, y: 8 };
      
      const result = perpendicularFoot(line, point);
      
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.x).toBeCloseTo(3);
        expect(result.value.y).toBeCloseTo(5);
      }
    });

    it('should find foot on vertical line', () => {
      const line = { x1: 5, y1: 0, x2: 5, y2: 10 };
      const point = { x: 8, y: 3 };
      
      const result = perpendicularFoot(line, point);
      
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.x).toBeCloseTo(5);
        expect(result.value.y).toBeCloseTo(3);
      }
    });

    it('should find foot on diagonal line', () => {
      const line = { x1: 0, y1: 0, x2: 10, y2: 10 };
      const point = { x: 5, y: 0 };
      
      const result = perpendicularFoot(line, point);
      
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.x).toBeCloseTo(2.5);
        expect(result.value.y).toBeCloseTo(2.5);
      }
    });

    it('should reject zero-length line', () => {
      const line = { x1: 5, y1: 5, x2: 5, y2: 5 };
      const point = { x: 3, y: 3 };
      
      const result = perpendicularFoot(line, point);
      
      expect(result.ok).toBe(false);
    });
  });

  describe('arePerpendicular', () => {
    it('should detect perpendicular horizontal and vertical lines', () => {
      const line1 = { x1: 0, y1: 5, x2: 10, y2: 5 };
      const line2 = { x1: 5, y1: 0, x2: 5, y2: 10 };
      
      expect(arePerpendicular(line1, line2)).toBe(true);
    });

    it('should detect perpendicular diagonal lines', () => {
      const line1 = { x1: 0, y1: 0, x2: 10, y2: 10 };
      const line2 = { x1: 0, y1: 10, x2: 10, y2: 0 };
      
      expect(arePerpendicular(line1, line2)).toBe(true);
    });

    it('should detect non-perpendicular lines', () => {
      const line1 = { x1: 0, y1: 0, x2: 10, y2: 10 };
      const line2 = { x1: 0, y1: 0, x2: 10, y2: 5 };
      
      expect(arePerpendicular(line1, line2)).toBe(false);
    });

    it('should detect parallel lines as not perpendicular', () => {
      const line1 = { x1: 0, y1: 0, x2: 10, y2: 0 };
      const line2 = { x1: 0, y1: 5, x2: 10, y2: 5 };
      
      expect(arePerpendicular(line1, line2)).toBe(false);
    });
  });
});

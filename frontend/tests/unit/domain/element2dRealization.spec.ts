/**
 * Unit tests for Element2DRealization2D base class
 * 
 * Tests that all three realization types (Point2D, Line2D, Circle2D) properly extend
 * the Element2DRealization2D base class and inherit the isFeasible() method.
 */

import { describe, it, expect } from 'vitest';
import { Vector3 } from 'three';
import { Point2DRealization2D } from '@/domain/world/Point';
import { Line2DRealization2D } from '@/domain/world/Line';
import { Circle2DRealization2D } from '@/domain/world/Circle';
import { Element2DRealization2D } from '@/domain/world/Element2DRealization2D';

describe('Element2DRealization2D base class', () => {
  describe('Point2DRealization2D extends Element2DRealization2D', () => {
    it('should extend Element2DRealization2D', () => {
      const realization = new Point2DRealization2D(new Vector3(1, 2, 1), true);
      expect(realization).toBeInstanceOf(Element2DRealization2D);
    });

    it('should have isFeasible() method that returns true for feasible points', () => {
      const realization = new Point2DRealization2D(new Vector3(1, 2, 1), true);
      expect(realization.isFeasible()).toBe(true);
      expect(realization.feasible).toBe(true);
    });

    it('should have isFeasible() method that returns false for infeasible points', () => {
      const realization = new Point2DRealization2D(new Vector3(0, 0, 1), false);
      expect(realization.isFeasible()).toBe(false);
      expect(realization.feasible).toBe(false);
    });

    it('should default feasible to true when not provided', () => {
      const realization = new Point2DRealization2D(new Vector3(1, 2, 1));
      expect(realization.isFeasible()).toBe(true);
      expect(realization.feasible).toBe(true);
    });
  });

  describe('Line2DRealization2D extends Element2DRealization2D', () => {
    it('should extend Element2DRealization2D', () => {
      const p1 = new Vector3(0, 0, 1);
      const p2 = new Vector3(1, 0, 0); // Direction vector
      const realization = new Line2DRealization2D(p1, p2, true);
      expect(realization).toBeInstanceOf(Element2DRealization2D);
    });

    it('should have isFeasible() method that returns true for feasible lines', () => {
      const p1 = new Vector3(0, 0, 1);
      const p2 = new Vector3(1, 0, 0);
      const realization = new Line2DRealization2D(p1, p2, true);
      expect(realization.isFeasible()).toBe(true);
      expect(realization.feasible).toBe(true);
    });

    it('should have isFeasible() method that returns false for infeasible lines', () => {
      const p1 = new Vector3(0, 0, 1);
      const p2 = new Vector3(0, 0, 1); // Degenerate line (two coincident points)
      const realization = new Line2DRealization2D(p1, p2, false);
      expect(realization.isFeasible()).toBe(false);
      expect(realization.feasible).toBe(false);
    });

    it('should default feasible to true when not provided', () => {
      const p1 = new Vector3(0, 0, 1);
      const p2 = new Vector3(1, 0, 0);
      const realization = new Line2DRealization2D(p1, p2);
      expect(realization.isFeasible()).toBe(true);
      expect(realization.feasible).toBe(true);
    });
  });

  describe('Circle2DRealization2D extends Element2DRealization2D', () => {
    it('should extend Element2DRealization2D', () => {
      const center = new Vector3(5, 5, 1);
      const radiusVector = new Vector3(3, 0, 0);
      const realization = new Circle2DRealization2D(center, radiusVector, true);
      expect(realization).toBeInstanceOf(Element2DRealization2D);
    });

    it('should have isFeasible() method that returns true for feasible circles', () => {
      const center = new Vector3(5, 5, 1);
      const radiusVector = new Vector3(3, 0, 0);
      const realization = new Circle2DRealization2D(center, radiusVector, true);
      expect(realization.isFeasible()).toBe(true);
      expect(realization.feasible).toBe(true);
    });

    it('should have isFeasible() method that returns false for infeasible circles', () => {
      const center = new Vector3(5, 5, 1);
      const radiusVector = new Vector3(0, 0, 0); // Zero radius
      const realization = new Circle2DRealization2D(center, radiusVector, false);
      expect(realization.isFeasible()).toBe(false);
      expect(realization.feasible).toBe(false);
    });

    it('should default feasible to true when not provided', () => {
      const center = new Vector3(5, 5, 1);
      const radiusVector = new Vector3(3, 0, 0);
      const realization = new Circle2DRealization2D(center, radiusVector);
      expect(realization.isFeasible()).toBe(true);
      expect(realization.feasible).toBe(true);
    });
  });

  describe('Uniform feasibility checking', () => {
    it('should allow generic code to check feasibility on any realization type', () => {
      const realizations: Element2DRealization2D[] = [
        new Point2DRealization2D(new Vector3(1, 2, 1), true),
        new Line2DRealization2D(new Vector3(0, 0, 1), new Vector3(1, 0, 0), true),
        new Circle2DRealization2D(new Vector3(5, 5, 1), new Vector3(3, 0, 0), true),
      ];

      // Generic code can work with Element2DRealization2D interface
      realizations.forEach(realization => {
        expect(realization.isFeasible()).toBe(true);
      });
    });

    it('should filter feasible realizations using generic code', () => {
      const realizations: Element2DRealization2D[] = [
        new Point2DRealization2D(new Vector3(1, 2, 1), true),
        new Point2DRealization2D(new Vector3(0, 0, 1), false), // Infeasible
        new Line2DRealization2D(new Vector3(0, 0, 1), new Vector3(1, 0, 0), true),
        new Line2DRealization2D(new Vector3(0, 0, 1), new Vector3(0, 0, 1), false), // Infeasible
        new Circle2DRealization2D(new Vector3(5, 5, 1), new Vector3(3, 0, 0), true),
        new Circle2DRealization2D(new Vector3(5, 5, 1), new Vector3(0, 0, 0), false), // Infeasible
      ];

      const feasible = realizations.filter(r => r.isFeasible());
      expect(feasible).toHaveLength(3);
      expect(feasible.every(r => r.feasible)).toBe(true);
    });
  });
});

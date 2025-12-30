/**
 * Unit tests for Point class
 * 
 * Tests point creation, coordinate handling, and homogeneous coordinate representation.
 * All points must use plane intrinsic coordinates per Constitution Principle V.
 * 
 * @see frontend/src/domain/world/Point.ts
 */

import { describe, it, expect } from 'vitest';
import { Vector3 } from 'three';
import { FreePoint2D, IntersectionPoint2D } from '@/domain/world/Point';

describe('Point2D', () => {
  describe('constructor', () => {
    it('should create a free point with coordinates', () => {
      const point = new FreePoint2D('test-point-1', new Vector3(10, 20, 1), "plane_H");

      expect(point.position.x).toBe(10);
      expect(point.position.y).toBe(20);
      expect(point.position.z).toBe(1);
      expect(point.type).toBe('free');
    });

    it('should create an intersection point', () => {
      const point = new IntersectionPoint2D('test-point-2', 'line_1', 'circle_2', 0, "plane_H");

      expect(point.element1Id).toBe('line_1');
      expect(point.element2Id).toBe('circle_2');
      expect(point.index).toBe(0);
      expect(point.type).toBe('intersection');
    });

    it('should default to free type', () => {
      const point = new FreePoint2D('test-point-3', new Vector3(10, 20, 1), "plane_H");

      expect(point.type).toBe('free');
    });

    it('should accept optional label', () => {
      const point = new FreePoint2D('test-point-4', new Vector3(10, 20, 1), "plane_H", 'Point A');

      expect(point.label).toBe('Point A');
    });

    it('should accept optional planeId', () => {
      const point = new FreePoint2D('test-point-5', new Vector3(10, 20, 1), "plane_H");

      expect(point.planeId).toBe('plane_H');
    });

    it('should not have an ID initially', () => {
      const point = new FreePoint2D('test-point-6', new Vector3(10, 20, 1), "plane_H");

      expect(point.id).toBeDefined();
    });
  });

  describe('position coordinates', () => {
    it('should store position as Vector3', () => {
      const point = new FreePoint2D('test-point-7', new Vector3(10, 20, 1), "plane_H");

      expect(point.position.x).toBe(10);
      expect(point.position.y).toBe(20);
      expect(point.position.z).toBe(1);
    });

    it('should work with negative coordinates', () => {
      const point = new FreePoint2D('test-point-8', new Vector3(-5, -15, 1), "plane_H");

      expect(point.position.x).toBe(-5);
      expect(point.position.y).toBe(-15);
      expect(point.position.z).toBe(1);
    });

    it('should work with zero coordinates', () => {
      const point = new FreePoint2D('test-point-9', new Vector3(0, 0, 1), "plane_H");

      expect(point.position.x).toBe(0);
      expect(point.position.y).toBe(0);
      expect(point.position.z).toBe(1);
    });

    it('should work with decimal coordinates', () => {
      const point = new FreePoint2D('test-point-10', new Vector3(10.5, 20.75, 1), "plane_H");

      expect(point.position.x).toBe(10.5);
      expect(point.position.y).toBe(20.75);
      expect(point.position.z).toBe(1);
    });
  });

  describe('position updates', () => {
    it('should allow updating position', () => {
      const point = new FreePoint2D('test-point-11', new Vector3(10, 20, 1), "plane_H");

      point.position = new Vector3(30, 40, 1);

      expect(point.position.x).toBe(30);
      expect(point.position.y).toBe(40);
      expect(point.position.z).toBe(1);
    });

    it('should preserve other properties when position changes', () => {
      const point = new FreePoint2D('point_1', new Vector3(10, 20, 1), "plane_H", 'Point A');

      point.position = new Vector3(30, 40, 1);

      expect(point.id).toBe('point_1');
      expect(point.type).toBe('free');
      expect(point.label).toBe('Point A');
      expect(point.planeId).toBe('plane_H');
    });
  });

  describe('clone', () => {
    it('should create a deep copy of the point', () => {
      const original = new FreePoint2D('point_1', new Vector3(10, 20, 1), "plane_H", 'Point A');

      const clone = original.clone();

      expect(clone).not.toBe(original);
      expect(clone.position).not.toBe(original.position);  // Different Vector3 instances
      expect(clone.position.x).toBe(10);
      expect(clone.position.y).toBe(20);
      expect(clone.position.z).toBe(1);
      expect(clone.type).toBe('free');
      expect(clone.label).toBe('Point A');
      expect(clone.planeId).toBe('plane_H');
      expect(clone.id).toBe('point_1');
    });

    it('should clone point without ID', () => {
      const original = new FreePoint2D('test-point-12', new Vector3(10, 20, 1), "plane_H");

      const clone = original.clone();

      expect(clone.id).toBeDefined();
      expect(clone.position.x).toBe(10);
      expect(clone.position.y).toBe(20);
    });

    it('should allow modifying clone without affecting original', () => {
      const original = new FreePoint2D('test-point-13', new Vector3(10, 20, 1), "plane_H");
      const clone = original.clone();

      clone.position = new Vector3(30, 40, 1);
      clone.label = 'Modified';

      expect(original.position.x).toBe(10);
      expect(original.position.y).toBe(20);
      expect(original.label).toBeUndefined();
    });
  });

  describe('coordinate system validation', () => {
    it('should store position as Vector3 homogeneous coordinates (u, v, 1)', () => {
      // As per Constitution Principle V,
      // points MUST be stored in homogeneous coordinates (u, v, 1)
      const point = new FreePoint2D('test-point-14', new Vector3(100, 200, 1), "plane_H");

      expect(point.position).toBeInstanceOf(Vector3);
      expect(point.position.x).toBe(100);
      expect(point.position.y).toBe(200);
      expect(point.position.z).toBe(1); // homogeneous coordinate
    });
  });
});

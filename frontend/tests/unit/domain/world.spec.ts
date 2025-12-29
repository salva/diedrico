/**
 * Unit tests for World class
 * 
 * Tests the World container's ability to store and manage geometric elements.
 * 
 * @see frontend/src/domain/world/World.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '@/domain/world/World';
import { Point } from '@/domain/world/Point';

describe('World', () => {
  let world: World;

  beforeEach(() => {
    world = new World();
  });

  describe('constructor', () => {
    it('should create an empty world', () => {
      expect(world.getPointCount()).toBe(0);
      expect(world.getAllPoints()).toEqual([]);
    });
  });

  describe('addPoint', () => {
    it('should add a point to the world', () => {
      const point = new Point(10, 20, 'free');
      world.addPoint(point);

      expect(world.getPointCount()).toBe(1);
      expect(world.getAllPoints()).toContain(point);
    });

    it('should assign an ID to a point without one', () => {
      const point = new Point(10, 20, 'free');
      expect(point.id).toBeUndefined();

      world.addPoint(point);

      expect(point.id).toBeDefined();
      expect(point.id).toMatch(/^point_\d+$/);
    });

    it('should not override existing ID', () => {
      const point = new Point(10, 20, 'free');
      point.id = 'custom_id';

      world.addPoint(point);

      expect(point.id).toBe('custom_id');
    });

    it('should assign sequential IDs to multiple points', () => {
      const point1 = new Point(10, 20, 'free');
      const point2 = new Point(30, 40, 'free');

      world.addPoint(point1);
      world.addPoint(point2);

      expect(point1.id).toBe('point_1');
      expect(point2.id).toBe('point_2');
    });
  });

  describe('removePoint', () => {
    it('should remove a point by ID', () => {
      const point = new Point(10, 20, 'free');
      point.id = 'test_point';
      world.addPoint(point);

      const removed = world.removePoint('test_point');

      expect(removed).toBe(true);
      expect(world.getPointCount()).toBe(0);
      expect(world.getPointById('test_point')).toBeUndefined();
    });

    it('should return false when removing non-existent point', () => {
      const removed = world.removePoint('non_existent');

      expect(removed).toBe(false);
    });
  });

  describe('getPointById', () => {
    it('should retrieve a point by ID', () => {
      const point = new Point(10, 20, 'free');
      point.id = 'test_point';
      world.addPoint(point);

      const retrieved = world.getPointById('test_point');

      expect(retrieved).toBe(point);
      expect(retrieved?.coordinates.u).toBe(10);
      expect(retrieved?.coordinates.v).toBe(20);
    });

    it('should return undefined for non-existent ID', () => {
      const retrieved = world.getPointById('non_existent');

      expect(retrieved).toBeUndefined();
    });
  });

  describe('getAllPoints', () => {
    it('should return empty array for empty world', () => {
      expect(world.getAllPoints()).toEqual([]);
    });

    it('should return all points', () => {
      const point1 = new Point(10, 20, 'free');
      const point2 = new Point(30, 40, 'free');
      const point3 = new Point(50, 60, 'derived');

      world.addPoint(point1);
      world.addPoint(point2);
      world.addPoint(point3);

      const allPoints = world.getAllPoints();

      expect(allPoints).toHaveLength(3);
      expect(allPoints).toContain(point1);
      expect(allPoints).toContain(point2);
      expect(allPoints).toContain(point3);
    });
  });

  describe('clear', () => {
    it('should remove all points', () => {
      world.addPoint(new Point(10, 20, 'free'));
      world.addPoint(new Point(30, 40, 'free'));

      expect(world.getPointCount()).toBe(2);

      world.clear();

      expect(world.getPointCount()).toBe(0);
      expect(world.getAllPoints()).toEqual([]);
    });

    it('should reset ID counter', () => {
      world.addPoint(new Point(10, 20, 'free'));
      world.addPoint(new Point(30, 40, 'free'));

      world.clear();

      const newPoint = new Point(50, 60, 'free');
      world.addPoint(newPoint);

      expect(newPoint.id).toBe('point_1');
    });
  });

  describe('getPointCount', () => {
    it('should return 0 for empty world', () => {
      expect(world.getPointCount()).toBe(0);
    });

    it('should return correct count after additions', () => {
      world.addPoint(new Point(10, 20, 'free'));
      expect(world.getPointCount()).toBe(1);

      world.addPoint(new Point(30, 40, 'free'));
      expect(world.getPointCount()).toBe(2);
    });

    it('should return correct count after removals', () => {
      const point = new Point(10, 20, 'free');
      world.addPoint(point);
      world.addPoint(new Point(30, 40, 'free'));

      world.removePoint(point.id!);

      expect(world.getPointCount()).toBe(1);
    });
  });
});

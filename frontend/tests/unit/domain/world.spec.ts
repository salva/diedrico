/**
 * Unit tests for World class
 * 
 * Tests the World container's ability to store and manage geometric elements.
 * 
 * @see frontend/src/domain/world/World.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '@/domain/world/World';
import { Point, FreePoint } from '@/domain/world/Point';

describe('World', () => {
  let world: World;

  beforeEach(() => {
    world = new World();
  });

  describe('constructor', () => {
    it('should create a world with origin points O_H and O_V', () => {
      expect(world.getPointCount()).toBe(2);
      const points = world.getAllPoints();
      expect(points.some(p => p.id === 'O_H')).toBe(true);
      expect(points.some(p => p.id === 'O_V')).toBe(true);
    });
  });

  describe('addPoint', () => {
    it('should add a point to the world', () => {
      const point = new FreePoint([10, 20, 1]);
      world.addPoint(point);

      expect(world.getPointCount()).toBe(3);
      expect(world.getAllPoints()).toContain(point);
    });

    it('should assign an ID to a point without one', () => {
      const point = new FreePoint([10, 20, 1]);
      expect(point.id).toBeUndefined();

      world.addPoint(point);

      expect(point.id).toBeDefined();
      expect(point.id).toMatch(/^point_\d+$/);
    });

    it('should not override existing ID', () => {
      const point = new FreePoint([10, 20, 1]);
      point.id = 'custom_id';

      world.addPoint(point);

      expect(point.id).toBe('custom_id');
    });

    it('should assign sequential IDs to multiple points', () => {
      const point1 = new FreePoint([10, 20, 1]);
      const point2 = new FreePoint([30, 40, 1]);

      world.addPoint(point1);
      world.addPoint(point2);

      expect(point1.id).toBe('point_1');
      expect(point2.id).toBe('point_2');
    });
  });

  describe('removePoint', () => {
    it('should remove a point by ID', () => {
      const point = new FreePoint([10, 20, 1]);
      point.id = 'test_point';
      world.addPoint(point);

      const removed = world.removePoint('test_point');

      expect(removed).toBe(true);
      expect(world.getPointCount()).toBe(2);
      expect(world.getPointById('test_point')).toBeUndefined();
    });

    it('should return false when removing non-existent point', () => {
      const removed = world.removePoint('non_existent');

      expect(removed).toBe(false);
    });
  });

  describe('getPointById', () => {
    it('should retrieve a point by ID', () => {
      const point = new FreePoint([10, 20, 1]);
      point.id = 'test_point';
      world.addPoint(point);

      const retrieved = world.getPointById('test_point');

      expect(retrieved).toBe(point);
      expect(retrieved?.coordinates[0]).toBe(10);
      expect(retrieved?.coordinates[1]).toBe(20);
    });

    it('should return undefined for non-existent ID', () => {
      const retrieved = world.getPointById('non_existent');

      expect(retrieved).toBeUndefined();
    });
  });

  describe('getAllPoints', () => {
    it('should return origin points for new world', () => {
      const points = world.getAllPoints();
      expect(points.length).toBe(2);
      expect(points.some(p => p.id === 'O_H')).toBe(true);
      expect(points.some(p => p.id === 'O_V')).toBe(true);
    });

    it('should return all points', () => {
      const point1 = new FreePoint([10, 20, 1]);
      const point2 = new FreePoint([30, 40, 1]);
      const point3 = new FreePoint([50, 60, 1]);

      world.addPoint(point1);
      world.addPoint(point2);
      world.addPoint(point3);

      const allPoints = world.getAllPoints();

      expect(allPoints).toHaveLength(5);
      expect(allPoints).toContain(point1);
      expect(allPoints).toContain(point2);
      expect(allPoints).toContain(point3);
    });
  });

  describe('clear', () => {
    it('should remove all user points but keep origin points', () => {
      world.addPoint(new FreePoint([10, 20, 1]));
      world.addPoint(new FreePoint([30, 40, 1]));

      expect(world.getPointCount()).toBe(4);

      world.clear();

      expect(world.getPointCount()).toBe(2);
      const points = world.getAllPoints();
      expect(points.some(p => p.id === 'O_H')).toBe(true);
      expect(points.some(p => p.id === 'O_V')).toBe(true);
    });

    it('should reset ID counter', () => {
      world.addPoint(new FreePoint([10, 20, 1]));
      world.addPoint(new FreePoint([30, 40, 1]));

      world.clear();

      const newPoint = new FreePoint([50, 60, 1]);
      world.addPoint(newPoint);

      expect(newPoint.id).toBe('point_1');
    });
  });

  describe('getPointCount', () => {
    it('should return 2 for world with origin points O_H and O_V', () => {
      expect(world.getPointCount()).toBe(2);
    });

    it('should return correct count after additions', () => {
      world.addPoint(new FreePoint([10, 20, 1]));
      expect(world.getPointCount()).toBe(3);

      world.addPoint(new FreePoint([30, 40, 1]));
      expect(world.getPointCount()).toBe(4);
    });

    it('should return correct count after removals', () => {
      const point = new FreePoint([10, 20, 1]);
      world.addPoint(point);
      world.addPoint(new FreePoint([30, 40, 1]));

      world.removePoint(point.id!);

      expect(world.getPointCount()).toBe(3);
    });
  });
});

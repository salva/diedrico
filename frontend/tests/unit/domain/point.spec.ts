/**
 * Unit tests for Point class
 * 
 * Tests point creation, coordinate handling, and homogeneous coordinate representation.
 * All points must use plane intrinsic coordinates per Constitution Principle V.
 * 
 * @see frontend/src/domain/world/Point.ts
 */

import { describe, it, expect } from 'vitest';
import { FreePoint, IntersectionPoint } from '@/domain/world/Point';

describe('Point', () => {
  describe('constructor', () => {
    it('should create a free point with coordinates', () => {
      const point = new FreePoint([10, 20, 1]);

      expect(point.coordinates[0]).toBe(10);
      expect(point.coordinates[1]).toBe(20);
      expect(point.coordinates[2]).toBe(1);
      expect(point.type).toBe('free');
    });

    it('should create an intersection point', () => {
      const point = new IntersectionPoint([30, 40, 1], 'line_1', 'circle_2', 0);

      expect(point.coordinates[0]).toBe(30);
      expect(point.coordinates[1]).toBe(40);
      expect(point.coordinates[2]).toBe(1);
      expect(point.type).toBe('intersection');
    });

    it('should default to free type', () => {
      const point = new FreePoint([10, 20, 1]);

      expect(point.type).toBe('free');
    });

    it('should accept optional label', () => {
      const point = new FreePoint([10, 20, 1], undefined, 'Point A');

      expect(point.label).toBe('Point A');
    });

    it('should accept optional planeId', () => {
      const point = new FreePoint([10, 20, 1], { id: 'plane_H' });

      expect(point.planeId).toBe('plane_H');
    });

    it('should not have an ID initially', () => {
      const point = new FreePoint([10, 20, 1]);

      expect(point.id).toBeUndefined();
    });
  });

  describe('getHomogeneousCoords', () => {
    it('should return homogeneous coordinates [u, v, 1]', () => {
      const point = new FreePoint([10, 20, 1]);

      const homogeneous = point.getHomogeneousCoords();

      expect(homogeneous).toEqual([10, 20, 1]);
    });

    it('should work with negative coordinates', () => {
      const point = new FreePoint([-5, -15, 1]);

      const homogeneous = point.getHomogeneousCoords();

      expect(homogeneous).toEqual([-5, -15, 1]);
    });

    it('should work with zero coordinates', () => {
      const point = new FreePoint([0, 0, 1]);

      const homogeneous = point.getHomogeneousCoords();

      expect(homogeneous).toEqual([0, 0, 1]);
    });

    it('should work with decimal coordinates', () => {
      const point = new FreePoint([10.5, 20.75, 1]);

      const homogeneous = point.getHomogeneousCoords();

      expect(homogeneous).toEqual([10.5, 20.75, 1]);
    });
  });

  describe('setCoordinates', () => {
    it('should update coordinates', () => {
      const point = new FreePoint([10, 20, 1]);

      point.setCoordinates([30, 40, 1]);

      expect(point.coordinates[0]).toBe(30);
      expect(point.coordinates[1]).toBe(40);
      expect(point.coordinates[2]).toBe(1);
    });

    it('should preserve other properties', () => {
      const point = new FreePoint([10, 20, 1], { id: 'plane_H' }, 'Point A');
      point.id = 'point_1';

      point.setCoordinates([30, 40, 1]);

      expect(point.id).toBe('point_1');
      expect(point.type).toBe('free');
      expect(point.label).toBe('Point A');
      expect(point.planeId).toBe('plane_H');
    });
  });

  describe('clone', () => {
    it('should create a deep copy of the point', () => {
      const original = new FreePoint([10, 20, 1], { id: 'plane_H' }, 'Point A');
      original.id = 'point_1';

      const clone = original.clone();

      expect(clone).not.toBe(original);
      expect(clone.coordinates).not.toBe(original.coordinates);
      expect(clone.coordinates[0]).toBe(10);
      expect(clone.coordinates[1]).toBe(20);
      expect(clone.coordinates[2]).toBe(1);
      expect(clone.type).toBe('free');
      expect(clone.label).toBe('Point A');
      expect(clone.planeId).toBe('plane_H');
      expect(clone.id).toBe('point_1');
    });

    it('should clone point without ID', () => {
      const original = new FreePoint([10, 20, 1]);

      const clone = original.clone();

      expect(clone.id).toBeUndefined();
      expect(clone.coordinates[0]).toBe(10);
      expect(clone.coordinates[1]).toBe(20);
    });

    it('should allow modifying clone without affecting original', () => {
      const original = new FreePoint([10, 20, 1]);
      const clone = original.clone();

      clone.setCoordinates([30, 40, 1]);
      clone.label = 'Modified';

      expect(original.coordinates[0]).toBe(10);
      expect(original.coordinates[1]).toBe(20);
      expect(original.label).toBeUndefined();
    });
  });

  describe('coordinate system validation', () => {
    it('should store coordinates as homogeneous coordinates [u, v, 1]', () => {
      // As per Constitution Principle V,
      // points MUST be stored in homogeneous coordinates [u, v, 1]
      const point = new FreePoint([100, 200, 1]);

      expect(point.coordinates).toEqual([100, 200, 1]);
      expect(point.coordinates).toHaveLength(3);
      expect(point.coordinates[2]).toBe(1); // homogeneous coordinate
    });
  });
});

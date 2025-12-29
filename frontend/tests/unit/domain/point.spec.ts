/**
 * Unit tests for Point class
 * 
 * Tests point creation, coordinate handling, and homogeneous coordinate representation.
 * All points must use plane intrinsic coordinates per Constitution Principle V.
 * 
 * @see frontend/src/domain/world/Point.ts
 */

import { describe, it, expect } from 'vitest';
import { Point } from '@/domain/world/Point';

describe('Point', () => {
  describe('constructor', () => {
    it('should create a free point with coordinates', () => {
      const point = new Point(10, 20, 'free');

      expect(point.coordinates.u).toBe(10);
      expect(point.coordinates.v).toBe(20);
      expect(point.type).toBe('free');
    });

    it('should create a derived point', () => {
      const point = new Point(30, 40, 'derived');

      expect(point.coordinates.u).toBe(30);
      expect(point.coordinates.v).toBe(40);
      expect(point.type).toBe('derived');
    });

    it('should default to free type', () => {
      const point = new Point(10, 20);

      expect(point.type).toBe('free');
    });

    it('should accept optional label', () => {
      const point = new Point(10, 20, 'free', 'Point A');

      expect(point.label).toBe('Point A');
    });

    it('should accept optional planeId', () => {
      const point = new Point(10, 20, 'free', undefined, 'plane_H');

      expect(point.planeId).toBe('plane_H');
    });

    it('should not have an ID initially', () => {
      const point = new Point(10, 20, 'free');

      expect(point.id).toBeUndefined();
    });
  });

  describe('getHomogeneousCoords', () => {
    it('should return homogeneous coordinates [u, v, 1]', () => {
      const point = new Point(10, 20, 'free');

      const homogeneous = point.getHomogeneousCoords();

      expect(homogeneous).toEqual([10, 20, 1]);
    });

    it('should work with negative coordinates', () => {
      const point = new Point(-5, -15, 'free');

      const homogeneous = point.getHomogeneousCoords();

      expect(homogeneous).toEqual([-5, -15, 1]);
    });

    it('should work with zero coordinates', () => {
      const point = new Point(0, 0, 'free');

      const homogeneous = point.getHomogeneousCoords();

      expect(homogeneous).toEqual([0, 0, 1]);
    });

    it('should work with decimal coordinates', () => {
      const point = new Point(10.5, 20.75, 'free');

      const homogeneous = point.getHomogeneousCoords();

      expect(homogeneous).toEqual([10.5, 20.75, 1]);
    });
  });

  describe('setCoordinates', () => {
    it('should update coordinates', () => {
      const point = new Point(10, 20, 'free');

      point.setCoordinates(30, 40);

      expect(point.coordinates.u).toBe(30);
      expect(point.coordinates.v).toBe(40);
    });

    it('should preserve other properties', () => {
      const point = new Point(10, 20, 'free', 'Point A', 'plane_H');
      point.id = 'point_1';

      point.setCoordinates(30, 40);

      expect(point.id).toBe('point_1');
      expect(point.type).toBe('free');
      expect(point.label).toBe('Point A');
      expect(point.planeId).toBe('plane_H');
    });
  });

  describe('clone', () => {
    it('should create a deep copy of the point', () => {
      const original = new Point(10, 20, 'free', 'Point A', 'plane_H');
      original.id = 'point_1';

      const clone = original.clone();

      expect(clone).not.toBe(original);
      expect(clone.coordinates).not.toBe(original.coordinates);
      expect(clone.coordinates.u).toBe(10);
      expect(clone.coordinates.v).toBe(20);
      expect(clone.type).toBe('free');
      expect(clone.label).toBe('Point A');
      expect(clone.planeId).toBe('plane_H');
      expect(clone.id).toBe('point_1');
    });

    it('should clone point without ID', () => {
      const original = new Point(10, 20, 'free');

      const clone = original.clone();

      expect(clone.id).toBeUndefined();
      expect(clone.coordinates.u).toBe(10);
      expect(clone.coordinates.v).toBe(20);
    });

    it('should allow modifying clone without affecting original', () => {
      const original = new Point(10, 20, 'free');
      const clone = original.clone();

      clone.setCoordinates(30, 40);
      clone.label = 'Modified';

      expect(original.coordinates.u).toBe(10);
      expect(original.coordinates.v).toBe(20);
      expect(original.label).toBeUndefined();
    });
  });

  describe('coordinate system validation', () => {
    it('should store coordinates in plane intrinsic space', () => {
      // As per Constitution Principle V and data-model.md,
      // points MUST be stored in plane intrinsic <u,v> coordinates
      const point = new Point(100, 200, 'free');

      expect(point.coordinates).toHaveProperty('u');
      expect(point.coordinates).toHaveProperty('v');
      expect(point.coordinates.u).toBe(100);
      expect(point.coordinates.v).toBe(200);
    });
  });
});

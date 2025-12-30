/**
 * plane.spec.ts
 * Unit tests for Plane3D class
 * 
 * Tests cover:
 * - Plane3D construction with point and normal
 * - P_H and P_V factory methods
 * - Boundary setting and getters
 * - Coordinate system setup
 * - Point containment checks
 */

import { describe, it, expect } from 'vitest';
import { Vector4 } from 'three';
import { Plane3D } from "@/domain/world/Plane";

describe('Plane3D', () => {
  describe('constructor', () => {
    it('should create a plane with point and normal', () => {
      const plane = new Plane3D(
        new Vector4(0, 0, 0, 1),
        new Vector4(0, 0, 1, 0)
      );

      expect(plane.point.x).toBe(0);
      expect(plane.point.y).toBe(0);
      expect(plane.point.z).toBe(0);
      expect(plane.point.w).toBe(1);
      expect(plane.normal.x).toBe(0);
      expect(plane.normal.y).toBe(0);
      expect(plane.normal.z).toBe(1);
      expect(plane.type).toBe('auxiliary');
    });

    it('should normalize the normal vector', () => {
      const plane = new Plane3D(
        new Vector4(0, 0, 0, 1),
        new Vector4(3, 0, 4, 0)  // Length 5, w=0 for direction
      );

      // Normal should be normalized to unit length
      expect(plane.normal.x).toBeCloseTo(0.6);  // 3/5
      expect(plane.normal.y).toBeCloseTo(0);
      expect(plane.normal.z).toBeCloseTo(0.8);  // 4/5
      expect(plane.normal.w).toBe(0);  // Direction vector
    });

    it('should throw error for zero normal vector', () => {
      expect(() => {
        new Plane3D(
          new Vector4(0, 0, 0, 1),
          new Vector4(0, 0, 0, 1)  // Zero vector
        );
      }).toThrow('Cannot normalize zero vector');
    });

    it('should accept optional label', () => {
      const plane = new Plane3D(
        new Vector4(0, 0, 0, 1),
        new Vector4(0, 0, 1, 1),
        'projection',
        'Test Plane3D'
      );

      expect(plane.label).toBe('Test Plane3D');
      expect(plane.type).toBe('projection');
    });
  });

  describe('createPH', () => {
    it('should create P_H horizontal projection plane', () => {
      const planeH = Plane3D.createPH();

      expect(planeH.point).toEqual(new Vector4(0, 0, 0, 1));
      expect(planeH.normal).toEqual(new Vector4(0, 0, 1, 0));
      expect(planeH.label).toBe('P_H');
      expect(planeH.type).toBe('projection');
    });

    it('should set default boundaries for P_H', () => {
      const planeH = Plane3D.createPH();

      expect(planeH.minU).toBe(-400);
      expect(planeH.maxU).toBe(400);
      expect(planeH.minV).toBe(-400);
      expect(planeH.maxV).toBe(400);
    });

    it('should set coordinate system for P_H', () => {
      const planeH = Plane3D.createPH();

      expect(planeH.coordinateSystem).toBeDefined();
      expect(planeH.coordinateSystem?.origin).toEqual(new Vector4(0, 0, 0, 1));
      expect(planeH.coordinateSystem?.uAxis).toEqual(new Vector4(1, 0, 0, 0));
      expect(planeH.coordinateSystem?.vAxis).toEqual(new Vector4(0, 1, 0, 0));
    });
  });

  describe('createPV', () => {
    it('should create P_V vertical projection plane', () => {
      const planeV = Plane3D.createPV();

      expect(planeV.point).toEqual(new Vector4(0, 0, 0, 1));
      expect(planeV.normal).toEqual(new Vector4(0, 1, 0, 0));
      expect(planeV.label).toBe('P_V');
      expect(planeV.type).toBe('projection');
    });

    it('should set default boundaries for P_V', () => {
      const planeV = Plane3D.createPV();

      expect(planeV.minU).toBe(-400);
      expect(planeV.maxU).toBe(400);
      expect(planeV.minV).toBe(-400);
      expect(planeV.maxV).toBe(400);
    });

    it('should set coordinate system for P_V', () => {
      const planeV = Plane3D.createPV();

      expect(planeV.coordinateSystem).toBeDefined();
      expect(planeV.coordinateSystem?.origin).toEqual(new Vector4(0, 0, 0, 1));
      expect(planeV.coordinateSystem?.uAxis).toEqual(new Vector4(1, 0, 0, 0));
      expect(planeV.coordinateSystem?.vAxis).toEqual(new Vector4(0, 0, 1, 0));
    });
  });

  describe('setBoundaries', () => {
    it('should set and get boundaries', () => {
      const plane = new Plane3D(
        new Vector4(0, 0, 0, 1),
        new Vector4(0, 0, 1, 1)
      );

      plane.setBoundaries(-100, 200, -150, 250);

      expect(plane.minU).toBe(-100);
      expect(plane.maxU).toBe(200);
      expect(plane.minV).toBe(-150);
      expect(plane.maxV).toBe(250);
    });

    it('should return default boundaries if not set', () => {
      const plane = new Plane3D(
        new Vector4(0, 0, 0, 1),
        new Vector4(0, 0, 1, 1)
      );

      // Default boundaries are -400 to 400
      expect(plane.minU).toBe(-400);
      expect(plane.maxU).toBe(400);
      expect(plane.minV).toBe(-400);
      expect(plane.maxV).toBe(400);
    });
  });

  describe('setCoordinateSystem', () => {
    it('should set coordinate system', () => {
      const plane = new Plane3D(
        new Vector4(0, 0, 0, 1),
        new Vector4(0, 0, 1, 1)
      );

      plane.setCoordinateSystem({
        origin: new Vector4(1, 2, 3, 1),
        uAxis: new Vector4(1, 0, 0, 0),
        vAxis: new Vector4(0, 1, 0, 0)
      });

      expect(plane.coordinateSystem?.origin).toEqual(new Vector4(1, 2, 3, 1));
      expect(plane.coordinateSystem?.uAxis).toEqual(new Vector4(1, 0, 0, 0));
      expect(plane.coordinateSystem?.vAxis).toEqual(new Vector4(0, 1, 0, 0));
    });
  });

  describe('containsPoint', () => {
    it('should return true for point on plane', () => {
      const plane = new Plane3D(
        new Vector4(0, 0, 0, 1),
        new Vector4(0, 0, 1, 0)  // Z = 0 plane, normal direction
      );

      expect(plane.containsPoint(new Vector4(5, 3, 0, 1))).toBe(true);
      expect(plane.containsPoint(new Vector4(-10, 20, 0, 1))).toBe(true);
    });

    it('should return false for point not on plane', () => {
      const plane = new Plane3D(
        new Vector4(0, 0, 0, 1),
        new Vector4(0, 0, 1, 0)  // Z = 0 plane, normal direction
      );

      expect(plane.containsPoint(new Vector4(0, 0, 1, 1))).toBe(false);
      expect(plane.containsPoint(new Vector4(5, 3, -2, 1))).toBe(false);
    });

    it('should use tolerance for near-plane points', () => {
      const plane = new Plane3D(
        new Vector4(0, 0, 0, 1),
        new Vector4(0, 0, 1, 0)  // Z = 0 plane, normal direction
      );

      // Point very close to plane (within default tolerance)
      expect(plane.containsPoint(new Vector4(0, 0, 0.0000001, 1))).toBe(true);

      // Point outside tolerance
      expect(plane.containsPoint({ x: 0, y: 0, z: 0.001 }, 0.0001)).toBe(false);
    });
  });

  describe('clone', () => {
    it('should create deep copy of plane', () => {
      const plane = new Plane3D(
        new Vector4(1, 2, 3, 1),
        new Vector4(0, 1, 0, 1),
        'projection',
        'Test'
      );
      plane.id = 'plane_1';
      plane.setBoundaries(-100, 100, -50, 50);
      plane.setCoordinateSystem({
        origin: new Vector4(0, 0, 0, 1),
        uAxis: new Vector4(1, 0, 0, 1),
        vAxis: new Vector4(0, 0, 1, 0)
      });

      const cloned = plane.clone();

      expect(cloned.id).toBe('plane_1');
      expect(cloned.point).toEqual(plane.point);
      expect(cloned.normal).toEqual(plane.normal);
      expect(cloned.label).toBe('Test');
      expect(cloned.minU).toBe(-100);
      expect(cloned.coordinateSystem).toEqual(plane.coordinateSystem);
    });

    it('should create independent copy', () => {
      const plane = new Plane3D(
        new Vector4(0, 0, 0, 1),
        new Vector4(0, 0, 1, 1)
      );
      plane.setBoundaries(-100, 100, -100, 100);

      const cloned = plane.clone();
      cloned.setBoundaries(-200, 200, -200, 200);

      // Original should not be affected
      expect(plane.minU).toBe(-100);
      expect(plane.maxU).toBe(100);
      expect(cloned.minU).toBe(-200);
      expect(cloned.maxU).toBe(200);
    });
  });
});

/**
 * Tests for ProjectionPlane transformations
 * Verifies that forward and inverse transforms work correctly
 */

import { describe, it, expect } from 'vitest';
import { Vector3 } from 'three';
import { BaseProjectionPlane } from '@/domain/world/ProjectionPlane';

describe('ProjectionPlane Transformations', () => {
  describe('P_H (Horizontal Plane)', () => {
    it('should transform plane coords to paper coords correctly', () => {
      const planeH = BaseProjectionPlane.createPH();
      planeH.id = 'test_plane_H';
      const realization = planeH.realize2D();
      
      // Test point at plane origin (0, 0, 1)
      const planePos = new Vector3(0, 0, 1);
      const paperPos = planePos.clone().applyMatrix3(realization.planeToPaper2D);
      
      expect(paperPos.x).toBeCloseTo(800);  // x' = u + 800 = 0 + 800
      expect(paperPos.y).toBeCloseTo(500);  // y' = -v + 500 = 0 + 500
      expect(paperPos.z).toBeCloseTo(1);
    });

    it('should transform paper coords to plane coords correctly', () => {
      const planeH = BaseProjectionPlane.createPH();
      planeH.id = 'test_plane_H';
      const realization = planeH.realize2D();
      
      // Test point at paper (900, 400, 1) → plane (100, 100, 1)
      const paperPos = new Vector3(900, 400, 1);
      const planePos = paperPos.clone().applyMatrix3(realization.paperToPlane2D);
      
      expect(planePos.x).toBeCloseTo(100);  // u = x' - 800 = 900 - 800
      expect(planePos.y).toBeCloseTo(100);  // v = -(y' - 500) = -(400 - 500) = 100
      expect(planePos.z).toBeCloseTo(1);
    });

    it('should round-trip correctly (plane → paper → plane)', () => {
      const planeH = BaseProjectionPlane.createPH();
      planeH.id = 'test_plane_H';
      const realization = planeH.realize2D();
      
      const original = new Vector3(50, 75, 1);
      const paper = original.clone().applyMatrix3(realization.planeToPaper2D);
      const roundtrip = paper.clone().applyMatrix3(realization.paperToPlane2D);
      
      expect(roundtrip.x).toBeCloseTo(original.x);
      expect(roundtrip.y).toBeCloseTo(original.y);
      expect(roundtrip.z).toBeCloseTo(original.z);
    });

    it('should round-trip correctly (paper → plane → paper)', () => {
      const planeH = BaseProjectionPlane.createPH();
      planeH.id = 'test_plane_H';
      const realization = planeH.realize2D();
      
      const original = new Vector3(200, 400, 1);
      const plane = original.clone().applyMatrix3(realization.paperToPlane2D);
      const roundtrip = plane.clone().applyMatrix3(realization.planeToPaper2D);
      
      expect(roundtrip.x).toBeCloseTo(original.x);
      expect(roundtrip.y).toBeCloseTo(original.y);
      expect(roundtrip.z).toBeCloseTo(original.z);
    });
  });

  describe('P_V (Vertical Plane)', () => {
    it('should transform plane coords to paper coords correctly', () => {
      const planeV = BaseProjectionPlane.createPV();
      planeV.id = 'test_plane_V';
      const realization = planeV.realize2D();
      
      // Test point at plane origin (0, 0, 1)
      const planePos = new Vector3(0, 0, 1);
      const paperPos = planePos.clone().applyMatrix3(realization.planeToPaper2D);
      
      expect(paperPos.x).toBeCloseTo(800);  // x' = u + 800 = 0 + 800
      expect(paperPos.y).toBeCloseTo(500);  // y' = v + 500 = 0 + 500
      expect(paperPos.z).toBeCloseTo(1);
    });

    it('should transform paper coords to plane coords correctly', () => {
      const planeV = BaseProjectionPlane.createPV();
      planeV.id = 'test_plane_V';
      const realization = planeV.realize2D();
      
      // Test point at paper (900, 600, 1) → plane (100, 100, 1)
      const paperPos = new Vector3(900, 600, 1);
      const planePos = paperPos.clone().applyMatrix3(realization.paperToPlane2D);
      
      expect(planePos.x).toBeCloseTo(100);  // u = x' - 800 = 900 - 800
      expect(planePos.y).toBeCloseTo(100);  // v = y' - 500 = 600 - 500
      expect(planePos.z).toBeCloseTo(1);
    });

    it('should round-trip correctly (plane → paper → plane)', () => {
      const planeV = BaseProjectionPlane.createPV();
      planeV.id = 'test_plane_V';
      const realization = planeV.realize2D();
      
      const original = new Vector3(50, 75, 1);
      const paper = original.clone().applyMatrix3(realization.planeToPaper2D);
      const roundtrip = paper.clone().applyMatrix3(realization.paperToPlane2D);
      
      expect(roundtrip.x).toBeCloseTo(original.x);
      expect(roundtrip.y).toBeCloseTo(original.y);
      expect(roundtrip.z).toBeCloseTo(original.z);
    });

    it('should round-trip correctly (paper → plane → paper)', () => {
      const planeV = BaseProjectionPlane.createPV();
      planeV.id = 'test_plane_V';
      const realization = planeV.realize2D();
      
      const original = new Vector3(200, -400, 1);
      const plane = original.clone().applyMatrix3(realization.paperToPlane2D);
      const roundtrip = plane.clone().applyMatrix3(realization.planeToPaper2D);
      
      expect(roundtrip.x).toBeCloseTo(original.x);
      expect(roundtrip.y).toBeCloseTo(original.y);
      expect(roundtrip.z).toBeCloseTo(original.z);
    });
  });

  describe('Matrix Inversion', () => {
    it('P_H: paperToPlane should be inverse of planeToPaper', () => {
      const planeH = BaseProjectionPlane.createPH();
      planeH.id = 'test_plane_H';
      const realization = planeH.realize2D();
      
      // Multiply planeToPaper * paperToPlane should give identity
      const product = realization.planeToPaper2D.clone().multiply(realization.paperToPlane2D);
      const identity = product.elements;
      
      // Should be identity matrix [1,0,0, 0,1,0, 0,0,1]
      expect(identity[0]).toBeCloseTo(1);
      expect(identity[1]).toBeCloseTo(0);
      expect(identity[2]).toBeCloseTo(0);
      expect(identity[3]).toBeCloseTo(0);
      expect(identity[4]).toBeCloseTo(1);
      expect(identity[5]).toBeCloseTo(0);
      expect(identity[6]).toBeCloseTo(0);
      expect(identity[7]).toBeCloseTo(0);
      expect(identity[8]).toBeCloseTo(1);
    });

    it('P_V: paperToPlane should be inverse of planeToPaper', () => {
      const planeV = BaseProjectionPlane.createPV();
      planeV.id = 'test_plane_V';
      const realization = planeV.realize2D();
      
      // Multiply planeToPaper * paperToPlane should give identity
      const product = realization.planeToPaper2D.clone().multiply(realization.paperToPlane2D);
      const identity = product.elements;
      
      // Should be identity matrix
      expect(identity[0]).toBeCloseTo(1);
      expect(identity[1]).toBeCloseTo(0);
      expect(identity[2]).toBeCloseTo(0);
      expect(identity[3]).toBeCloseTo(0);
      expect(identity[4]).toBeCloseTo(1);
      expect(identity[5]).toBeCloseTo(0);
      expect(identity[6]).toBeCloseTo(0);
      expect(identity[7]).toBeCloseTo(0);
      expect(identity[8]).toBeCloseTo(1);
    });
  });
});

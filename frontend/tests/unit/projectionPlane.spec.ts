/**
 * Tests for ProjectionPlane transformations and element storage
 * Verifies that forward and inverse transforms work correctly
 * Tests element storage functionality added in Phase 22.5.1
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Vector3 } from 'three';
import { FixedProjectionPlane } from '@/domain/world/projectionPlane/FixedProjectionPlane';
import { FreePoint2D } from '@/domain/world/Point';
import { Line2DByTwoPoints } from '@/domain/world/Line';
import { Circle2DByCenterAndPoint } from '@/domain/world/Circle';
import type { World } from '@/domain/world/World';
import { createTestWorld, getHorizontalPlane, getVerticalPlane, getHorizontalPlaneId, getVerticalPlaneId } from '../helpers/worldHelpers';

describe('ProjectionPlane Transformations', () => {
  const { world } = createTestWorld(); // Initialize world with planes
  
  describe('P_H (Horizontal Plane)', () => {
    it('should transform plane coords to paper coords correctly', () => {
      const planeH = world.getProjectionPlaneByLabel('P_H');
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
      const planeH = world.getProjectionPlaneByLabel('P_H');
      planeH.id = 'test_plane_H';
      const realization = planeH.realize2D();
      
      // Test point at paper (900, 400, 1) → plane (100, -100, 1)
      const paperPos = new Vector3(900, 400, 1);
      const planePos = paperPos.clone().applyMatrix3(realization.paperToPlane2D);
      
      expect(planePos.x).toBeCloseTo(100);  // u = x' - 800 = 900 - 800
      expect(planePos.y).toBeCloseTo(-100);  // v = -(y' - 500) = -(400 - 500) = -(-100) = 100 paper coords, inverted to -100 plane
      expect(planePos.z).toBeCloseTo(1);
    });

    it('should round-trip correctly (plane → paper → plane)', () => {
      const planeH = world.getProjectionPlaneByLabel('P_H');
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
      const planeH = world.getProjectionPlaneByLabel('P_H');
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
      const planeV = world.getProjectionPlaneByLabel('P_V');
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
      const planeV = world.getProjectionPlaneByLabel('P_V');
      planeV.id = 'test_plane_V';
      const realization = planeV.realize2D();
      
      // Test point at paper (900, 600, 1) → plane (100, -100, 1)
      const paperPos = new Vector3(900, 600, 1);
      const planePos = paperPos.clone().applyMatrix3(realization.paperToPlane2D);
      
      expect(planePos.x).toBeCloseTo(100);  // u = x' - 800 = 900 - 800
      expect(planePos.y).toBeCloseTo(-100);  // v coordinate is inverted in the transformation
      expect(planePos.z).toBeCloseTo(1);
    });

    it('should round-trip correctly (plane → paper → plane)', () => {
      const planeV = world.getProjectionPlaneByLabel('P_V');
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
      const planeV = world.getProjectionPlaneByLabel('P_V');
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
      const planeH = world.getProjectionPlaneByLabel('P_H');
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
      const planeV = world.getProjectionPlaneByLabel('P_V');
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

describe('ProjectionPlane Element Storage (Phase 22.5.1)', () => {
  let world: World;
  let planeH: FixedProjectionPlane;
  let planeV: FixedProjectionPlane;

  beforeEach(() => {
    const { world: w } = createTestWorld();
    world = w;
    planeH = getHorizontalPlane(world);
    planeV = getVerticalPlane(world);
  });

  describe('Point Storage', () => {
    it('should add and retrieve a point', () => {
      const point = world.getConstructionService().addFreePoint2D(planeH, new Vector3(10, 20, 1));
      
      const retrieved = planeH.getPoint(point.id);
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(point.id);
      expect(retrieved?.planeId).toBe(planeH.id);
    });

    it('should retrieve all points', () => {
      const initialCount = planeH.getAllPoints().length;
      const p1 = world.getConstructionService().addFreePoint2D(planeH, new Vector3(10, 20, 1));
      const p2 = world.getConstructionService().addFreePoint2D(planeH, new Vector3(30, 40, 1));
      
      const allPoints = planeH.getAllPoints();
      expect(allPoints).toHaveLength(initialCount + 2);
      expect(allPoints.map(p => p.id)).toContain(p1.id);
      expect(allPoints.map(p => p.id)).toContain(p2.id);
    });

    it('should remove a point', () => {
      const point = world.getConstructionService().addFreePoint2D(planeH, new Vector3(10, 20, 1));
      
      expect(planeH.getPoint(point.id)).toBeDefined();
      
      const removed = planeH.removePoint(point.id);
      expect(removed).toBe(true);
      expect(planeH.getPoint(point.id)).toBeUndefined();
    });

  });

  describe('Line Storage', () => {
    it('should add and retrieve a line', () => {
      const p1 = world.getConstructionService().addFreePoint2D(planeH, new Vector3(0, 0, 1));
      const p2 = world.getConstructionService().addFreePoint2D(planeH, new Vector3(10, 10, 1));
      const line = world.getConstructionService().addLine2DBetweenTwoPoints(planeH, p1.id, p2.id);
      
      const retrieved = planeH.getLine(line.id);
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(line.id);
      expect(retrieved?.planeId).toBe(planeH.id);
    });

    it('should retrieve all lines', () => {
      const initialLineCount = planeH.getAllLines().length;
      const p1 = world.getConstructionService().addFreePoint2D(planeH, new Vector3(0, 0, 1));
      const p2 = world.getConstructionService().addFreePoint2D(planeH, new Vector3(10, 10, 1));
      const p3 = world.getConstructionService().addFreePoint2D(planeH, new Vector3(20, 0, 1));
      const p4 = world.getConstructionService().addFreePoint2D(planeH, new Vector3(30, 10, 1));
      
      const l1 = world.getConstructionService().addLine2DBetweenTwoPoints(planeH, p1.id, p2.id);
      const l2 = world.getConstructionService().addLine2DBetweenTwoPoints(planeH, p3.id, p4.id);
      
      const allLines = planeH.getAllLines();
      expect(allLines).toHaveLength(initialLineCount + 2);
      expect(allLines.map(l => l.id)).toContain(l1.id);
      expect(allLines.map(l => l.id)).toContain(l2.id);
    });

    it('should remove a line', () => {
      const p1 = world.getConstructionService().addFreePoint2D(planeH, new Vector3(0, 0, 1));
      const p2 = world.getConstructionService().addFreePoint2D(planeH, new Vector3(10, 10, 1));
      const line = world.getConstructionService().addLine2DBetweenTwoPoints(planeH, p1.id, p2.id);
      
      expect(planeH.getLine(line.id)).toBeDefined();
      
      const removed = planeH.removeLine(line.id);
      expect(removed).toBe(true);
      expect(planeH.getLine(line.id)).toBeUndefined();
    });

  });

  describe('Circle Storage', () => {
    it('should add and retrieve a circle', () => {
      const center = world.getConstructionService().addFreePoint2D(planeH, new Vector3(100, 100, 1));
      const edge = world.getConstructionService().addFreePoint2D(planeH, new Vector3(150, 100, 1));
      const circle = world.getConstructionService().addCircle2DByCenterAndPoint(planeH, center.id, edge.id);
      
      const retrieved = planeH.getCircle(circle.id);
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(circle.id);
      expect(retrieved?.planeId).toBe(planeH.id);
    });

    it('should retrieve all circles', () => {
      const c1Center = world.getConstructionService().addFreePoint2D(planeH, new Vector3(100, 100, 1));
      const c1Edge = world.getConstructionService().addFreePoint2D(planeH, new Vector3(150, 100, 1));
      const c2Center = world.getConstructionService().addFreePoint2D(planeH, new Vector3(200, 200, 1));
      const c2Edge = world.getConstructionService().addFreePoint2D(planeH, new Vector3(250, 200, 1));
      
      const c1 = world.getConstructionService().addCircle2DByCenterAndPoint(planeH, c1Center.id, c1Edge.id);
      const c2 = world.getConstructionService().addCircle2DByCenterAndPoint(planeH, c2Center.id, c2Edge.id);
      
      const allCircles = planeH.getAllCircles();
      expect(allCircles).toHaveLength(2);
      expect(allCircles.map(c => c.id)).toContain(c1.id);
      expect(allCircles.map(c => c.id)).toContain(c2.id);
    });

    it('should remove a circle', () => {
      const center = world.getConstructionService().addFreePoint2D(planeH, new Vector3(100, 100, 1));
      const edge = world.getConstructionService().addFreePoint2D(planeH, new Vector3(150, 100, 1));
      const circle = world.getConstructionService().addCircle2DByCenterAndPoint(planeH, center.id, edge.id);
      
      expect(planeH.getCircle(circle.id)).toBeDefined();
      
      const removed = planeH.removeCircle(circle.id);
      expect(removed).toBe(true);
      expect(planeH.getCircle(circle.id)).toBeUndefined();
    });

  });

  describe('Multi-Plane Isolation', () => {
    it('should keep elements isolated between planes', () => {
      const initialHCount = planeH.getAllPoints().length;
      const initialVCount = planeV.getAllPoints().length;
      
      const pointH = world.getConstructionService().addFreePoint2D(planeH, new Vector3(10, 20, 1));
      const pointV = world.getConstructionService().addFreePoint2D(planeV, new Vector3(30, 40, 1));
      
      // P_H should have initialHCount + pointH
      expect(planeH.getAllPoints()).toHaveLength(initialHCount + 1);
      expect(planeH.getPoint(pointH.id)).toBeDefined();
      expect(planeH.getPoint(pointV.id)).toBeUndefined();
      
      // P_V should have initialVCount + pointV
      expect(planeV.getAllPoints()).toHaveLength(initialVCount + 1);
      expect(planeV.getPoint(pointV.id)).toBeDefined();
      expect(planeV.getPoint(pointH.id)).toBeUndefined();
    });

    it('should keep line storage isolated between planes', () => {
      const p1H = world.getConstructionService().addFreePoint2D(planeH, new Vector3(0, 0, 1));
      const p2H = world.getConstructionService().addFreePoint2D(planeH, new Vector3(10, 0, 1));
      const p1V = world.getConstructionService().addFreePoint2D(planeV, new Vector3(0, 0, 1));
      const p2V = world.getConstructionService().addFreePoint2D(planeV, new Vector3(10, 0, 1));
      
      const lineH = world.getConstructionService().addLine2DBetweenTwoPoints(planeH, p1H.id, p2H.id);
      const lineV = world.getConstructionService().addLine2DBetweenTwoPoints(planeV, p1V.id, p2V.id);

      expect(planeH.getLine(lineH.id)).toBe(lineH);
      expect(planeH.getLine(lineV.id)).toBeUndefined();
      expect(planeV.getLine(lineV.id)).toBe(lineV);
      expect(planeV.getLine(lineH.id)).toBeUndefined();
    });
  });

  describe('Element Type Mixing', () => {
    it('should handle points, lines, and circles in same plane', () => {
      const initialPointCount = planeH.getAllPoints().length;  // Hinge points may exist
      const initialLineCount = planeH.getAllLines().length;  // Hinge lines may exist
      
      const p1 = world.getConstructionService().addFreePoint2D(planeH, new Vector3(10, 20, 1));
      const p2 = world.getConstructionService().addFreePoint2D(planeH, new Vector3(20, 30, 1));
      const pEdge = world.getConstructionService().addFreePoint2D(planeH, new Vector3(60, 20, 1));
      
      const line = world.getConstructionService().addLine2DBetweenTwoPoints(planeH, p1.id, p2.id);
      const circle = world.getConstructionService().addCircle2DByCenterAndPoint(planeH, p1.id, pEdge.id);
      
      expect(planeH.getAllPoints()).toHaveLength(initialPointCount + 3);
      expect(planeH.getAllLines()).toHaveLength(initialLineCount + 1);
      expect(planeH.getAllCircles()).toHaveLength(1);
      
      expect(planeH.getPoint(p1.id)).toBeDefined();
      expect(planeH.getLine(line.id)).toBeDefined();
      expect(planeH.getCircle(circle.id)).toBeDefined();
    });
  });
});


describe('ProjectionPlane owner-plane guard paths', () => {
  let world: World;
  let planeV: FixedProjectionPlane;

  beforeEach(() => {
    const { world: w } = createTestWorld();
    world = w;
    planeV = getVerticalPlane(world);
  });

  it('throws an explicit missing-owner error when adding a sibling intersection for an unknown primary point', () => {
    expect(() => world.getConstructionService().addSiblingIntersectionPoint(planeV, 'missing-primary-intersection')).toThrow(
      'Primary intersection point not found: missing-primary-intersection'
    );
  });
});

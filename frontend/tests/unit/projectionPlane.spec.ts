/**
 * Tests for ProjectionPlane transformations and element storage
 * Verifies that forward and inverse transforms work correctly
 * Tests element storage functionality added in Phase 22.5.1
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Vector3 } from 'three';
import { FixedProjectionPlane } from '@/domain/world/projectionPlane/FixedProjectionPlane';
import { FreePoint2D, Point2DRealization2D } from '@/domain/world/Point';
import { Line2DByTwoPoints, Line2DRealization2D } from '@/domain/world/Line';
import { Circle2DByCenterAndPoint, Circle2DRealization2D } from '@/domain/world/Circle';
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
      const point = planeH.addFreePoint2D(new Vector3(10, 20, 1), world);
      
      const retrieved = planeH.getPoint(point.id);
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(point.id);
      expect(retrieved?.planeId).toBe(planeH.id);
    });

    it('should retrieve all points', () => {
      const initialCount = planeH.getAllPoints().length;
      const p1 = planeH.addFreePoint2D(new Vector3(10, 20, 1), world);
      const p2 = planeH.addFreePoint2D(new Vector3(30, 40, 1), world);
      
      const allPoints = planeH.getAllPoints();
      expect(allPoints).toHaveLength(initialCount + 2);
      expect(allPoints.map(p => p.id)).toContain(p1.id);
      expect(allPoints.map(p => p.id)).toContain(p2.id);
    });

    it('should remove a point', () => {
      const point = planeH.addFreePoint2D(new Vector3(10, 20, 1), world);
      
      expect(planeH.getPoint(point.id)).toBeDefined();
      
      const removed = planeH.removePoint(point.id);
      expect(removed).toBe(true);
      expect(planeH.getPoint(point.id)).toBeUndefined();
    });

    it('should cache and retrieve point realizations', () => {
      const point = planeH.addFreePoint2D(new Vector3(10, 20, 1), world);
      
      const realization = new Point2DRealization2D(new Vector3(10, 20, 1), true);
      planeH.setPointRealization2D(point.id, realization);
      
      const retrieved = planeH.getPointRealization2D(point.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.position.x).toBe(10);
      expect(retrieved?.position.y).toBe(20);
    });

    it('should clear point realization', () => {
      const point = planeH.addFreePoint2D(new Vector3(10, 20, 1), world);
      
      const realization = new Point2DRealization2D(new Vector3(10, 20, 1), true);
      planeH.setPointRealization2D(point.id, realization);
      expect(planeH.getPointRealization2D(point.id)).toBeDefined();
      
      planeH.clearPointRealization2D(point.id);
      expect(planeH.getPointRealization2D(point.id)).toBeUndefined();
    });

    it('should auto-clear realization when removing point', () => {
      const point = planeH.addFreePoint2D(new Vector3(10, 20, 1), world);
      
      const realization = new Point2DRealization2D(new Vector3(10, 20, 1), true);
      planeH.setPointRealization2D(point.id, realization);
      
      planeH.removePoint(point.id);
      expect(planeH.getPointRealization2D(point.id)).toBeUndefined();
    });
  });

  describe('Line Storage', () => {
    it('should add and retrieve a line', () => {
      const p1 = planeH.addFreePoint2D(new Vector3(0, 0, 1), world);
      const p2 = planeH.addFreePoint2D(new Vector3(10, 10, 1), world);
      const line = planeH.addLine2DBetweenTwoPoints(p1.id, p2.id, world);
      
      const retrieved = planeH.getLine(line.id);
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(line.id);
      expect(retrieved?.planeId).toBe(planeH.id);
    });

    it('should retrieve all lines', () => {
      const initialLineCount = planeH.getAllLines().length;
      const p1 = planeH.addFreePoint2D(new Vector3(0, 0, 1), world);
      const p2 = planeH.addFreePoint2D(new Vector3(10, 10, 1), world);
      const p3 = planeH.addFreePoint2D(new Vector3(20, 0, 1), world);
      const p4 = planeH.addFreePoint2D(new Vector3(30, 10, 1), world);
      
      const l1 = planeH.addLine2DBetweenTwoPoints(p1.id, p2.id, world);
      const l2 = planeH.addLine2DBetweenTwoPoints(p3.id, p4.id, world);
      
      const allLines = planeH.getAllLines();
      expect(allLines).toHaveLength(initialLineCount + 2);
      expect(allLines.map(l => l.id)).toContain(l1.id);
      expect(allLines.map(l => l.id)).toContain(l2.id);
    });

    it('should remove a line', () => {
      const p1 = planeH.addFreePoint2D(new Vector3(0, 0, 1), world);
      const p2 = planeH.addFreePoint2D(new Vector3(10, 10, 1), world);
      const line = planeH.addLine2DBetweenTwoPoints(p1.id, p2.id, world);
      
      expect(planeH.getLine(line.id)).toBeDefined();
      
      const removed = planeH.removeLine(line.id);
      expect(removed).toBe(true);
      expect(planeH.getLine(line.id)).toBeUndefined();
    });

    it('should cache and retrieve line realizations', () => {
      const p1 = planeH.addFreePoint2D(new Vector3(0, 0, 1), world);
      const p2 = planeH.addFreePoint2D(new Vector3(10, 10, 1), world);
      const line = planeH.addLine2DBetweenTwoPoints(p1.id, p2.id, world);
      
      const realization = new Line2DRealization2D(
        new Vector3(0, 0, 1), 
        new Vector3(1, 0, 0),
        true
      );
      planeH.setLineRealization2D(line.id, realization);
      
      const retrieved = planeH.getLineRealization2D(line.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.point1.x).toBe(0);
      expect(retrieved?.point2.x).toBe(1);
    });
  });

  describe('Circle Storage', () => {
    it('should add and retrieve a circle', () => {
      const center = planeH.addFreePoint2D(new Vector3(100, 100, 1), world);
      const edge = planeH.addFreePoint2D(new Vector3(150, 100, 1), world);
      const circle = planeH.addCircle2DByCenterAndPoint(center.id, edge.id, world);
      
      const retrieved = planeH.getCircle(circle.id);
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(circle.id);
      expect(retrieved?.planeId).toBe(planeH.id);
    });

    it('should retrieve all circles', () => {
      const c1Center = planeH.addFreePoint2D(new Vector3(100, 100, 1), world);
      const c1Edge = planeH.addFreePoint2D(new Vector3(150, 100, 1), world);
      const c2Center = planeH.addFreePoint2D(new Vector3(200, 200, 1), world);
      const c2Edge = planeH.addFreePoint2D(new Vector3(250, 200, 1), world);
      
      const c1 = planeH.addCircle2DByCenterAndPoint(c1Center.id, c1Edge.id, world);
      const c2 = planeH.addCircle2DByCenterAndPoint(c2Center.id, c2Edge.id, world);
      
      const allCircles = planeH.getAllCircles();
      expect(allCircles).toHaveLength(2);
      expect(allCircles.map(c => c.id)).toContain(c1.id);
      expect(allCircles.map(c => c.id)).toContain(c2.id);
    });

    it('should remove a circle', () => {
      const center = planeH.addFreePoint2D(new Vector3(100, 100, 1), world);
      const edge = planeH.addFreePoint2D(new Vector3(150, 100, 1), world);
      const circle = planeH.addCircle2DByCenterAndPoint(center.id, edge.id, world);
      
      expect(planeH.getCircle(circle.id)).toBeDefined();
      
      const removed = planeH.removeCircle(circle.id);
      expect(removed).toBe(true);
      expect(planeH.getCircle(circle.id)).toBeUndefined();
    });

    it('should cache and retrieve circle realizations', () => {
      const center = planeH.addFreePoint2D(new Vector3(100, 100, 1), world);
      const edge = planeH.addFreePoint2D(new Vector3(150, 100, 1), world);
      const circle = planeH.addCircle2DByCenterAndPoint(center.id, edge.id, world);
      
      const realization = new Circle2DRealization2D(
        new Vector3(100, 100, 1),
        new Vector3(50, 0, 0),  // Radius vector pointing right
        true
      );
      planeH.setCircleRealization2D(circle.id, realization);
      
      const retrieved = planeH.getCircleRealization2D(circle.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.center.x).toBe(100);
      expect(retrieved?.getRadius()).toBe(50);  // Use getRadius() method
      expect(retrieved?.radiusVector.x).toBe(50);  // Check radiusVector components
      expect(retrieved?.radiusVector.y).toBe(0);
    });
  });

  describe('Multi-Plane Isolation', () => {
    it('should keep elements isolated between planes', () => {
      const initialHCount = planeH.getAllPoints().length;
      const initialVCount = planeV.getAllPoints().length;
      
      const pointH = planeH.addFreePoint2D(new Vector3(10, 20, 1), world);
      const pointV = planeV.addFreePoint2D(new Vector3(30, 40, 1), world);
      
      // P_H should have initialHCount + pointH
      expect(planeH.getAllPoints()).toHaveLength(initialHCount + 1);
      expect(planeH.getPoint(pointH.id)).toBeDefined();
      expect(planeH.getPoint(pointV.id)).toBeUndefined();
      
      // P_V should have initialVCount + pointV
      expect(planeV.getAllPoints()).toHaveLength(initialVCount + 1);
      expect(planeV.getPoint(pointV.id)).toBeDefined();
      expect(planeV.getPoint(pointH.id)).toBeUndefined();
    });

    it('should keep line realizations isolated between planes', () => {
      const p1H = planeH.addFreePoint2D(new Vector3(0, 0, 1), world);
      const p2H = planeH.addFreePoint2D(new Vector3(10, 0, 1), world);
      const p1V = planeV.addFreePoint2D(new Vector3(0, 0, 1), world);
      const p2V = planeV.addFreePoint2D(new Vector3(10, 0, 1), world);
      
      const lineH = planeH.addLine2DBetweenTwoPoints(p1H.id, p2H.id, world);
      const lineV = planeV.addLine2DBetweenTwoPoints(p1V.id, p2V.id, world);
      
      const realH = new Line2DRealization2D(new Vector3(0, 0, 1), new Vector3(1, 0, 0), true);
      const realV = new Line2DRealization2D(new Vector3(0, 0, 1), new Vector3(0, 1, 0), true);
      
      planeH.setLineRealization2D(lineH.id, realH);
      planeV.setLineRealization2D(lineV.id, realV);
      
      expect(planeH.getLineRealization2D(lineH.id)).toBeDefined();
      expect(planeH.getLineRealization2D(lineV.id)).toBeUndefined();
      expect(planeV.getLineRealization2D(lineV.id)).toBeDefined();
      expect(planeV.getLineRealization2D(lineH.id)).toBeUndefined();
    });
  });

  describe('Element Type Mixing', () => {
    it('should handle points, lines, and circles in same plane', () => {
      const initialPointCount = planeH.getAllPoints().length;  // Hinge points may exist
      const initialLineCount = planeH.getAllLines().length;  // Hinge lines may exist
      
      const p1 = planeH.addFreePoint2D(new Vector3(10, 20, 1), world);
      const p2 = planeH.addFreePoint2D(new Vector3(20, 30, 1), world);
      const pEdge = planeH.addFreePoint2D(new Vector3(60, 20, 1), world);
      
      const line = planeH.addLine2DBetweenTwoPoints(p1.id, p2.id, world);
      const circle = planeH.addCircle2DByCenterAndPoint(p1.id, pEdge.id, world);
      
      expect(planeH.getAllPoints()).toHaveLength(initialPointCount + 3);
      expect(planeH.getAllLines()).toHaveLength(initialLineCount + 1);
      expect(planeH.getAllCircles()).toHaveLength(1);
      
      expect(planeH.getPoint(p1.id)).toBeDefined();
      expect(planeH.getLine(line.id)).toBeDefined();
      expect(planeH.getCircle(circle.id)).toBeDefined();
    });
  });
});

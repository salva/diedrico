/**
 * Tests for ProjectionPlane transformations and element storage
 * Verifies that forward and inverse transforms work correctly
 * Tests element storage functionality added in Phase 22.5.1
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Vector3 } from 'three';
import { BaseProjectionPlane } from '@/domain/world/ProjectionPlane';
import { FreePoint2D, Point2DRealization2D } from '@/domain/world/Point';
import { Line2DByTwoPoints, Line2DRealization2D } from '@/domain/world/Line';
import { Circle2DByCenterAndPoint, Circle2DRealization2D } from '@/domain/world/Circle';

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

describe('ProjectionPlane Element Storage (Phase 22.5.1)', () => {
  let planeH: BaseProjectionPlane;
  let planeV: BaseProjectionPlane;

  beforeEach(() => {
    planeH = BaseProjectionPlane.createPH();
    planeH.id = 'proj_plane_H';
    
    planeV = BaseProjectionPlane.createPV();
    planeV.id = 'proj_plane_V';
  });

  describe('Point Storage', () => {
    it('should add and retrieve a point', () => {
      const point = new FreePoint2D('p1', new Vector3(10, 20, 1), 'proj_plane_H');
      
      planeH.addPoint(point);
      const retrieved = planeH.getPoint('p1');
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('p1');
      expect(retrieved?.planeId).toBe('proj_plane_H');
    });

    it('should retrieve all points', () => {
      const p1 = new FreePoint2D('p1', new Vector3(10, 20, 1), 'proj_plane_H');
      const p2 = new FreePoint2D('p2', new Vector3(30, 40, 1), 'proj_plane_H');
      
      planeH.addPoint(p1);
      planeH.addPoint(p2);
      
      const allPoints = planeH.getAllPoints();
      expect(allPoints).toHaveLength(2);
      expect(allPoints.map(p => p.id)).toContain('p1');
      expect(allPoints.map(p => p.id)).toContain('p2');
    });

    it('should remove a point', () => {
      const point = new FreePoint2D('p1', new Vector3(10, 20, 1), 'proj_plane_H');
      
      planeH.addPoint(point);
      expect(planeH.getPoint('p1')).toBeDefined();
      
      const removed = planeH.removePoint('p1');
      expect(removed).toBe(true);
      expect(planeH.getPoint('p1')).toBeUndefined();
    });

    it('should throw error when adding point without ID', () => {
      const point = new FreePoint2D('', new Vector3(10, 20, 1), 'proj_plane_H');
      
      expect(() => planeH.addPoint(point)).toThrow('Cannot add point without ID');
    });

    it('should cache and retrieve point realizations', () => {
      const point = new FreePoint2D('p1', new Vector3(10, 20, 1), 'proj_plane_H');
      planeH.addPoint(point);
      
      const realization = new Point2DRealization2D(new Vector3(10, 20, 1), true);
      planeH.setPointRealization2D('p1', realization);
      
      const retrieved = planeH.getPointRealization2D('p1');
      expect(retrieved).toBeDefined();
      expect(retrieved?.position.x).toBe(10);
      expect(retrieved?.position.y).toBe(20);
    });

    it('should clear point realization', () => {
      const point = new FreePoint2D('p1', new Vector3(10, 20, 1), 'proj_plane_H');
      planeH.addPoint(point);
      
      const realization = new Point2DRealization2D(new Vector3(10, 20, 1), true);
      planeH.setPointRealization2D('p1', realization);
      expect(planeH.getPointRealization2D('p1')).toBeDefined();
      
      planeH.clearPointRealization2D('p1');
      expect(planeH.getPointRealization2D('p1')).toBeUndefined();
    });

    it('should auto-clear realization when removing point', () => {
      const point = new FreePoint2D('p1', new Vector3(10, 20, 1), 'proj_plane_H');
      planeH.addPoint(point);
      
      const realization = new Point2DRealization2D(new Vector3(10, 20, 1), true);
      planeH.setPointRealization2D('p1', realization);
      
      planeH.removePoint('p1');
      expect(planeH.getPointRealization2D('p1')).toBeUndefined();
    });
  });

  describe('Line Storage', () => {
    it('should add and retrieve a line', () => {
      const line = new Line2DByTwoPoints('l1', 'p1', 'p2', 'proj_plane_H');
      
      planeH.addLine(line);
      const retrieved = planeH.getLine('l1');
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('l1');
      expect(retrieved?.planeId).toBe('proj_plane_H');
    });

    it('should retrieve all lines', () => {
      const l1 = new Line2DByTwoPoints('l1', 'p1', 'p2', 'proj_plane_H');
      const l2 = new Line2DByTwoPoints('l2', 'p3', 'p4', 'proj_plane_H');
      
      planeH.addLine(l1);
      planeH.addLine(l2);
      
      const allLines = planeH.getAllLines();
      expect(allLines).toHaveLength(2);
      expect(allLines.map(l => l.id)).toContain('l1');
      expect(allLines.map(l => l.id)).toContain('l2');
    });

    it('should remove a line', () => {
      const line = new Line2DByTwoPoints('l1', 'p1', 'p2', 'proj_plane_H');
      
      planeH.addLine(line);
      expect(planeH.getLine('l1')).toBeDefined();
      
      const removed = planeH.removeLine('l1');
      expect(removed).toBe(true);
      expect(planeH.getLine('l1')).toBeUndefined();
    });

    it('should throw error when adding line without ID', () => {
      const line = new Line2DByTwoPoints('', 'p1', 'p2', 'proj_plane_H');
      
      expect(() => planeH.addLine(line)).toThrow('Cannot add line without ID');
    });

    it('should cache and retrieve line realizations', () => {
      const line = new Line2DByTwoPoints('l1', 'p1', 'p2', 'proj_plane_H');
      planeH.addLine(line);
      
      const realization = new Line2DRealization2D(
        new Vector3(0, 0, 1), 
        new Vector3(1, 0, 0),
        true
      );
      planeH.setLineRealization2D('l1', realization);
      
      const retrieved = planeH.getLineRealization2D('l1');
      expect(retrieved).toBeDefined();
      expect(retrieved?.point.x).toBe(0);
      expect(retrieved?.direction.x).toBeCloseTo(1);
    });
  });

  describe('Circle Storage', () => {
    it('should add and retrieve a circle', () => {
      const circle = new Circle2DByCenterAndPoint('c1', 'p1', 'p_edge', 'proj_plane_H');
      
      planeH.addCircle(circle);
      const retrieved = planeH.getCircle('c1');
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('c1');
      expect(retrieved?.planeId).toBe('proj_plane_H');
    });

    it('should retrieve all circles', () => {
      const c1 = new Circle2DByCenterAndPoint('c1', 'p1', 'p_edge1', 'proj_plane_H');
      const c2 = new Circle2DByCenterAndPoint('c2', 'p2', 'p_edge2', 'proj_plane_H');
      
      planeH.addCircle(c1);
      planeH.addCircle(c2);
      
      const allCircles = planeH.getAllCircles();
      expect(allCircles).toHaveLength(2);
      expect(allCircles.map(c => c.id)).toContain('c1');
      expect(allCircles.map(c => c.id)).toContain('c2');
    });

    it('should remove a circle', () => {
      const circle = new Circle2DByCenterAndPoint('c1', 'p1', 'p_edge', 'proj_plane_H');
      
      planeH.addCircle(circle);
      expect(planeH.getCircle('c1')).toBeDefined();
      
      const removed = planeH.removeCircle('c1');
      expect(removed).toBe(true);
      expect(planeH.getCircle('c1')).toBeUndefined();
    });

    it('should throw error when adding circle without ID', () => {
      const circle = new Circle2DByCenterAndPoint('', 'p1', 'p_edge', 'proj_plane_H');
      
      expect(() => planeH.addCircle(circle)).toThrow('Cannot add circle without ID');
    });

    it('should cache and retrieve circle realizations', () => {
      const circle = new Circle2DByCenterAndPoint('c1', 'p1', 'p_edge', 'proj_plane_H');
      planeH.addCircle(circle);
      
      const realization = new Circle2DRealization2D(
        new Vector3(100, 100, 1),
        new Vector3(50, 0, 0),  // Radius vector pointing right
        true
      );
      planeH.setCircleRealization2D('c1', realization);
      
      const retrieved = planeH.getCircleRealization2D('c1');
      expect(retrieved).toBeDefined();
      expect(retrieved?.center.x).toBe(100);
      expect(retrieved?.radius).toBe(50);
    });
  });

  describe('Multi-Plane Isolation', () => {
    it('should keep elements isolated between planes', () => {
      const pointH = new FreePoint2D('p1', new Vector3(10, 20, 1), 'proj_plane_H');
      const pointV = new FreePoint2D('p2', new Vector3(30, 40, 1), 'proj_plane_V');
      
      planeH.addPoint(pointH);
      planeV.addPoint(pointV);
      
      // P_H should only have p1
      expect(planeH.getAllPoints()).toHaveLength(1);
      expect(planeH.getPoint('p1')).toBeDefined();
      expect(planeH.getPoint('p2')).toBeUndefined();
      
      // P_V should only have p2
      expect(planeV.getAllPoints()).toHaveLength(1);
      expect(planeV.getPoint('p2')).toBeDefined();
      expect(planeV.getPoint('p1')).toBeUndefined();
    });

    it('should keep line realizations isolated between planes', () => {
      const lineH = new Line2DByTwoPoints('l1', 'p1', 'p2', 'proj_plane_H');
      const lineV = new Line2DByTwoPoints('l2', 'p3', 'p4', 'proj_plane_V');
      
      planeH.addLine(lineH);
      planeV.addLine(lineV);
      
      const realH = new Line2DRealization2D(new Vector3(0, 0, 1), new Vector3(1, 0, 0), true);
      const realV = new Line2DRealization2D(new Vector3(0, 0, 1), new Vector3(0, 1, 0), true);
      
      planeH.setLineRealization2D('l1', realH);
      planeV.setLineRealization2D('l2', realV);
      
      expect(planeH.getLineRealization2D('l1')).toBeDefined();
      expect(planeH.getLineRealization2D('l2')).toBeUndefined();
      expect(planeV.getLineRealization2D('l2')).toBeDefined();
      expect(planeV.getLineRealization2D('l1')).toBeUndefined();
    });
  });

  describe('Element Type Mixing', () => {
    it('should handle points, lines, and circles in same plane', () => {
      const point = new FreePoint2D('p1', 'proj_plane_H', new Vector3(10, 20, 1));
      const line = new Line2DByTwoPoints('l1', 'p1', 'p2', 'proj_plane_H');
      const circle = new Circle2DByCenterAndPoint('c1', 'p1', 'p_edge', 'proj_plane_H');
      
      planeH.addPoint(point);
      planeH.addLine(line);
      planeH.addCircle(circle);
      
      expect(planeH.getAllPoints()).toHaveLength(1);
      expect(planeH.getAllLines()).toHaveLength(1);
      expect(planeH.getAllCircles()).toHaveLength(1);
      
      expect(planeH.getPoint('p1')).toBeDefined();
      expect(planeH.getLine('l1')).toBeDefined();
      expect(planeH.getCircle('c1')).toBeDefined();
    });
  });
});

/**
 * Unit tests for Circle domain entities
 * 
 * Tests the Circle2D geometry classes:
 * - Circle2DByCenterAndPoint: Defines circle by center and circumference point
 * - Circle2DByThreePoints: Defines circle through three points
 * - Circle2DRealization2D: Computed circle geometry with center and radius vector
 * 
 * Reference: specs/001-dihedral-learning-mvp/data-model.md#circle2d
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Vector3 } from 'three';
import {
  Circle2DByCenterAndPoint,
  Circle2DByThreePoints,
  Circle2DRealization2D
} from '@/domain/world/Circle';
import { FreePoint2D } from '@/domain/world/Point';
import { World } from '@/domain/world/World';

describe('Circle2D', () => {
  let world: World;
  let centerPointId: string;
  let point1Id: string;
  let point2Id: string;
  let point3Id: string;

  beforeEach(() => {
    world = new World();
    
    // Create test points
    const centerPoint = new FreePoint2D('center', new Vector3(0, 0, 1), 'proj_plane_H');
    const point1 = new FreePoint2D('p1', new Vector3(50, 0, 1), 'proj_plane_H');
    const point2 = new FreePoint2D('p2', new Vector3(0, 50, 1), 'proj_plane_H');
    const point3 = new FreePoint2D('p3', new Vector3(-50, 0, 1), 'proj_plane_H');
    
    world.addPoint2D(centerPoint);
    world.addPoint2D(point1);
    world.addPoint2D(point2);
    world.addPoint2D(point3);
    
    centerPointId = 'center';
    point1Id = 'p1';
    point2Id = 'p2';
    point3Id = 'p3';
  });

  describe('Circle2DByCenterAndPoint', () => {
    it('should create circle with center and circumference point', () => {
      const circle = new Circle2DByCenterAndPoint('c1', centerPointId, point1Id, 'proj_plane_H');
      
      expect(circle.id).toBe('c1');
      expect(circle.type).toBe('by-center-and-point');
      expect(circle.centerPointId).toBe(centerPointId);
      expect(circle.circumferencePointId).toBe(point1Id);
    });

    it('should realize circle with computed radius', () => {
      const circle = new Circle2DByCenterAndPoint('c1', centerPointId, point1Id, 'proj_plane_H');
      
      world.addCircle2D(circle);
      const realization = world.getCircle2DRealization('c1');
      
      expect(realization).toBeDefined();
      expect(realization!.center.x).toBe(0);
      expect(realization!.center.y).toBe(0);
      // Radius = distance from (0,0) to (50,0) = 50
      expect(realization!.getRadius()).toBe(50);
      // Radius vector should point from center to circumference point
      expect(realization!.radiusVector.x).toBe(50);
      expect(realization!.radiusVector.y).toBe(0);
      expect(realization!.radiusVector.z).toBe(0);  // Vectors have z=0
    });

    it('should return null when center point is missing', () => {
      const circle = new Circle2DByCenterAndPoint('c1', 'missing', point1Id, 'proj_plane_H');
      
      world.addCircle2D(circle);
      const realization = world.getCircle2DRealization('c1');
      
      expect(realization).toBeUndefined();
    });

    it('should return null when circumference point is missing', () => {
      const circle = new Circle2DByCenterAndPoint('c1', centerPointId, 'missing', 'proj_plane_H');
      
      world.addCircle2D(circle);
      const realization = world.getCircle2DRealization('c1');
      
      expect(realization).toBeUndefined();
    });

    it('should return null for degenerate circle (center = circumference point)', () => {
      // Create coincident point
      const coincident = new FreePoint2D('coincident', new Vector3(0, 0, 1), 'proj_plane_H');
      world.addPoint2D(coincident);
      
      const circle = new Circle2DByCenterAndPoint('c1', centerPointId, 'coincident', 'proj_plane_H');
      world.addCircle2D(circle);
      const realization = world.getCircle2DRealization('c1');
      
      // Should return infeasible realization for degenerate circle\n      expect(realization).toBeDefined();
      expect(realization!.feasible).toBe(false);
    });
  });

  describe('Circle2DByThreePoints', () => {
    it('should create circle through three points', () => {
      const circle = new Circle2DByThreePoints('c1', point1Id, point2Id, point3Id, 'proj_plane_H');
      
      expect(circle.id).toBe('c1');
      expect(circle.type).toBe('by-three-points');
      expect(circle.point1Id).toBe(point1Id);
      expect(circle.point2Id).toBe(point2Id);
      expect(circle.point3Id).toBe(point3Id);
    });

    it('should realize circle through three non-collinear points', () => {
      const circle = new Circle2DByThreePoints('c1', point1Id, point2Id, point3Id, 'proj_plane_H');
      
      world.addCircle2D(circle);
      const realization = world.getCircle2DRealization('c1');
      
      expect(realization).toBeDefined();
      // For points at (50,0), (0,50), (-50,0), the circumcircle has center near origin
      // and radius = distance from center to any of the three points
      expect(realization!.center.x).toBeCloseTo(0, 1);
      expect(realization!.center.y).toBeCloseTo(0, 1);
      expect(realization!.radius).toBeCloseTo(50, 1);
    });

    it('should return null when any point is missing', () => {
      const circle = new Circle2DByThreePoints('c1', 'missing', point2Id, point3Id, 'proj_plane_H');
      
      world.addCircle2D(circle);
      const realization = world.getCircle2DRealization('c1');
      
      expect(realization).toBeUndefined();
    });

    it('should return null for collinear points', () => {
      // Create three collinear points
      const collinear1 = new FreePoint2D('col1', new Vector3(0, 0, 1), 'proj_plane_H');
      const collinear2 = new FreePoint2D('col2', new Vector3(10, 0, 1), 'proj_plane_H');
      const collinear3 = new FreePoint2D('col3', new Vector3(20, 0, 1), 'proj_plane_H');
      world.addPoint2D(collinear1);
      world.addPoint2D(collinear2);
      world.addPoint2D(collinear3);
      
      const circle = new Circle2DByThreePoints('c1', 'col1', 'col2', 'col3', 'proj_plane_H');
      world.addCircle2D(circle);
      const realization = world.getCircle2DRealization('c1');
      
      // Should return infeasible realization for collinear points (no unique circle)
      expect(realization).toBeDefined();
      expect(realization!.feasible).toBe(false);
    });
  });

  describe('Circle2DRealization2D', () => {
    it('should compute circumference', () => {
      const realization = new Circle2DRealization2D(new Vector3(0, 0, 1), new Vector3(10, 0, 0));
      
      // Circumference = 2πr = 2π*10 ≈ 62.83
      expect(realization.getCircumference()).toBeCloseTo(2 * Math.PI * 10, 10);
    });

    it('should compute area', () => {
      const realization = new Circle2DRealization2D(new Vector3(0, 0, 1), new Vector3(10, 0, 0));
      
      // Area = πr² = π*100 ≈ 314.16
      expect(realization.getArea()).toBeCloseTo(Math.PI * 100, 10);
    });

    it('should store center correctly', () => {
      const center = new Vector3(25, 30, 1);
      const realization = new Circle2DRealization2D(center, 15);
      
      expect(realization.center.x).toBe(25);
      expect(realization.center.y).toBe(30);
      expect(realization.radius).toBe(15);
    });

    it('should return center via getCenter()', () => {
      const center = new Vector3(10, 20, 1);
      const realization = new Circle2DRealization2D(center, 5);
      
      const returnedCenter = realization.getCenter();
      expect(returnedCenter.x).toBe(10);
      expect(returnedCenter.y).toBe(20);
    });

    it('should return radius via getRadius()', () => {
      const realization = new Circle2DRealization2D(new Vector3(0, 0, 1), new Vector3(42, 0, 0));
      
      expect(realization.getRadius()).toBe(42);
    });
  });
});

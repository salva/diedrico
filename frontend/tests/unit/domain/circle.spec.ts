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
import type { World } from '@/domain/world/World';
import { createTestWorld, getHorizontalPlane, getHorizontalPlaneId } from '../../helpers/worldHelpers';

describe('Circle2D', () => {
  let world: World;
  let planeId: string;
  let centerPointId: string;
  let point1Id: string;
  let point2Id: string;
  let point3Id: string;

  beforeEach(() => {
    const { world: w } = createTestWorld();
    world = w;
    const plane = getHorizontalPlane(world);
    planeId = getHorizontalPlaneId(world);
    
    // Create test points with hierarchical IDs
    const centerPoint = new FreePoint2D(plane.generatePoint2DId(world), new Vector3(0, 0, 1), planeId);
    const point1 = new FreePoint2D(plane.generatePoint2DId(world), new Vector3(50, 0, 1), planeId);
    const point2 = new FreePoint2D(plane.generatePoint2DId(world), new Vector3(0, 50, 1), planeId);
    const point3 = new FreePoint2D(plane.generatePoint2DId(world), new Vector3(-50, 0, 1), planeId);
    
    plane.addPoint(centerPoint);
    plane.addPoint(point1);
    plane.addPoint(point2);
    plane.addPoint(point3);
    
    centerPointId = centerPoint.id;
    point1Id = point1.id;
    point2Id = point2.id;
    point3Id = point3.id;
  });

  describe('Circle2DByCenterAndPoint', () => {
    it('should create circle with center and circumference point', () => {
      const plane = getHorizontalPlane(world);
      const circle = new Circle2DByCenterAndPoint(plane.generateCircle2DId(world), centerPointId, point1Id, planeId);
      
      expect(circle.id).toBeDefined();
      expect(circle).toBeInstanceOf(Circle2DByCenterAndPoint);
      expect(circle.centerPointId).toBe(centerPointId);
      expect(circle.circumferencePointId).toBe(point1Id);
    });

    it('should realize circle with computed radius', () => {
      const plane = getHorizontalPlane(world);
      const circle = new Circle2DByCenterAndPoint(plane.generateCircle2DId(world), centerPointId, point1Id, planeId);
      
      plane.addCircle(circle);
      const realization = world.realizeCircle2D(world.getCircle2D(circle.id)!, world);
      
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

    it('should return null for degenerate circle (center = circumference point)', () => {
      const plane = getHorizontalPlane(world);
      // Create coincident point
      const coincident = new FreePoint2D(plane.generatePoint2DId(world), new Vector3(0, 0, 1), planeId);
      plane.addPoint(coincident);
      
      const circle = new Circle2DByCenterAndPoint(plane.generateCircle2DId(world), centerPointId, coincident.id, planeId);
      plane.addCircle(circle);
      const realization = world.realizeCircle2D(world.getCircle2D(circle.id)!, world);
      
      // Should return infeasible realization for degenerate circle
      expect(realization).toBeDefined();
      expect(realization!.feasible).toBe(false);
    });
  });

  describe('Circle2DByThreePoints', () => {
    it('should create circle through three points', () => {
      const plane = getHorizontalPlane(world);
      const circle = new Circle2DByThreePoints(plane.generateCircle2DId(world), point1Id, point2Id, point3Id, planeId);
      
      expect(circle.id).toBeDefined();
      expect(circle).toBeInstanceOf(Circle2DByThreePoints);
      expect(circle.point1Id).toBe(point1Id);
      expect(circle.point2Id).toBe(point2Id);
      expect(circle.point3Id).toBe(point3Id);
    });

    it('should realize circle through three non-collinear points', () => {
      const plane = getHorizontalPlane(world);
      const circle = new Circle2DByThreePoints(plane.generateCircle2DId(world), point1Id, point2Id, point3Id, planeId);
      
      plane.addCircle(circle);
      const realization = world.realizeCircle2D(world.getCircle2D(circle.id)!, world);
      
      expect(realization).toBeDefined();
      // For points at (50,0), (0,50), (-50,0), the circumcircle has center near origin
      // and radius = distance from center to any of the three points
      expect(realization!.center.x).toBeCloseTo(0, 1);
      expect(realization!.center.y).toBeCloseTo(0, 1);
      expect(realization!.getRadius()).toBeCloseTo(50, 1);
    });

    it('should return null for collinear points', () => {
      const plane = getHorizontalPlane(world);
      // Create three collinear points
      const collinear1 = new FreePoint2D(plane.generatePoint2DId(world), new Vector3(0, 0, 1), planeId);
      const collinear2 = new FreePoint2D(plane.generatePoint2DId(world), new Vector3(10, 0, 1), planeId);
      const collinear3 = new FreePoint2D(plane.generatePoint2DId(world), new Vector3(20, 0, 1), planeId);
      plane.addPoint(collinear1);
      plane.addPoint(collinear2);
      plane.addPoint(collinear3);
      
      const circle = new Circle2DByThreePoints(plane.generateCircle2DId(world), collinear1.id, collinear2.id, collinear3.id, planeId);
      plane.addCircle(circle);
      const realization = world.realizeCircle2D(world.getCircle2D(circle.id)!, world);
      
      // Should return infeasible realization for collinear points (no unique circle)
      expect(realization).toBeDefined();
      expect(realization!.feasible).toBe(false);
    });
  });

  describe('Circle2DRealization2D', () => {

    it('should store center correctly', () => {
      const center = new Vector3(25, 30, 1);
      const realization = new Circle2DRealization2D(center, new Vector3(15, 0, 0));
      
      expect(realization.center.x).toBe(25);
      expect(realization.center.y).toBe(30);
      expect(realization.getRadius()).toBe(15);
    });

    it('should return radius via getRadius()', () => {
      const realization = new Circle2DRealization2D(new Vector3(0, 0, 1), new Vector3(42, 0, 0));
      
      expect(realization.getRadius()).toBe(42);
    });
  });
});
